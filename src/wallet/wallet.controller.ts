import {
  Controller,
  Post,
  Body,
  Get,
  Param,
} from '@nestjs/common';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/wallet.dto';
import { TransferWalletDto } from './dto/tranfer.dto';


@ApiTags('Wallets')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // criar wallet
  @Post()
  @ApiOperation({ summary: 'Criar wallet (empresa ou usuário)' })
  create(@Body() dto: CreateWalletDto) {
    return this.walletService.createWallet(dto);
  }

  //  transferência
  @Post('transfer')
  @ApiOperation({ summary: 'Transferir créditos entre wallets' })
  transfer(@Body() dto: TransferWalletDto) {
    return this.walletService.transfer(
      dto.fromWalletId,
      dto.toWalletId,
      dto.amount,
    );
  }

  //  saldo
  @Get(':id/balance')
  @ApiOperation({ summary: 'Consultar saldo da wallet' })
  getBalance(@Param('id') id: string) {
    return this.walletService.getBalance(id);
  }

  //  extrato
  @Get(':id/ledger')
  @ApiOperation({ summary: 'Extrato da wallet' })
  getLedger(@Param('id') id: string) {
    return this.walletService.getLedger(id);
  }
}