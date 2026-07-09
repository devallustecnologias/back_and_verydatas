import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
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

  @Roles(UserRole.MASTER, UserRole.EMPRESA, UserRole.OPERADOR)
  @Get('consulta/cpf/:cpf')
  @ApiOperation({ summary: 'Consulta CPF INSS (Consignado Rápido /api/cpf)' })
  consultaCpf(@Param('cpf') cpf: string) {
    return this.cr.consultaCpf(String(cpf).replace(/\D/g, ''));
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA, UserRole.OPERADOR)
  @Get('consulta/offline/:nb')
  @ApiOperation({ summary: 'Consulta Offline por nº de benefício (Consignado Rápido /api/offline)' })
  consultaOffline(@Param('nb') nb: string) {
    return this.cr.consultaOffline(String(nb).replace(/\D/g, ''));
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA, UserRole.OPERADOR)
  @Get('consulta/extracao-online/:nb')
  @ApiOperation({
    summary: 'Extração de Consignação Online por nº de benefício (cobra 1 crédito)',
  })
  consultaExtracaoOnline(@Param('nb') nb: string, @Req() req: any) {
    return this.mailingService.consultarExtracaoOnline(
      String(nb).replace(/\D/g, ''),
      req.user,
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA, UserRole.OPERADOR)
  @Get('consulta/beneficios/:cpf')
  @ApiOperation({ summary: 'Consulta INSS completa por CPF (margem + contratos + bancos + endereço)' })
  consultaBeneficios(@Param('cpf') cpf: string) {
    return this.cr.consultaBeneficios(String(cpf).replace(/\D/g, '').padStart(11, '0'));
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA, UserRole.OPERADOR)
  @Post('consulta/lote')
  @ApiOperation({ summary: 'Consulta vários CPFs (cpf → opcionalmente offline completo)' })
  consultaLote(@Body() dto: { cpfs: string[]; full?: boolean }) {
    return this.mailingService.consultarLote(dto?.cpfs ?? [], dto?.full ?? false);
  }
}
