import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ledger, LedgerOrigin, LedgerType } from 'src/ledger/ledger.entity';
import { Wallet } from 'src/ledger/walled.entity';
import { UserRole } from 'src/entities/user/user.entity';
import { CreditsQueryDto } from './dto/credits-query.dto';

interface CurrentUser {
  userId: string;
  role: string;
  companyId?: number;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Ledger)
    private readonly ledgerRepo: Repository<Ledger>,

    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async getCredits(dto: CreditsQueryDto, currentUser: CurrentUser) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    // ── Resolução de walletIds permitidos por role ──────────────────────────
    let allowedWalletIds: string[] | null = null; // null = sem restrição (MASTER)

    if (currentUser.role === UserRole.OPERADOR) {
      // OPERADOR: só a própria wallet de usuário
      const ownWallet = await this.walletRepo.findOne({
        where: { type: 'USER', userId: currentUser.userId },
      });
      allowedWalletIds = ownWallet ? [ownWallet.id] : [];
    } else if (currentUser.role === UserRole.EMPRESA) {
      // EMPRESA: wallet COMPANY da empresa + wallets USER dos funcionários
      const companyId = currentUser.companyId;
      if (!companyId) {
        allowedWalletIds = [];
      } else {
        const wallets = await this.walletRepo
          .createQueryBuilder('wallet')
          .where('wallet.companyId = :companyId', { companyId })
          .getMany();
        allowedWalletIds = wallets.map((w) => w.id);
      }
    }
    // MASTER: allowedWalletIds permanece null → sem filtro por walletId

    // ── QueryBuilder principal ───────────────────────────────────────────────
    const qb = this.ledgerRepo
      .createQueryBuilder('ledger')
      .innerJoinAndSelect('ledger.wallet', 'wallet')
      .orderBy('ledger.createdAt', 'DESC');

    // Filtros de tenant-scope (walletIds)
    if (allowedWalletIds !== null) {
      if (allowedWalletIds.length === 0) {
        // Sem wallets → retorno vazio sem scan
        return this.emptyResult(page, limit);
      }
      qb.andWhere('wallet.id IN (:...allowedWalletIds)', { allowedWalletIds });
    }

    // Filtro extra por companyId (MASTER pode passar; EMPRESA ignora — já forçado acima)
    if (currentUser.role === UserRole.MASTER && dto.companyId != null) {
      qb.andWhere('wallet.companyId = :filterCompanyId', {
        filterCompanyId: dto.companyId,
      });
    }

    // Filtro por userId (MASTER/EMPRESA podem filtrar; OPERADOR já está restrito à própria)
    if (dto.userId != null && currentUser.role !== UserRole.OPERADOR) {
      qb.andWhere('wallet.userId = :filterUserId', { filterUserId: dto.userId });
    }

    // Filtros opcionais de origem/tipo
    if (dto.origin != null) {
      qb.andWhere('ledger.origin = :origin', { origin: dto.origin });
    }
    if (dto.type != null) {
      qb.andWhere('ledger.type = :type', { type: dto.type });
    }

    // Filtros de data
    if (dto.from != null) {
      qb.andWhere('ledger.createdAt >= :from', { from: new Date(dto.from) });
    }
    if (dto.to != null) {
      // inclusivo: até o final do dia informado
      const toDate = new Date(dto.to);
      toDate.setHours(23, 59, 59, 999);
      qb.andWhere('ledger.createdAt <= :to', { to: toDate });
    }

    // Paginação
    qb.skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    // ── Summary (sem paginação) ──────────────────────────────────────────────
    const summaryQb = this.ledgerRepo
      .createQueryBuilder('ledger')
      .innerJoin('ledger.wallet', 'wallet');

    if (allowedWalletIds !== null && allowedWalletIds.length > 0) {
      summaryQb.andWhere('wallet.id IN (:...allowedWalletIds)', { allowedWalletIds });
    }
    if (currentUser.role === UserRole.MASTER && dto.companyId != null) {
      summaryQb.andWhere('wallet.companyId = :filterCompanyId', {
        filterCompanyId: dto.companyId,
      });
    }
    if (dto.userId != null && currentUser.role !== UserRole.OPERADOR) {
      summaryQb.andWhere('wallet.userId = :filterUserId', { filterUserId: dto.userId });
    }
    if (dto.from != null) {
      summaryQb.andWhere('ledger.createdAt >= :from', { from: new Date(dto.from) });
    }
    if (dto.to != null) {
      const toDate = new Date(dto.to);
      toDate.setHours(23, 59, 59, 999);
      summaryQb.andWhere('ledger.createdAt <= :to', { to: toDate });
    }

    const summaryRaw = await summaryQb
      .select('ledger.type', 'type')
      .addSelect('ledger.origin', 'origin')
      .addSelect('COALESCE(SUM(ledger.amount), 0)', 'soma')
      .addSelect('COUNT(ledger.id)', 'quantidade')
      .groupBy('ledger.type')
      .addGroupBy('ledger.origin')
      .getRawMany<{ type: string; origin: string | null; soma: string; quantidade: string }>();

    let totalCreditos = 0;
    let totalEstornos = 0;
    let totalConsumo = 0;
    let countTotal = 0;

    for (const row of summaryRaw) {
      const soma = Number(row.soma);
      const qtd = Number(row.quantidade);
      countTotal += qtd;

      if (row.type === LedgerType.CREDIT) {
        totalCreditos += soma;
      }
      if (row.origin === LedgerOrigin.ESTORNO) {
        totalEstornos += soma;
      }
      if (row.origin === LedgerOrigin.CONSUMO) {
        totalConsumo += soma;
      }
    }

    const items = rows.map((l) => ({
      id: l.id,
      data: l.createdAt,
      tipo: l.type,
      origem: l.origin ?? null,
      quantidade: l.amount,
      descricao: l.description,
      responsavel: l.performedByName ?? null,
      walletType: l.wallet.type,
      companyId: l.wallet.companyId ?? null,
      userId: l.wallet.userId ?? null,
    }));

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalCreditos,
        totalEstornos,
        totalConsumo,
        count: countTotal,
      },
    };
  }

  private emptyResult(page: number, limit: number) {
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      summary: {
        totalCreditos: 0,
        totalEstornos: 0,
        totalConsumo: 0,
        count: 0,
      },
    };
  }
}
