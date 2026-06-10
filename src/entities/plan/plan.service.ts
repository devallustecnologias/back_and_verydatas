import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Plan } from './plan.entity';
import { ILike, In, Repository } from 'typeorm';
import { Permission } from '../permission/permission.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { User } from '../user/user.entity';
import { Company } from 'src/company/company.entity';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,

    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) { }

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
  ) {
    const qb = this.planRepo
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.permissions', 'permissions')
      .leftJoinAndSelect('plan.menus', 'menus')
      .where("plan.name NOT LIKE 'custom-%'");

    if (search) {
      qb.andWhere('LOWER(plan.name) LIKE LOWER(:search)', { search: `%${search}%` });
    }

    qb.orderBy('plan.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Plan> {
    const plan = await this.planRepo.findOne({
      where: { id },
      relations: ['permissions', 'menus'],
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    return plan;
  }

  async create(dto: CreatePlanDto): Promise<Plan> {
    const permissions = await this.permissionRepo.find({
      where: {
        id: In(dto.permissionIds),
      },
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('Permissões inválidas');
    }

    const plan = this.planRepo.create({
      name: dto.name,
      isSystem: dto.isSystem ?? false,
      permissions,
      creditLimit: dto.creditLimit ?? 0,
      userLimit: dto.userLimit ?? 0,
    });

    return this.planRepo.save(plan);
  }

  async update(id: number, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOne(id);

    if (plan.isSystem) {
      throw new BadRequestException('Plano do sistema não pode ser editado');
    }

    if (dto.permissionIds !== undefined) {
      // In([]) compila para 0=1 (zero linhas); where: [] retornaria TODAS
      const permissions = dto.permissionIds.length
        ? await this.permissionRepo.find({
            where: { id: In(dto.permissionIds) },
          })
        : [];

      if (permissions.length !== dto.permissionIds.length) {
        throw new BadRequestException('Permissões inválidas');
      }

      plan.permissions = permissions;
    }

    if (dto.name !== undefined) {
      plan.name = dto.name;
    }

    if (dto.creditLimit !== undefined) {
      plan.creditLimit = dto.creditLimit;
    }

    if (dto.userLimit !== undefined) {
      plan.userLimit = dto.userLimit;
    }

    return this.planRepo.save(plan);
  }

  async remove(id: number): Promise<void> {
    const plan = await this.findOne(id);

    if (plan.isSystem) {
      throw new BadRequestException('Plano do sistema não pode ser removido');
    }

    const usersUsing = await this.userRepo.count({
      where: { plan: { id } },
    });
    if (usersUsing > 0) {
      throw new BadRequestException(
        'Plano em uso por usuários — desvincule antes de remover',
      );
    }

    const companiesUsing = await this.userRepo.manager.count(Company, {
      where: { plan: { id } },
    });
    if (companiesUsing > 0) {
      throw new BadRequestException(
        'Plano em uso por empresas — desvincule antes de remover',
      );
    }

    await this.planRepo.remove(plan);
  }

  async assignPlanToUser(userId: string, planId: number): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { uid: userId },
      relations: ['plan'],
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const plan = await this.planRepo.findOne({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    user.plan = plan;

    await this.userRepo.save(user);
  }
}
