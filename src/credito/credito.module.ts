import { WalletModule } from 'src/wallet/wallet.module';
import { CreditoController } from './credito.controller';
import { CreditoService } from './credito.service';
import { Module } from '@nestjs/common';
import { Wallet } from 'src/ledger/walled.entity';
import { User } from 'src/entities/user/user.entity';
import { Company } from 'src/company/company.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [WalletModule, TypeOrmModule.forFeature([Wallet, User, Company])],
    controllers: [CreditoController],
    providers: [CreditoService],
})
export class CreditoModule { }
