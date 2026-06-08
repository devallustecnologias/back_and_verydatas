import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/user.decorator';
import { UserRole } from 'src/entities/user/user.entity';
import { CreditsQueryDto } from './dto/credits-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /reports/credits
   *
   * Relatório paginado das operações de crédito (AJUSTE), estorno (ESTORNO)
   * e consumo (CONSUMO) registradas no Ledger.
   *
   * Campos de histórico (§6): data, hora (via `data`), operação (tipo/origem),
   * usuário responsável, motivo (descricao), quantidade.
   *
   * Tenant-scope:
   *   MASTER  — vê tudo; pode filtrar por ?companyId ou ?userId.
   *   EMPRESA — restrito à própria empresa (ignora ?companyId do query).
   *   OPERADOR— restrito à própria wallet de usuário.
   */
  @Get('credits')
  @Roles(UserRole.MASTER, UserRole.EMPRESA, UserRole.OPERADOR)
  getCredits(
    @Query() query: CreditsQueryDto,
    @User() user: { userId: string; role: string; companyId?: number },
  ) {
    return this.reportsService.getCredits(query, user);
  }
}
