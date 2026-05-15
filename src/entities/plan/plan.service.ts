import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Plan } from './plan.entity';
import { ILike, In, Repository } from 'typeorm';
import { Permission } from '../permission/permission.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { User } from '../user/user.entity';

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
    const [data, total] =
      await this.planRepo.findAndCount({
        where: search
          ? {
            name: ILike(`%${search}%`),
          }
          : {},
        order: {
          id: 'DESC',
        },
        skip: (page - 1) * limit,
        take: limit,
        relations: ['permissions'],
      });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit,
      ),
    };
  }

  async findOne(id: number): Promise<Plan> {
    const plan = await this.planRepo.findOne({ where: { id } });

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
    });

    return this.planRepo.save(plan);
  }

  async update(id: number, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOne(id);

    if (plan.isSystem) {
      throw new BadRequestException('Plano do sistema não pode ser editado');
    }

    const permissions = await this.permissionRepo.find({
      where: dto.permissionIds.map((id) => ({ id })),
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('Permissões inválidas');
    }

    plan.name = dto.name;
    plan.permissions = permissions;

    return this.planRepo.save(plan);
  }

  async remove(id: number): Promise<void> {
    const plan = await this.findOne(id);

    // if (plan.isSystem) {
    //   throw new BadRequestException('Plano do sistema não pode ser removido');
    // }

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
