import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from 'src/company/company.entity';
import { Cargo } from 'src/entities/cargo/cargo.entity';
import { Department } from 'src/entities/department/department.entity';
import { UserRole } from 'src/entities/user/user.entity';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';

@Injectable()
export class CargoService {
  constructor(
    @InjectRepository(Cargo)
    private readonly cargoRepo: Repository<Cargo>,

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

  private async findDepartmentOrFail(
    departmentId: number,
    companyId: number,
  ): Promise<Department> {
    const department = await this.departmentRepo.findOne({
      where: { id: departmentId },
      relations: ['company'],
    });

    if (!department) {
      throw new NotFoundException('Departamento não encontrado');
    }

    if (department.company.id !== companyId) {
      throw new BadRequestException(
        'Departamento não pertence à empresa informada',
      );
    }

    return department;
  }

  async create(
    dto: CreateCargoDto,
    user: { role: string; companyId?: number },
  ): Promise<Cargo> {
    const companyId = await this.resolveCompanyId(user, dto.companyId);
    const company = await this.findCompanyOrFail(companyId);
    const department = await this.findDepartmentOrFail(dto.departmentId, companyId);

    const cargo = this.cargoRepo.create({
      name: dto.name,
      company,
      department,
    });

    return this.cargoRepo.save(cargo);
  }

  async findAll(
    user: { role: string; companyId?: number },
    filterCompanyId?: number,
  ): Promise<Cargo[]> {
    if (user.role !== UserRole.MASTER) {
      return this.cargoRepo.find({
        where: { company: { id: user.companyId } },
        relations: ['company', 'department'],
      });
    }
    if (filterCompanyId) {
      return this.cargoRepo.find({
        where: { company: { id: filterCompanyId } },
        relations: ['company', 'department'],
      });
    }
    return this.cargoRepo.find({ relations: ['company', 'department'] });
  }

  async findOne(
    id: number,
    user: { role: string; companyId?: number },
  ): Promise<Cargo> {
    const cargo = await this.cargoRepo.findOne({
      where: { id },
      relations: ['company', 'department'],
    });

    if (!cargo) {
      throw new NotFoundException('Cargo não encontrado');
    }

    if (user.role !== UserRole.MASTER && cargo.company.id !== user.companyId) {
      throw new ForbiddenException('Acesso negado a este cargo');
    }

    return cargo;
  }

  async update(
    id: number,
    dto: UpdateCargoDto,
    user: { role: string; companyId?: number },
  ): Promise<Cargo> {
    const cargo = await this.findOne(id, user);

    if (dto.name) {
      cargo.name = dto.name;
    }

    if (dto.departmentId) {
      cargo.department = await this.findDepartmentOrFail(
        dto.departmentId,
        cargo.company.id,
      );
    }

    return this.cargoRepo.save(cargo);
  }

  async remove(
    id: number,
    user: { role: string; companyId?: number },
  ): Promise<void> {
    const cargo = await this.findOne(id, user);
    await this.cargoRepo.softRemove(cargo);
  }
}
