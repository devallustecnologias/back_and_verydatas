import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PlanService } from './plan.service';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Plan } from './plan.entity';

@Controller()
export class PlanController {
  constructor(private readonly planService: PlanService) { }

  @Get()
  @ApiOperation({ summary: 'Listar planos' })
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
    example: 'pro',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de planos',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'Plano Básico',
            isSystem: true,
            permissions: [
              {
                id: 1,
                key: 'dashboard',
                name: 'Dashboard',
                creditCost: 0,
              },
            ],
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.planService.findAll(
      Number(page) || 1,
      Number(limit) || 10,
      search,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar plano por ID' })
  @ApiResponse({
    status: 200,
    description: 'Plano encontrado',
    schema: {
      example: {
        id: 1,
        name: 'Plano Básico',
        isSystem: true,
        permissions: [
          { id: 1, key: 'dashboard', name: 'Dashboard' },
        ],
      },
    },
  })
  findOne(@Param('id') id: number): Promise<Plan> {
    return this.planService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Criar plano' })
  @ApiResponse({
    status: 201,
    description: 'Plano criado',
    schema: {
      example: {
        id: 2,
        name: 'Plano Pro',
        isSystem: false,
        permissions: [
          { id: 1, key: 'consulta.cpf', name: 'Consulta CPF' },
          { id: 2, key: 'usuarios.create', name: 'Criar usuários' },
        ],
      },
    },
  })
  create(@Body() dto: CreatePlanDto): Promise<Plan> {
    return this.planService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar plano' })
  update(
    @Param('id') id: number,
    @Body() dto: UpdatePlanDto,
  ): Promise<Plan> {
    return this.planService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover plano' })
  @ApiResponse({
    status: 200,
    description: 'Plano removido com sucesso',
  })
  remove(@Param('id') id: number) {
    return this.planService.remove(Number(id));
  }

  @Post(':planId/assign/:userId')
  @ApiOperation({ summary: 'Atribuir plano a um usuário' })
  @ApiResponse({
    status: 200,
    description: 'Plano atribuído com sucesso',
  })
  assignPlanToUser(
    @Param('userId') userId: string,
    @Param('planId') planId: number,
  ) {
    return this.planService.assignPlanToUser(userId, Number(planId));
  }
}
