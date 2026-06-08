import {
  Controller,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/user.decorator';
import { UserRole } from 'src/entities/user/user.entity';

@ApiTags('Auditoria')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit
   * MASTER: vê todos os logs.
   * EMPRESA: vê apenas logs da própria empresa (tenant-scoped).
   * OPERADOR: sem acesso (bloqueado pelo @Roles).
   */
  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get()
  @ApiOperation({ summary: 'Listar logs de auditoria (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'action', required: false, type: String, example: 'LOGIN' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, type: String, example: '2026-12-31' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @User() currentUser?: any,
  ) {
    return this.auditService.findAll({
      page,
      limit,
      action,
      userId,
      from,
      to,
      currentUser: {
        role: currentUser?.role ?? '',
        companyId: currentUser?.companyId ?? null,
      },
    });
  }
}
