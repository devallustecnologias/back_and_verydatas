import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from 'src/company/company.entity';
import { Department } from 'src/entities/department/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UserRole } from 'src/entities/user/user.entity';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  private async resolveCompanyId(
    user: { role: string; companyId?: number },
    bodyCompanyId?: number,
  ): Promise<number> {
    if (user.role !== UserRole.MASTER) {
      if (!user.companyId) {
        throw new BadRequestException('Empresa não encontrada no token');
      }
      return user.companyId;
    }
    // MASTER: companyId do body é obrigatório
    if (!bodyCompanyId) {
      throw new BadRequestException('companyId é obrigatório para MASTER');
    }
    return bodyCompanyId;
  }

  private async findCompanyOrFail(companyId: number): Promise<Company> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return company;
  }

  async create(
    dto: CreateDepartmentDto,
    user: { role: string; companyId?: number },
  ): Promise<Department> {
    const companyId = await this.resolveCompanyId(user, dto.companyId);
    const company = await this.findCompanyOrFail(companyId);

    const department = this.departmentRepo.create({
      name: dto.name,
      company,
    });

    return this.departmentRepo.save(department);
  }

  async findAll(
    user: { role: string; companyId?: number },
    filterCompanyId?: number,
  ): Promise<Department[]> {
    if (user.role !== UserRole.MASTER) {
      return this.departmentRepo.find({
        where: { company: { id: user.companyId } },
        relations: ['company'],
      });
    }
    // MASTER: filtro opcional por companyId
    if (filterCompanyId) {
      return this.departmentRepo.find({
        where: { company: { id: filterCompanyId } },
        relations: ['company'],
      });
    }
    return this.departmentRepo.find({ relations: ['company'] });
  }

  async findOne(
    id: number,
    user: { role: string; companyId?: number },
  ): Promise<Department> {
    const department = await this.departmentRepo.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!department) {
      throw new NotFoundException('Departamento não encontrado');
    }

    if (user.role !== UserRole.MASTER && department.company.id !== user.companyId) {
      throw new ForbiddenException('Acesso negado a este departamento');
    }

    return department;
  }

  async update(
    id: number,
    dto: UpdateDepartmentDto,
    user: { role: string; companyId?: number },
  ): Promise<Department> {
    const department = await this.findOne(id, user);

    if (dto.name) {
      department.name = dto.name;
    }

    return this.departmentRepo.save(department);
  }

  async remove(
    id: number,
    user: { role: string; companyId?: number },
  ): Promise<void> {
    const department = await this.findOne(id, user);
    await this.departmentRepo.softRemove(department);
  }
}
