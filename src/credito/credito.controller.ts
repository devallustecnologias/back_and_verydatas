import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreditoService } from './credito.service';
import { AddCreditsDto } from './dto/add.credito.dto';
import { AddCreditsToUserDto } from './dto/add-credits-to-user.dto';
import { WalletService } from 'src/wallet/wallet.service';


@ApiTags('Créditos')
@Controller('creditos')
export class CreditoController {
  constructor(
    private readonly creditoService: CreditoService,
    private readonly walletService: WalletService,
  ) { }

  @Post('add')
  @ApiOperation({
    summary:
      'Adicionar créditos para usuário ou empresa',
  })
  addCredits(@Body() dto: AddCreditsDto) {
    return this.creditoService.addCredits(
      dto.userIdOrCompanyId,
      dto.amount,
      dto.description,
    );
  }

  @Post('add/user')
  addCreditsToUser(@Body() dto: AddCreditsToUserDto) {
    return this.walletService.addCreditUser(
      dto.companyId,
      dto.userId,
      dto.amount,
      dto.description,
    );
  }
}