import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from './company.entity';
import { Repository } from 'typeorm';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Plan } from 'src/entities/plan/plan.entity';
import { Wallet } from 'src/ledger/walled.entity';
import { Ledger, LedgerType } from 'src/ledger/ledger.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(Ledger)
    private readonly ledgerRepo: Repository<Ledger>,
  ) { }

  async findCompaniesWithBalance() {
    const companies = await this.companyRepo.find();

    const result = await Promise.all(
      companies.map(async (company) => {
        const wallet = await this.walletRepo.findOne({
          where: {
            type: 'COMPANY',
            companyId: company.id,
          },
        });

        if (!wallet) {
          return {
            id: company.id,
            name: company.name,
            domain: company.domain,
            logoUrl: company.logoUrl,
            balance: 0,
          };
        }

        const credit = await this.ledgerRepo
          .createQueryBuilder('ledger')
          .select('COALESCE(SUM(ledger.amount), 0)', 'total')
          .where('ledger.walletId = :walletId', { walletId: wallet.id })
          .andWhere('ledger.type = :type', { type: LedgerType.CREDIT })
          .getRawOne();

        const debit = await this.ledgerRepo
          .createQueryBuilder('ledger')
          .select('COALESCE(SUM(ledger.amount), 0)', 'total')
          .where('ledger.walletId = :walletId', { walletId: wallet.id })
          .andWhere('ledger.type = :type', { type: LedgerType.DEBIT })
          .getRawOne();

        const balance = Number(credit.total) - Number(debit.total);

        return {
          id: company.id,
          name: company.name,
          domain: company.domain,
          logoUrl: company.logoUrl,
          balance,
        };
      }),
    );

    return result;
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepo.find({
      relations: ['users', 'plan'], // opcional
    });
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['users', 'plan'],
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async create(dto: CreateCompanyDto): Promise<Company> {
    const exists = await this.companyRepo.findOne({
      where: { domain: dto.domain },
    });

    if (exists) {
      throw new BadRequestException('Domínio já está em uso');
    }

    const plan = dto.planId
      ? await this.planRepo.findOne({ where: { id: dto.planId } })
      : null;

    const company = this.companyRepo.create({
      ...dto,
      plan,
    });

    return this.companyRepo.save(company);
  }

  async update(id: number, dto: UpdateCompanyDto): Promise<Company> {
    console.log(id, dto)
    const company = await this.findOne(id);

    const domainExists = await this.companyRepo.findOne({
      where: { domain: dto.domain },
    });

    const planExists = await this.planRepo.findOne({
      where: { id: dto.planId },
    });

      if (!planExists) {
      throw new BadRequestException('Plano não existe na base de dados');
    }

    if (domainExists && domainExists.id !== id) {
      throw new BadRequestException('Domínio já está em uso');
    }
    console.log(company?.plan)
    company.name = dto.name;
    company.domain = dto.domain;
    company.logoUrl = dto.logoUrl;
    company.plan = planExists

    return this.companyRepo.save(company);
  }

  async remove(id: number): Promise<void> {
    const company = await this.findOne(id);

    if (company.users?.length) {
      throw new BadRequestException(
        'Não é possível remover empresa com usuários vinculados',
      );
    }

    await this.companyRepo.remove(company);
  }
  async getPermissions(companyId: number) {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: {
        plan: {
          permissions: true,
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company.plan?.permissions ?? [];
  }
}