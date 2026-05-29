import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from './company.entity';
import { ILike, Repository } from 'typeorm';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Plan } from 'src/entities/plan/plan.entity';
import { Wallet } from 'src/ledger/walled.entity';
import { Ledger, LedgerType } from 'src/ledger/ledger.entity';
import { User } from 'src/entities/user/user.entity';
import { CompanyCnpjDataDto } from './dto/company-cnpj-data.dto';
import axios from 'axios';
import { toTitleCase } from 'src/lib/convert.to-title';

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false; // ex: 00000000000000

  const calc = (cnpj: string, len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(cnpj.charAt(len - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result === parseInt(cnpj.charAt(len));
  };

  return calc(cnpj, 12) && calc(cnpj, 13);
}


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
  ) { }

  async findCompaniesWithBalance(
    page = 1,
    limit = 10,
    search?: string,
    currentUser?: { sub: string; role: string },
  ) {
    let where: any = search
      ? {
        name: ILike(`%${search}%`),
      }
      : {};

    if (currentUser && currentUser.role !== 'master') {
      const loggedUser = await this.userRepo.findOne({
        where: { uid: currentUser.sub },
        relations: ['company'],
      });
      if (loggedUser?.company) {
        where = { ...where, id: loggedUser.company.id };
      } else {
        where = { ...where, id: -1 };
      }
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
    currentUser?: { sub: string; role: string },
  ) {
    const query = this.userRepo.createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company');

    if (currentUser && currentUser.role !== 'master') {
      const loggedUser = await this.userRepo.findOne({
        where: { uid: currentUser.sub },
        relations: ['company'],
      });
      if (loggedUser?.company) {
        query.andWhere('company.id = :companyId', { companyId: loggedUser.company.id });
      }
      query.andWhere('user.role != :masterRole', { masterRole: 'master' });
    }

    if (search) {
      query.andWhere('(LOWER(user.username) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await query.getManyAndCount();

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
    currentUser?: { sub: string; role: string },
  ) {
    if (currentUser && currentUser.role !== 'master') {
      const loggedUser = await this.userRepo.findOne({
        where: { uid: currentUser.sub },
        relations: ['company'],
      });
      if (!loggedUser?.company || loggedUser.company.id !== Number(companyId)) {
        throw new ForbiddenException('Você não tem permissão para acessar os créditos desta empresa');
      }
    }

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
    currentUser?: { sub: string; role: string },
  ) {
    if (currentUser && currentUser.role !== 'master') {
      const loggedUser = await this.userRepo.findOne({
        where: { uid: currentUser.sub },
        relations: ['company'],
      });

      if (currentUser.role === 'operador') {
        if (currentUser.sub !== userId) {
          throw new ForbiddenException('Operador só pode visualizar seus próprios créditos');
        }
      } else if (currentUser.role === 'empresa') {
        const targetUser = await this.userRepo.findOne({
          where: { uid: userId },
          relations: ['company'],
        });
        if (!targetUser || !loggedUser?.company || targetUser.company?.id !== loggedUser.company.id) {
          throw new ForbiddenException('Você só pode visualizar créditos de usuários da sua empresa');
        }
      }
    }

    const user = await this.userRepo.findOne({
      where: {
        uid: userId,
      },
      relations: ['company'],
    });

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

  async findAll(currentUser?: { sub: string; role: string }): Promise<Company[]> {
    if (currentUser && currentUser.role !== 'master') {
      const loggedUser = await this.userRepo.findOne({
        where: { uid: currentUser.sub },
        relations: ['company', 'company.users', 'company.plan'],
      });
      if (loggedUser?.company) {
        return [loggedUser.company];
      }
      return [];
    }
    return this.companyRepo.find({
      relations: ['users', 'plan'],
    });
  }

  async findOne(id: number, currentUser?: { sub: string; role: string }): Promise<Company> {
    if (currentUser && currentUser.role !== 'master') {
      const loggedUser = await this.userRepo.findOne({
        where: { uid: currentUser.sub },
        relations: ['company'],
      });
      if (!loggedUser?.company || loggedUser.company.id !== id) {
        throw new ForbiddenException('Você não tem permissão para acessar esta empresa');
      }
    }

    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['users', 'plan'],
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async findByDomain(domainOrHost: string): Promise<Company> {
    // Tenta encontrar pelo subdomínio ou pelo domínio completo
    const domainClean = domainOrHost.toLowerCase().trim();
    
    // Extrai o subdomínio se aplicável (ex: "empresa1.sistema.com" -> "empresa1")
    const parts = domainClean.split('.');
    const subdomain = parts[0];

    const company = await this.companyRepo.findOne({
      where: [
        { domain: domainClean },
        { domain: subdomain }
      ],
      relations: ['plan'],
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada para o domínio informado');
    }

    return company;
  }

async create(
  dto: CreateCompanyDto
): Promise<Company> {
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

    // campos numéricos/documentos
    if (
      key.includes('cpf') ||
      key.includes('cnpj') ||
      key.includes('phone') ||
      key.includes('whatsapp') ||
      key.includes('zipCode')
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

  return this.companyRepo.save(company);
}

async update(
  id: number,
  dto: UpdateCompanyDto,
  currentUser?: { sub: string; role: string },
): Promise<Company> {
  if (currentUser && currentUser.role !== 'master') {
    const loggedUser = await this.userRepo.findOne({
      where: { uid: currentUser.sub },
      relations: ['company'],
    });
    if (!loggedUser?.company || loggedUser.company.id !== id) {
      throw new ForbiddenException('Você não tem permissão para editar esta empresa');
    }
    if (dto.planId !== undefined || dto.domain !== undefined) {
      throw new BadRequestException('Apenas usuários MASTER podem alterar o plano ou domínio da empresa');
    }
  }

  const company = await this.findOne(id, currentUser);

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

  async remove(id: number, currentUser?: { sub: string; role: string }): Promise<void> {
    if (currentUser && currentUser.role !== 'master') {
      throw new ForbiddenException('Apenas usuários MASTER podem remover empresas do sistema');
    }

    const company = await this.findOne(id, currentUser);

    if (company.users?.length) {
      throw new BadRequestException(
        'Não é possível remover empresa com usuários vinculados',
      );
    }

    await this.companyRepo.remove(company);
  }

  async getPermissions(companyId: number, currentUser?: { sub: string; role: string }) {
    if (currentUser && currentUser.role !== 'master') {
      const loggedUser = await this.userRepo.findOne({
        where: { uid: currentUser.sub },
        relations: ['company'],
      });
      if (!loggedUser?.company || loggedUser.company.id !== companyId) {
        throw new ForbiddenException('Você não tem permissão para acessar os dados desta empresa');
      }
    }

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
    throw new BadRequestException('CNPJ inválido: deve conter 14 dígitos');
  }

  const isValid = isValidCnpj(cleanCnpj);
  if (!isValid) {
    throw new BadRequestException('CNPJ inválido');
  }

  try {
    const { data } = await axios.get(
      `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
    );

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
  } catch (err: any) {
    const status = err?.response?.status;

    if (status === 404) {
      throw new NotFoundException('CNPJ não encontrado na base de dados da Receita Federal');
    }

    if (status === 400) {
      throw new BadRequestException('CNPJ inválido');
    }

    throw new BadRequestException('Não foi possível consultar o CNPJ. Tente novamente em instantes.');
  }
}
}