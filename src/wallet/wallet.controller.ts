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
import { AddCreditsWalletDto } from './dto/add.credit.wallet.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/entities/user/user.entity';


@ApiTags('Wallets')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  // criar wallet
  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Post()
  @ApiOperation({ summary: 'Criar wallet (empresa ou usuário)' })
  create(@Body() dto: CreateWalletDto) {
    return this.walletService.createWallet(dto);
  }

  //  transferência
  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Post('transfer')
  @ApiOperation({ summary: 'Transferir créditos entre wallets' })
  transfer(@Body() dto: TransferWalletDto) {
    return this.walletService.transfer(
      dto.fromWalletId,
      dto.toWalletId,
      dto.amount,
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Post('add-credits')
  @ApiOperation({ summary: 'Adicionar créditos manualmente em uma wallet' })
  addCredits(@Body() dto: AddCreditsWalletDto) {
    return this.walletService.addCredits(
      dto.walletId,
      dto.amount,
      dto.description,
    );
  }

  //  saldo
  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get(':id/balance')
  @ApiOperation({ summary: 'Consultar saldo da wallet' })
  getBalance(@Param('id') id: string) {
    return this.walletService.getBalance(id);
  }

  //  extrato
  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get(':id/ledger')
  @ApiOperation({ summary: 'Extrato da wallet' })
  getLedger(@Param('id') id: string) {
    return this.walletService.getLedger(id);
  }
}
