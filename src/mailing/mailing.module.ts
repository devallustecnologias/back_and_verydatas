import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from 'src/ledger/walled.entity';
import { Ledger } from 'src/ledger/ledger.entity';
import { MailingController } from './mailing.controller';
import { MailingService } from './mailing.service';
import { ConsignadoRapidoService } from './consignado-rapido.service';
import { ExtracaoOnlineService } from './extracao-online.service';
import { NvCheckService } from './nvcheck.service';
import { MailingGeneration } from './mailing-generation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Ledger, MailingGeneration])],
  controllers: [MailingController],
  providers: [
    MailingService,
    ConsignadoRapidoService,
    ExtracaoOnlineService,
    NvCheckService,
  ],
})
export class MailingModule {}
