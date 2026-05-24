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
    ) { }

    async addCredits(
        userIdOrCompanyId: string,
        amount: number,
        description?: string,
    ) {
        if (amount <= 0) {
            throw new BadRequestException('Valor inválido');
        }

        const isCompany = !isNaN(Number(userIdOrCompanyId));

        let wallet: Wallet | null = null;

        if (isCompany) {
            wallet = await this.walletRepo.findOneBy({
                companyId: Number(userIdOrCompanyId),
            });
        } else {
            wallet = await this.walletRepo.findOneBy({
                userId: userIdOrCompanyId,
            });
        }

        if (!wallet) {
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

        return this.walletService.addCredits(
            wallet.id,
            amount,
            description,
        );
    }
}