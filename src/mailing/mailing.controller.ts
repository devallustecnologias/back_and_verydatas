import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/entities/user/user.entity';
import { MailingService } from './mailing.service';
import { ConsignadoRapidoService } from './consignado-rapido.service';
import { GerarMailingDto } from './dto/gerar-mailing.dto';

@ApiTags('Mailing')
@Controller('mailing')
export class MailingController {
  constructor(
    private readonly mailingService: MailingService,
    private readonly cr: ConsignadoRapidoService,
  ) {}

  @Roles(UserRole.MASTER, UserRole.EMPRESA, UserRole.OPERADOR)
  @Post('gerar')
  @ApiOperation({ summary: 'Gerar mailing de leads INSS (Consignado Rápido)' })
  gerar(@Body() dto: GerarMailingDto, @Req() req: any) {
    return this.mailingService.gerar(dto, req.user);
  }

  // Diagnóstico: confere se as credenciais/IP estão liberados (não extrai leads)
  @Roles(UserRole.MASTER)
  @Get('ping')
  @ApiOperation({ summary: 'Testa autenticação no Consignado Rápido (sem extrair leads)' })
  ping() {
    return this.cr.ping();
  }
}
