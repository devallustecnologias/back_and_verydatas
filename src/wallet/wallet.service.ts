import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Company } from 'src/company/company.entity';
import { User } from 'src/entities/user/user.entity';
import { Ledger, LedgerType, LedgerOrigin } from 'src/ledger/ledger.entity';
import { CreateWalletDto } from './dto/wallet.dto';
import { Wallet } from 'src/ledger/walled.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly dataSource: DataSource,
  ) {}

  async createWallet(dto: CreateWalletDto): Promise<Wallet> {
    let company: Company | null = null;
    let user: User | null = null;

    if (dto.companyId) {
      company = await this.companyRepo.findOneBy({ id: dto.companyId });

      if (!company) {
        throw new NotFoundException('Empresa não encontrada');
      }

      const exists = await this.walletRepo.findOneBy({
        companyId: dto.companyId,
      });

      if (exists) {
        throw new BadRequestException('Empresa já possui wallet');
      }
    }

    if (dto.userId) {
      user = await this.userRepo.findOneBy({ uid: dto.userId });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      const exists = await this.walletRepo.findOneBy({
        userId: dto.userId,
      });

      if (exists) {
        throw new BadRequestException('Usuário já possui wallet');
      }
    }

    if ((company && user) || (!company && !user)) {
      throw new BadRequestException(
        'Wallet deve ser de empresa OU usuário',
      );
    }

    const wallet = this.walletRepo.create({
      type: company ? 'COMPANY' : 'USER',
      companyId: company?.id,
      userId: user?.uid,
    });

    return this.walletRepo.save(wallet);
  }

  async getBalance(walletId: string): Promise<number> {
    const result = await this.walletRepo.manager
      .getRepository(Ledger)
      .createQueryBuilder('l')
      .select(`
        COALESCE(SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE 0 END), 0)
        -
        COALESCE(SUM(CASE WHEN l.type = 'DEBIT' THEN l.amount ELSE 0 END), 0)
      `, 'balance')
      .where('l.walletId = :walletId', { walletId })
      .getRawOne();

    return Number(result.balance || 0);
  }

  async getLedger(walletId: string) {
    return this.walletRepo.manager.getRepository(Ledger).find({
      where: { wallet: { id: walletId } },
      order: { createdAt: 'DESC' },
    });
  }

  //  TRANSFERÊNCIA (CORE DO SISTEMA)
  async transfer(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Valor inválido');
    }

    return this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const ledgerRepo = manager.getRepository(Ledger);

      const fromWallet = await walletRepo.findOneBy({
        id: fromWalletId,
      });

      const toWallet = await walletRepo.findOneBy({
        id: toWalletId,
      });

      if (!fromWallet || !toWallet) {
        throw new NotFoundException('Wallet não encontrada');
      }

      // saldo da origem
      const balanceResult = await ledgerRepo
        .createQueryBuilder('l')
        .select(`
          COALESCE(SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE 0 END), 0)
          -
          COALESCE(SUM(CASE WHEN l.type = 'DEBIT' THEN l.amount ELSE 0 END), 0)
        `, 'balance')
        .where('l.walletId = :id', { id: fromWalletId })
        .getRawOne();

      const balance = Number(balanceResult.balance || 0);

      if (balance < amount) {
        throw new BadRequestException('Saldo insuficiente');
      }

      // DEBIT origem
      await ledgerRepo.save({
        wallet: fromWallet,
        amount,
        type: LedgerType.DEBIT,
        origin: LedgerOrigin.TRANSFER,
        description: `Transferência enviada para ${toWalletId}`,
      });

      // CREDIT destino
      await ledgerRepo.save({
        wallet: toWallet,
        amount,
        type: LedgerType.CREDIT,
        origin: LedgerOrigin.TRANSFER,
        description: `Transferência recebida de ${fromWalletId}`,
      });

      return {
        success: true,
        from: fromWalletId,
        to: toWalletId,
        amount,
      };
    });
  }
}