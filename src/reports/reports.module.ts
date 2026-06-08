import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ledger } from 'src/ledger/ledger.entity';
import { Wallet } from 'src/ledger/walled.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ledger, Wallet])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
