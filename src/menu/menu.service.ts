import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Menu } from 'src/entities/menu/menu.entity';
import { Plan } from 'src/entities/plan/plan.entity';
import { Company } from 'src/company/company.entity';
import { CompanyAccessControl } from 'src/entities/access-control/company-access-control.entity';
import { User } from 'src/entities/user/user.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

// Menus definidos na Seção 5 do documento — seed idempotente por key
const SEED_PARENT = { name: 'Operações', key: 'operacoes', order: 0 };

const SEED_CHILDREN: Array<{ name: string; key: string; order: number }> = [
  { name: 'Consultas Corban',        key: 'consultas-corban',        order: 1 },
  { name: 'Extrato Bancário',        key: 'extrato-bancario',        order: 2 },
  { name: 'Ofertas de Crédito',      key: 'ofertas-de-credito',      order: 3 },
  { name: 'Mailing',                 key: 'mailing',                 order: 4 },
  { name: 'Digitação de Contratos',  key: 'digitacao-de-contratos',  order: 5 },
  { name: 'Telemarketing',           key: 'telemarketing',           order: 6 },
  { name: 'Agenda',                  key: 'agenda',                  order: 7 },
  { name: 'Nexabot',                 key: 'nexabot',                 order: 8 },
  { name: 'Hot Phone',               key: 'hot-phone',               order: 9 },
  { name: 'Análise de Crédito',      key: 'analise-de-credito',      order: 10 },
  { name: 'Integrações',             key: 'integracoes',             order: 11 },
  { name: 'Bots Diversos',           key: 'bots-diversos',           order: 12 },
];

@Injectable()
export class MenuService implements OnModuleInit {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepo: Repository<Menu>,

    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(CompanyAccessControl)
    private readonly accessControlRepo: Repository<CompanyAccessControl>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ----------------------------------------------------------------
  // Seed idempotente no boot
  // ----------------------------------------------------------------
  async onModuleInit(): Promise<void> {
    // Upsert pai
    let parent = await this.menuRepo.findOne({
      where: { key: SEED_PARENT.key },
      withDeleted: true,
    });

    if (!parent) {
      parent = this.menuRepo.create({
        name: SEED_PARENT.name,
        key: SEED_PARENT.key,
        order: SEED_PARENT.order,
      });
      parent = await this.menuRepo.save(parent);
    }

    // Upsert filhos
    for (const child of SEED_CHILDREN) {
      const existing = await this.menuRepo.findOne({
        where: { key: child.key },
        withDeleted: true,
      });

      if (!existing) {
        const menu = this.menuRepo.create({
          name: child.name,
          key: child.key,
          order: child.order,
          parent,
        });
        await this.menuRepo.save(menu);
      }
    }
  }

  // ----------------------------------------------------------------
  // GET /menus — árvore top-level com children
  // ----------------------------------------------------------------
  async findTree(): Promise<Menu[]> {
    const roots = await this.menuRepo.find({
      where: { parent: IsNull() },
      relations: ['children'],
      order: { order: 'ASC' },
    });

    // Ordena children por order
    for (const root of roots) {
      root.children.sort((a, b) => a.order - b.order);
    }

    return roots;
  }

  // ----------------------------------------------------------------
  // POST /menus
  // ----------------------------------------------------------------
  async create(dto: CreateMenuDto): Promise<Menu> {
    const existing = await this.menuRepo.findOne({ where: { key: dto.key } });
    if (existing) {
      throw new BadRequestException(`Menu com key '${dto.key}' já existe`);
    }

    let parent: Menu | null = null;
    if (dto.parentId) {
      parent = await this.menuRepo.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException(`Menu pai com id ${dto.parentId} não encontrado`);
      }
    }

    const menu = this.menuRepo.create({
      name: dto.name,
      key: dto.key,
      order: dto.order ?? 0,
      parent,
    });

