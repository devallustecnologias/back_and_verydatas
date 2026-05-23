import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Wallet } from 'src/ledger/walled.entity';

import { WalletService } from 'src/wallet/wallet.service';

import { Repository } from 'typeorm';

@Injectable()
export class CreditoService {
  constructor(
    private readonly walletService: WalletService,

    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async addCredits(
    userIdOrCompanyId: string,
    amount: number,
    description?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Valor inválido');
    }

    // tenta achar wallet de usuário
    let wallet = await this.walletRepo.findOneBy({
      userId: userIdOrCompanyId,
    });

    // se não achou, tenta empresa
    if (!wallet) {
      wallet = await this.walletRepo.findOneBy({
        companyId: Number(userIdOrCompanyId),
      });
    }

    // se não existir, cria
    if (!wallet) {
      const isCompany =
        !isNaN(Number(userIdOrCompanyId));

      wallet = this.walletRepo.create({
        type: isCompany ? 'COMPANY' : 'USER',

        companyId: isCompany
          ? Number(userIdOrCompanyId)
          : undefined,

        userId: !isCompany
          ? userIdOrCompanyId
          : undefined,
      });

      wallet = await this.walletRepo.save(wallet);
    }

    // adiciona crédito
    return this.walletService.addCredits(
      wallet.id,
      amount,
      description,
    );
  }
}