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
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/entities/user/user.entity';


@ApiTags('Créditos')
@Controller('creditos')
export class CreditoController {
  constructor(
    private readonly creditoService: CreditoService,
    private readonly walletService: WalletService,
  ) { }

  @Roles(UserRole.MASTER)
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

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Post('estorno')
  @ApiOperation({ summary: 'Estornar creditos de usuario ou empresa' })
  estornar(@Body() dto: AddCreditsDto) {
    return this.creditoService.estornarCredits(
      dto.userIdOrCompanyId,
      dto.amount,
      dto.description,
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
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
