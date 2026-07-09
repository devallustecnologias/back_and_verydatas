import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { BrandingController } from './branding.controller';

import { Module } from '@nestjs/common';
import { Company } from './company.entity';
import { Plan } from 'src/entities/plan/plan.entity';
import { Ledger } from 'src/ledger/ledger.entity';
import { Wallet } from 'src/ledger/walled.entity';
import { User } from 'src/entities/user/user.entity';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
    imports: [TypeOrmModule.forFeature([Company, Plan, Ledger, Wallet, User]), WalletModule],
    controllers: [
        CompanyController,
        BrandingController,
    ],
    providers: [CompanyService],
    exports: [CompanyService],
})
export class CompanyModule { }
