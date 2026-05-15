import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from './permission.entity';
import { ILike, Repository } from 'typeorm';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionService {
    constructor(
        @InjectRepository(Permission)
        private readonly permissionRepo: Repository<Permission>,
    ) { }

    async findOne(id: number): Promise<Permission> {
        const permission = await this.permissionRepo.findOne({ where: { id } });

        if (!permission) {
            throw new NotFoundException('Permissão não encontrada');
        }

        return permission;
    }
    async create(dto: CreatePermissionDto): Promise<Permission> {
        const exists = await this.permissionRepo.findOne({
            where: { key: dto.key },
        });

        if (exists) {
            throw new BadRequestException('Permissão já existe');
        }

        const permission = this.permissionRepo.create(dto);
        return this.permissionRepo.save(permission);
    }

    async remove(id: number): Promise<void> {
        const permission = await this.findOne(id);
        await this.permissionRepo.remove(permission);
    }
      async findAll(
    page = 1,
    limit = 10,
    search?: string,
  ) {
    const [data, total] = await this.permissionRepo.findAndCount({
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
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(
  id: number,
  dto: UpdatePermissionDto,
): Promise<Permission> {
  const permission = await this.findOne(id);

  if (dto.key) {
    const exists =
      await this.permissionRepo.findOne({
        where: {
          key: dto.key,
        },
      });

    if (exists && exists.id !== id) {
      throw new BadRequestException(
        'Permissão já existe',
      );
    }
  }

  Object.assign(permission, dto);

  return this.permissionRepo.save(permission);
}

}
