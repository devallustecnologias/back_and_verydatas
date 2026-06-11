import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company, CompanyStatus } from './company.entity';
import { ILike, Repository } from 'typeorm';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Plan } from 'src/entities/plan/plan.entity';
import { Wallet } from 'src/ledger/walled.entity';
import { Ledger, LedgerType } from 'src/ledger/ledger.entity';
import { User } from 'src/entities/user/user.entity';
import { CompanyCnpjDataDto } from './dto/company-cnpj-data.dto';
import * as cnpjLib from '@cnpjs/cnpj';
import axios from 'axios';
import { toTitleCase } from 'src/lib/convert.to-title';
import { WalletService } from 'src/wallet/wallet.service';


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

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly walletService: WalletService,
  ) { }

  async findCompaniesWithBalance(
    page = 1,
    limit = 10,
    search?: string,
    currentUser?: { role?: string; companyId?: number },
  ) {
    const where: any = search
      ? {
        name: ILike(`%${search}%`),
      }
      : {};

    // TENANT SCOPING (fail-closed: non-master sem companyId não acessa nada)
    if (currentUser && currentUser.role !== 'master') {
      where.id = currentUser.companyId ?? -1;
    }

    const [companies, total] =
      await this.companyRepo.findAndCount({
        where,
        skip: (page - 1) * limit,
        take: limit,
        order: {
          id: 'DESC',
        },
      });

    const data = await Promise.all(
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
            totalCredit: 0,
            availableCredit: 0,
          };
        }

        const credit = await this.ledgerRepo
          .createQueryBuilder('ledger')
          .select('COALESCE(SUM(ledger.amount), 0)', 'total')
          .where('ledger.walletId = :walletId', {
            walletId: wallet.id,
          })
          .andWhere('ledger.type = :type', {
            type: LedgerType.CREDIT,
          })
          .getRawOne();

        const debit = await this.ledgerRepo
          .createQueryBuilder('ledger')
          .select('COALESCE(SUM(ledger.amount), 0)', 'total')
          .where('ledger.walletId = :walletId', {
            walletId: wallet.id,
          })
          .andWhere('ledger.type = :type', {
            type: LedgerType.DEBIT,
          })
          .getRawOne();

        const totalCredits = Number(credit.total);
        const totalDebits = Number(debit.total);

        return {
          id: company.id,
          name: company.name,
          domain: company.domain,
          totalCredit: totalCredits,
          availableCredit: totalCredits - totalDebits,
        };
      }),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findUsersWithBalance(
  page = 1,
  limit = 10,
  search?: string,
  currentUser?: { role?: string; companyId?: number },
) {
  let where: any = search
    ? [
        { username: ILike(`%${search}%`) },
        { email: ILike(`%${search}%`) },
      ]
    : {};

  // TENANT SCOPING (fail-closed: non-master sem companyId não acessa nada)
  if (currentUser && currentUser.role !== 'master') {
    const companyIdValue = currentUser.companyId ?? -1;
    if (Array.isArray(where)) {
      where = where.map((w) => ({ ...w, company: { id: companyIdValue } }));
    } else {
      where = { ...where, company: { id: companyIdValue } };
    }
  }

  const [users, total] =
    await this.userRepo.findAndCount({
      where,
      relations: {
        company: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

  const data = await Promise.all(
    users.map(async (user) => {
      const wallet = await this.walletRepo.findOne({
        where: {
          type: 'USER',
          userId: user.uid,
        },
      });

      if (!wallet) {
        return {
          uid: user.uid,
          username: user.username,
          email: user.email,
          role: user.role,
          company: user.company
            ? {
                id: user.company.id,
                name: user.company.name,
                domain: user.company.domain,
              }
            : null,
          totalCredit: 0,
          availableCredit: 0,
        };
      }

      const credit = await this.ledgerRepo
        .createQueryBuilder('ledger')
        .select('COALESCE(SUM(ledger.amount), 0)', 'total')
        .where('ledger.walletId = :walletId', {
          walletId: wallet.id,
        })
        .andWhere('ledger.type = :type', {
          type: LedgerType.CREDIT,
        })
        .getRawOne();

      const debit = await this.ledgerRepo
        .createQueryBuilder('ledger')
        .select('COALESCE(SUM(ledger.amount), 0)', 'total')
        .where('ledger.walletId = :walletId', {
          walletId: wallet.id,
        })
        .andWhere('ledger.type = :type', {
          type: LedgerType.DEBIT,
        })
        .getRawOne();

      const totalCredits = Number(credit.total);
      const totalDebits = Number(debit.total);

      return {
        uid: user.uid,
        username: user.username,
        email: user.email,
        role: user.role,
        company: user.company
          ? {
              id: user.company.id,
              name: user.company.name,
              domain: user.company.domain,
            }
          : null,
        totalCredit: totalCredits,
        availableCredit: totalCredits - totalDebits,
      };
    }),
  );

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async findCreditDetailsCompany(
  companyId: string,
  historyPage = 1,
  historyLimit = 10,
) {
  const company = await this.companyRepo.findOne({
    where: {
      id: Number(companyId),
    },
  });

  const wallet = await this.walletRepo.findOne({
    where: {
      type: 'COMPANY',
      companyId: Number(companyId),
    },
  });

  if (!wallet) {
    return {
      company,

      wallet: null,

      totalCredit: 0,
      totalDebit: 0,
      availableCredit: 0,

      history: {
        data: [],
        total: 0,
        page: historyPage,
        limit: historyLimit,
        totalPages: 0,
      },
    };
  }

  const credit = await this.ledgerRepo
    .createQueryBuilder('ledger')
    .select(
      'COALESCE(SUM(ledger.amount), 0)',
      'total',
    )
    .where('ledger.walletId = :walletId', {
      walletId: wallet.id,
    })
    .andWhere('ledger.type = :type', {
      type: LedgerType.CREDIT,
    })
    .getRawOne();

  const debit = await this.ledgerRepo
    .createQueryBuilder('ledger')
    .select(
      'COALESCE(SUM(ledger.amount), 0)',
      'total',
    )
    .where('ledger.walletId = :walletId', {
      walletId: wallet.id,
    })
    .andWhere('ledger.type = :type', {
      type: LedgerType.DEBIT,
    })
    .getRawOne();

  const [history, historyTotal] =
    await this.ledgerRepo.findAndCount({
      where: {
        wallet: {
          id: wallet.id,
        },
      },
      order: {
        createdAt: 'DESC',
      },
      skip: (historyPage - 1) * historyLimit,
      take: historyLimit,
    });

  const totalCredits = Number(credit.total);
  const totalDebits = Number(debit.total);

  return {
    company,

    wallet: {
      id: wallet.id,
      type: wallet.type,
      companyId: wallet.companyId,
      userId: wallet.userId,
    },

    totalCredit: totalCredits,
    totalDebit: totalDebits,
    availableCredit: totalCredits - totalDebits,

    history: {
      data: history,
      total: historyTotal,
      page: historyPage,
      limit: historyLimit,
      totalPages: Math.ceil(
        historyTotal / historyLimit,
      ),
    },
  };
}
async findUserCreditDetails(
  userId: string,
  historyPage = 1,
  historyLimit = 10,
  currentUser?: { role?: string; companyId?: number; userId?: string },
) {
  const user = await this.userRepo.findOne({
    where: {
      uid: userId,
    },
    relations: ['company'],
  });

  // §11 operador só pode ver o próprio histórico
  if (currentUser && currentUser.role === 'operador' && userId !== currentUser.userId) {
    throw new ForbiddenException('Acesso negado: operador só pode visualizar o próprio histórico');
  }

  // TENANT SCOPING: empresa só pode ver usuários da própria company
  if (currentUser && currentUser.role !== 'master' && currentUser.role !== 'operador' && currentUser.companyId) {
    if (!user || user.company?.id !== currentUser.companyId) {
      throw new ForbiddenException('Acesso negado a este usuário');
    }
  }

  const wallet = await this.walletRepo.findOne({
    where: {
      type: 'USER',
      userId,
    },
  });

  if (!wallet) {
    return {
      user,

      wallet: null,

      totalCredit: 0,
      totalDebit: 0,
      availableCredit: 0,

      history: {
        data: [],
        total: 0,
        page: historyPage,
        limit: historyLimit,
        totalPages: 0,
      },
    };
  }

  const credit = await this.ledgerRepo
    .createQueryBuilder('ledger')
    .select('COALESCE(SUM(ledger.amount), 0)', 'total')
    .where('ledger.walletId = :walletId', {
      walletId: wallet.id,
    })
    .andWhere('ledger.type = :type', {
      type: LedgerType.CREDIT,
    })
    .getRawOne();

  const debit = await this.ledgerRepo
    .createQueryBuilder('ledger')
    .select('COALESCE(SUM(ledger.amount), 0)', 'total')
    .where('ledger.walletId = :walletId', {
      walletId: wallet.id,
    })
    .andWhere('ledger.type = :type', {
      type: LedgerType.DEBIT,
    })
    .getRawOne();

  const [history, historyTotal] =
    await this.ledgerRepo.findAndCount({
      where: {
        wallet: {
          id: wallet.id,
        },
      },
      order: {
        createdAt: 'DESC',
      },
      skip: (historyPage - 1) * historyLimit,
      take: historyLimit,
    });

  const totalCredits = Number(credit.total);
  const totalDebits = Number(debit.total);

  return {
    user,

    wallet: {
      id: wallet.id,
      type: wallet.type,
      companyId: wallet.companyId,
      userId: wallet.userId,
    },

    totalCredit: totalCredits,
    totalDebit: totalDebits,
    availableCredit: totalCredits - totalDebits,

    history: {
      data: history,
      total: historyTotal,
      page: historyPage,
      limit: historyLimit,
      totalPages: Math.ceil(historyTotal / historyLimit),
    },
  };
}

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    currentUser?: { role?: string; companyId?: number },
  ) {
    const where: any = search ? { name: ILike(`%${search}%`) } : {};

    // TENANT SCOPING (fail-closed: non-master sem companyId não acessa nada)
    if (currentUser && currentUser.role !== 'master') {
      where.id = currentUser.companyId ?? -1;
    }

    const [data, total] = await this.companyRepo.findAndCount({
      where,
      relations: ['users', 'plan'],
      order: { id: 'DESC' },
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

async create(
  dto: CreateCompanyDto
): Promise<Company> {
  // §1 ANEPS obrigatório para novas contratações
  if (!dto.aneps || dto.aneps.trim() === '') {
    throw new BadRequestException(
      'ANEPS obrigatório para contratar',
    );
  }

  const exists =
    await this.companyRepo.findOne({
      where: {
        domain: dto.domain.toLowerCase(),
      },
    });

  if (exists) {
    throw new BadRequestException(
      'Domínio já está em uso'
    );
  }

  // percorre todos os campos
  Object.keys(dto).forEach((key) => {
    const value =
      dto[key as keyof CreateCompanyDto];

    if (typeof value !== 'string') {
      return;
    }

    // domínio e emails
    if (
      key === 'domain' ||
      key.toLowerCase().includes('email')
    ) {
      dto[key as keyof CreateCompanyDto] =
        value.toLowerCase() as never;

      return;
    }

    // UF
    if (key === 'state') {
      dto[key as keyof CreateCompanyDto] =
        value.toUpperCase() as never;

      return;
    }

    // URL
    if (key === 'logoUrl') {
      return;
    }

    // campos numéricos/documentos e ANEPS (não aplicar title case)
    if (
      key.includes('cpf') ||
      key.includes('cnpj') ||
      key.includes('phone') ||
      key.includes('whatsapp') ||
      key.includes('zipCode') ||
      key === 'aneps'
    ) {
      return;
    }

    // restante = Title Case
    dto[key as keyof CreateCompanyDto] =
      toTitleCase(value) as never;
  });

  const plan = dto.planId
    ? await this.planRepo.findOne({
        where: { id: dto.planId },
      })
    : null;

  const company =
    this.companyRepo.create({
      ...dto,
      plan,
    });

  const saved = await this.companyRepo.save(company);

  // §6 Provisionar créditos do plano na criação
  if (plan && plan.creditLimit > 0) {
    // Garantir que a wallet COMPANY exista
    let wallet = await this.walletRepo.findOne({
      where: { type: 'COMPANY', companyId: saved.id },
    });

    if (!wallet) {
      wallet = this.walletRepo.create({
        type: 'COMPANY',
        companyId: saved.id,
      });
      wallet = await this.walletRepo.save(wallet);
    }

    await this.walletService.addCredits(
      wallet.id,
      plan.creditLimit,
      `Créditos do plano ${plan.name}`,
    );
  }

  return saved;
}

async update(
  id: number,
  dto: UpdateCompanyDto,
): Promise<Company> {
  const company = await this.findOne(id);

  // percorre todos os campos antes
  Object.keys(dto).forEach((key) => {
    const value =
      dto[key as keyof UpdateCompanyDto];

    if (typeof value !== 'string') {
      return;
    }

    // domínio e emails
    if (
      key === 'domain' ||
      key.toLowerCase().includes('email')
    ) {
      dto[key as keyof UpdateCompanyDto] =
        value.toLowerCase() as never;

      return;
    }

    // UF
    if (key === 'state') {
      dto[key as keyof UpdateCompanyDto] =
        value.toUpperCase() as never;

      return;
    }

    // URL
    if (key === 'logoUrl') {
      return;
    }

    // campos numéricos/documentos
    if (
      key.toLowerCase().includes('cpf') ||
      key.toLowerCase().includes('cnpj') ||
      key.toLowerCase().includes('phone') ||
      key.toLowerCase().includes('whatsapp') ||
      key.toLowerCase().includes('zipcode')
    ) {
      return;
    }

    // restante = Title Case
    dto[key as keyof UpdateCompanyDto] =
      toTitleCase(value) as never;
  });

  if (dto.domain !== undefined) {
    const domainExists =
      await this.companyRepo.findOne({
        where: {
          domain: dto.domain,
        },
      });

    if (
      domainExists &&
      domainExists.id !== id
    ) {
      throw new BadRequestException(
        'Domínio já está em uso',
      );
    }
  }

  if (dto.planId !== undefined) {
    const planExists =
      await this.planRepo.findOne({
        where: { id: dto.planId },
      });

    if (!planExists) {
      throw new BadRequestException(
        'Plano não existe na base de dados',
      );
    }

    company.plan = planExists;
  }

  Object.assign(company, dto);

  return this.companyRepo.save(company);
}

  async remove(id: number): Promise<void> {
    const company = await this.findOne(id);

    if (company.users?.length) {
      throw new BadRequestException(
        'Não é possível remover empresa com usuários vinculados',
      );
    }

    await this.companyRepo.softRemove(company);
  }

  async updateStatus(id: number, status: CompanyStatus): Promise<Company> {
    const company = await this.findOne(id);
    company.status = status;
    return this.companyRepo.save(company);
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

async getDataByCnpj(cnpjNumber: string): Promise<CompanyCnpjDataDto> {
  const cleanCnpj = cnpjNumber.replace(/\D/g, '');

  if (cleanCnpj.length !== 14) {
    throw new BadRequestException('CNPJ inválido');
  }

  let data: any;
  try {
    const response = await axios.get(
      `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
      { timeout: 10000 },
    );
    data = response.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      throw new NotFoundException('CNPJ não encontrado na Receita Federal');
    }
    if (err?.response?.status === 400 || err?.response?.status === 422) {
      throw new BadRequestException('CNPJ inválido ou malformado');
    }
    throw new BadRequestException(
      `Erro ao consultar CNPJ: ${err?.message ?? 'serviço indisponível'}`,
    );
  }

  return {
    name: data.nome_fantasia || data.razao_social || '',
    cnpj: data.cnpj || '',
    corporateName: data.razao_social || '',
    tradeName: data.nome_fantasia || '',

    address: `${data.descricao_tipo_de_logradouro || ''} ${data.logradouro || ''}, ${data.numero || ''}`.trim(),
    city: data.municipio || '',
    state: data.uf || '',
    zipCode: data.cep || '',

    companyEmail: data.email || '',
    landlinePhone: data.ddd_telefone_1 || '',
    whatsapp: data.ddd_telefone_1 || '',

    representativeName: data.qsa?.[0]?.nome_socio || '',
    representativeCpf: data.qsa?.[0]?.cnpj_cpf_do_socio || '',

    contactName: data.qsa?.[0]?.nome_socio || '',
    contactCpf: data.qsa?.[0]?.cnpj_cpf_do_socio || '',
    contactEmail: data.email || '',
    contactWhatsapp: data.ddd_telefone_1 || '',
  };
}

  /** White-label: só campos de marca — rota pública, não vazar dados cadastrais */
  async getBranding(domain: string) {
    const company = await this.companyRepo.findOne({
      where: { domain: domain.toLowerCase().trim() },
    });
    if (!company) {
      throw new NotFoundException('Domínio não encontrado');
    }
    return {
      name: company.name,
      tradeName: company.tradeName ?? null,
      logoUrl: company.logoUrl ?? null,
    };
  }
}