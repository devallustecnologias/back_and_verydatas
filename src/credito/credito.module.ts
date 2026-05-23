import { WalletModule } from 'src/wallet/wallet.module';
import { CreditoController } from './credito.controller';
import { CreditoService } from './credito.service';
import { Module } from '@nestjs/common';
import { Wallet } from 'src/ledger/walled.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({

    imports: [WalletModule, TypeOrmModule.forFeature([Wallet])],
    controllers: [
        CreditoController,],
    providers: [
        CreditoService,],
})
export class CreditoModule { }
