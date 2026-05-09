import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/company/company.entity';
import { Permission } from 'src/entities/permission/permission.entity';
import { Plan } from 'src/entities/plan/plan.entity';
import { User } from 'src/entities/user/user.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Module } from '@nestjs/common';
import { Wallet } from 'src/ledger/walled.entity';

@Module({
     imports: [TypeOrmModule.forFeature([User, Plan, Permission, Company, Wallet]),],
    controllers: [
        WalletController,],
    providers: [
        WalletService,],
})
export class WalletModule { }
