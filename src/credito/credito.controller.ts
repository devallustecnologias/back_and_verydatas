import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreditoService } from './credito.service';
import { AddCreditsDto } from './dto/add.credito.dto';


@ApiTags('Créditos')
@Controller('creditos')
export class CreditoController {
  constructor(
    private readonly creditoService: CreditoService,
  ) {}

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
}