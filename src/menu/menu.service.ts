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
}
