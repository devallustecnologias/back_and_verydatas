import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Permission } from './permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Controller('permissions')
export class PermissionController {
    constructor(private readonly permissionService: PermissionService) { }

@Get()
@ApiOperation({
  summary: 'Listar permissões com paginação',
})
@ApiQuery({
  name: 'page',
  required: false,
  example: 1,
})
@ApiQuery({
  name: 'limit',
  required: false,
  example: 10,
})
@ApiQuery({
  name: 'search',
  required: false,
  example: 'dashboard',
})
@ApiResponse({
  status: 200,
  description: 'Lista paginada de permissões',
  schema: {
    example: {
      data: [
        {
          id: 1,
          key: 'dashboard',
          name: 'Dashboard',
          creditCost: 0,
        },
        {
          id: 2,
          key: 'consulta.cpf',
          name: 'Consulta CPF',
          creditCost: 10,
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  },
})
findAll(
  @Query('page') page = 1,
  @Query('limit') limit = 10,
  @Query('search') search?: string,
) {
  return this.permissionService.findAll(
    Number(page),
    Number(limit),
    search,
  );
}
    @Get(':id')
    @ApiOperation({ summary: 'Buscar permissão por ID' })
    @ApiResponse({
        status: 200,
        description: 'Permissão encontrada',
        schema: {
            example: {
                id: 1,
                key: 'dashboard',
                name: 'Dashboard',
            },
        },
    })
    findOne(@Param('id') id: number): Promise<Permission> {
        return this.permissionService.findOne(Number(id));
    }
    
    @Post()
    @ApiOperation({ summary: 'Criar nova permissão' })
    @ApiResponse({
        status: 201,
        description: 'Permissão criada com sucesso',
        schema: {
            example: {
                id: 4,
                key: 'usuarios.create',
                name: 'Criar usuário',
            },
        },
    })
    create(@Body() dto: CreatePermissionDto): Promise<Permission> {
        return this.permissionService.create(dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover permissão' })
    @ApiResponse({
        status: 200,
        description: 'Permissão removida com sucesso',
    })
    remove(@Param('id') id: number) {
        return this.permissionService.remove(Number(id));
    }
    @Put(':id')
@ApiOperation({
  summary: 'Atualizar permissão',
})
@ApiResponse({
  status: 200,
  description: 'Permissão atualizada',
})
update(
  @Param('id') id: number,
  @Body() dto: UpdatePermissionDto,
): Promise<Permission> {
  return this.permissionService.update(
    Number(id),
    dto,
  );
}
}
