import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from 'src/ledger/walled.entity';
import { Ledger } from 'src/ledger/ledger.entity';
import { MailingController } from './mailing.controller';
import { MailingService } from './mailing.service';
import { ConsignadoRapidoService } from './consignado-rapido.service';
import { ExtracaoOnlineService } from './extracao-online.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Ledger])],
  controllers: [MailingController],
  providers: [MailingService, ConsignadoRapidoService, ExtracaoOnlineService],
})
export class MailingModule {}
