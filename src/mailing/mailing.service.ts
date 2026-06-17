import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from 'src/ledger/walled.entity';
import { Ledger, LedgerType, LedgerOrigin } from 'src/ledger/ledger.entity';
import { ConsignadoRapidoService } from './consignado-rapido.service';
import { GerarMailingDto } from './dto/gerar-mailing.dto';

type CurrentUser = {
  userId?: string;
  username?: string;
  role?: string;
  companyId?: number;
};

@Injectable()
export class MailingService {
  constructor(
    private readonly cr: ConsignadoRapidoService,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly dataSource: DataSource,
  ) {}

  private creditCost(): number {
    const n = Number(process.env.MAILING_CREDIT_COST ?? 1);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }

  private async companyBalance(companyId: number): Promise<{ walletId: string; balance: number } | null> {
    const wallet = await this.walletRepo.findOne({
      where: { type: 'COMPANY', companyId },
    });
    if (!wallet) return null;

    const raw = await this.dataSource
      .getRepository(Ledger)
      .createQueryBuilder('l')
      .select(
        'COALESCE(SUM(CASE WHEN l.type = :c THEN l.amount WHEN l.type = :d THEN -l.amount ELSE 0 END), 0)',
        'bal',
      )
      .where('l.walletId = :wid', { wid: wallet.id })
      .setParameters({ c: LedgerType.CREDIT, d: LedgerType.DEBIT })
      .getRawOne<{ bal: string }>();

    return { walletId: wallet.id, balance: Number(raw?.bal ?? 0) };
  }

  async gerar(dto: GerarMailingDto, currentUser: CurrentUser) {
    const comContrato = !!dto.comContrato;
    const maxLimit = comContrato ? 25000 : 1000;

    let limit = Number(dto.limit) || 0;
    if (limit <= 0) {
      throw new BadRequestException('Quantidade de leads (limit) é obrigatória');
    }
    if (limit > maxLimit) limit = maxLimit;

    const filtros = Array.isArray(dto.filtros) ? dto.filtros : [];
    const cost = this.creditCost();

    // Consumo: 1 crédito por geração (configurável). Master não tem carteira → não debita.
    const cobravel = !!currentUser.companyId;
    if (cobravel) {
      const info = await this.companyBalance(currentUser.companyId!);
      if (!info) {
        throw new BadRequestException('Empresa sem carteira de créditos');
      }
      if (info.balance < cost) {
        throw new BadRequestException('Saldo de créditos insuficiente para gerar o mailing');
      }
    }

    // Chama o Consignado Rápido ANTES de debitar — se falhar (IP/auth/erro), não cobra.
    const leads = await this.cr.mailing(
      comContrato ? 'mailingContratos' : 'mailing',
      { limit, zip: false, filtros },
    );

    if (cobravel) {
      await this.commitDebit(currentUser, cost, dto.nome);
    }

    return {
      success: true,
      total: leads.length,
      comContrato,
      creditCost: cobravel ? cost : 0,
      leads,
    };
  }

  private async commitDebit(currentUser: CurrentUser, cost: number, nome?: string) {
    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const ledgerRepo = manager.getRepository(Ledger);

      const wallet = await walletRepo.findOne({
        where: { type: 'COMPANY', companyId: currentUser.companyId },
      });
      if (!wallet) {
        throw new BadRequestException('Empresa sem carteira de créditos');
      }

      const ledger = ledgerRepo.create({
        wallet,
        amount: cost,
        type: LedgerType.DEBIT,
        origin: LedgerOrigin.CONSUMO,
        description: `Geração de mailing${nome ? ': ' + nome : ''}`,
        performedById: currentUser.userId,
        performedByName: currentUser.username,
      });
      await ledgerRepo.save(ledger);
    });
  }
}