    return this.menuRepo.save(menu);
  }

  // ----------------------------------------------------------------
  // PUT /menus/:id
  // ----------------------------------------------------------------
  async update(id: number, dto: UpdateMenuDto): Promise<Menu> {
    const menu = await this.menuRepo.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!menu) {
      throw new NotFoundException('Menu não encontrado');
    }

    if (dto.key && dto.key !== menu.key) {
      const conflict = await this.menuRepo.findOne({ where: { key: dto.key } });
      if (conflict) {
        throw new BadRequestException(`Menu com key '${dto.key}' já existe`);
      }
      menu.key = dto.key;
    }

    if (dto.name !== undefined) menu.name = dto.name;
    if (dto.order !== undefined) menu.order = dto.order;

    if (dto.parentId !== undefined) {
      if (dto.parentId === null || dto.parentId === 0) {
        menu.parent = null;
      } else {
        const parent = await this.menuRepo.findOne({ where: { id: dto.parentId } });
        if (!parent) {
          throw new NotFoundException(`Menu pai com id ${dto.parentId} não encontrado`);
        }
        if (parent.id === menu.id) {
          throw new BadRequestException('Um menu não pode ser pai de si mesmo');
        }
        menu.parent = parent;
      }
    }

    return this.menuRepo.save(menu);
  }

  // ----------------------------------------------------------------
  // DELETE /menus/:id (soft-delete)
  // ----------------------------------------------------------------
  async remove(id: number): Promise<void> {
    const menu = await this.menuRepo.findOne({ where: { id } });
    if (!menu) {
      throw new NotFoundException('Menu não encontrado');
    }
    await this.menuRepo.softRemove(menu);
  }

  // ----------------------------------------------------------------
  // PUT /plans/:planId/menus — set menus liberados do plano
  // ----------------------------------------------------------------
  async setPlanMenus(planId: number, menuIds: number[]): Promise<Plan> {
    const plan = await this.planRepo.findOne({
      where: { id: planId },
      relations: ['menus', 'permissions'],
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    const menus = menuIds.length
      ? await this.menuRepo.find({ where: { id: In(menuIds) } })
      : [];

    if (menus.length !== menuIds.length) {
      throw new BadRequestException('Um ou mais menuIds são inválidos');
    }

    plan.menus = menus;
    return this.planRepo.save(plan);
  }

  // ----------------------------------------------------------------
  // GET /menus/me — menus do usuário logado
  // ----------------------------------------------------------------
  async getMyMenus(currentUser: {
    role: string;
    companyId: number | null;
    userId?: string;
  }): Promise<{
    restricted: boolean;
    allowedKeys: string[];
    allKeys: string[];
  }> {
    // Passo 1: Sempre incluir allKeys (todos os menus não deletados)
    const allMenus = await this.menuRepo.find({ where: { deletedAt: IsNull() } });
    const allKeys = allMenus.map((m) => m.key);

    // Menus extras concedidos individualmente ao usuário (além do plano/empresa)
    let extraKeys: string[] = [];
    if (currentUser.userId) {
      const u = await this.userRepo.findOne({
        where: { uid: currentUser.userId },
        relations: ['extraMenus'],
      });
      extraKeys = u?.extraMenus?.map((m) => m.key) ?? [];
    }
    const withExtra = (keys: string[]) =>
      Array.from(new Set([...keys, ...extraKeys]));

    // Passo 2: Se master, sem restrição
    if (currentUser.role === 'master') {
      return {
        restricted: false,
        allowedKeys: [],
        allKeys,
      };
    }

    // Passo 3: Não-master sem companyId → fail-closed
    if (!currentUser.companyId) {
      return {
        restricted: true,
        allowedKeys: [],
        allKeys,
      };
    }

    // Passo 4: Buscar empresa com plano
    const company = await this.companyRepo.findOne({
      where: { id: currentUser.companyId },
      relations: ['plan', 'plan.menus'],
    });

    if (!company) {
      return {
        restricted: true,
        allowedKeys: [],
        allKeys,
      };
    }

    // Passo 5: Camada plano
    const planKeys = company.plan?.menus ? company.plan.menus.map((m) => m.key) : [];
    const planActive = planKeys.length > 0;

    // Passo 6: Camada árvore (access control)
    let treeKeys: string[] = [];
    let treeActive = false;

    const accessControl = await this.accessControlRepo.findOne({
      where: { company: { id: currentUser.companyId } },
    });

    const checkedNodeIds = accessControl?.menuPermissions?.checkedNodes ?? [];
    if (Array.isArray(checkedNodeIds) && checkedNodeIds.length > 0) {
      treeActive = true;
      const numericIds = checkedNodeIds
        .map((id) => {
          const num = Number(id);
          return isNaN(num) ? null : num;
        })
        .filter((id) => id !== null) as number[];

      if (numericIds.length > 0) {
        const treeMenus = await this.menuRepo.find({
          where: { id: In(numericIds) },
        });
        treeKeys = treeMenus.map((m) => m.key);
      }
    }

    // Passo 7: Combinação (regra de restrição)
    if (!planActive && !treeActive) {
      // Nenhuma camada ativa → sem restrição (backward compatible)
      return {
        restricted: false,
        allowedKeys: [],
        allKeys,
      };
    }

    if (planActive && !treeActive) {
      // Só plano ativo (+ menus extras do usuário)
      return {
        restricted: true,
        allowedKeys: withExtra(planKeys),
        allKeys,
      };
    }

    if (!planActive && treeActive) {
      // Só árvore ativa (+ menus extras do usuário)
      return {
        restricted: true,
        allowedKeys: withExtra(treeKeys),
        allKeys,
      };
    }

    // Ambas ativas → interseção (+ menus extras do usuário)
    const intersection = planKeys.filter((key) => treeKeys.includes(key));
    return {
      restricted: true,
      allowedKeys: withExtra(intersection),
      allKeys,
    };
  }
}
