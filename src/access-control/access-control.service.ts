import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CompanyAccessControl,
  IpMode,
} from 'src/entities/access-control/company-access-control.entity';
import { Company } from 'src/company/company.entity';
import { UserRole } from 'src/entities/user/user.entity';
import { UpsertAccessControlDto } from './dto/upsert-access-control.dto';

@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(CompanyAccessControl)
    private readonly acRepo: Repository<CompanyAccessControl>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  private async findCompanyOrFail(companyId: number): Promise<Company> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return company;
  }

  private guardTenantAccess(
    user: { role: string; companyId?: number },
    companyId: number,
  ): void {
    if (user.role !== UserRole.MASTER && user.companyId !== companyId) {
      throw new ForbiddenException('Acesso negado a esta empresa');
    }
  }

  /** Retorna config da empresa; cria default se não existir */
  async getOrCreate(
    companyId: number,
    user: { role: string; companyId?: number },
  ): Promise<CompanyAccessControl> {
    this.guardTenantAccess(user, companyId);

    const company = await this.findCompanyOrFail(companyId);

    let config = await this.acRepo.findOne({
      where: { company: { id: companyId } },
      relations: ['company'],
    });

    if (!config) {
      config = this.acRepo.create({
        company,
        scheduleEnabled: false,
        allowedDays: [],
        startTime: null,
        endTime: null,
        timezone: 'America/Sao_Paulo',
        ipMode: IpMode.ANY,
        allowedIps: [],
      });
      config = await this.acRepo.save(config);
    }

    return config;
  }

  /** Upsert: aplica campos recebidos sobre o registro existente (ou cria) */
  async upsert(
    companyId: number,
    dto: UpsertAccessControlDto,
    user: { role: string; companyId?: number },
  ): Promise<CompanyAccessControl> {
    this.guardTenantAccess(user, companyId);

    const company = await this.findCompanyOrFail(companyId);

    let config = await this.acRepo.findOne({
      where: { company: { id: companyId } },
      relations: ['company'],
    });

    if (!config) {
      config = this.acRepo.create({
        company,
        scheduleEnabled: false,
        allowedDays: [],
        startTime: null,
        endTime: null,
        timezone: 'America/Sao_Paulo',
        ipMode: IpMode.ANY,
        allowedIps: [],
      });
    }

    if (dto.scheduleEnabled !== undefined) config.scheduleEnabled = dto.scheduleEnabled;
    if (dto.allowedDays !== undefined) config.allowedDays = dto.allowedDays;
    if (dto.startTime !== undefined) config.startTime = dto.startTime;
    if (dto.endTime !== undefined) config.endTime = dto.endTime;
    if (dto.timezone !== undefined) config.timezone = dto.timezone;
    if (dto.ipMode !== undefined) config.ipMode = dto.ipMode;
    if (dto.allowedIps !== undefined) config.allowedIps = dto.allowedIps;

    return this.acRepo.save(config);
  }
}
