import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/user.decorator';
import { UserRole } from 'src/entities/user/user.entity';
import { AccessControlService } from './access-control.service';
import { UpsertAccessControlDto } from './dto/upsert-access-control.dto';

@ApiTags('Access Control')
@Controller('access-control')
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get(':companyId')
  @ApiOperation({ summary: 'Obter configuração de acesso da empresa (cria default se não existir)' })
  getConfig(
    @Param('companyId', ParseIntPipe) companyId: number,
    @User() user: any,
  ) {
    return this.accessControlService.getOrCreate(companyId, user);
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Put(':companyId')
  @ApiOperation({ summary: 'Criar/atualizar configuração de acesso da empresa' })
  upsertConfig(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() dto: UpsertAccessControlDto,
    @User() user: any,
  ) {
    return this.accessControlService.upsert(companyId, dto, user);
  }
}
