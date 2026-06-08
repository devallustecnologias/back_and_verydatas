import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Ledger } from './ledger.entity';
import { CreateLedgerDto } from './dtos/create-ledger.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/entities/user/user.entity';

@ApiTags('Ledger')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Roles(UserRole.MASTER)
  @Get()
  @ApiOperation({ summary: 'Listar lançamentos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de registros do ledger',
    schema: {
      example: [
        {
          id: 1,
          amount: 100,
          type: 'CREDIT',
          description: 'Recarga',
          origin: 'AJUSTE',
          referenceId: 'pedido-123',
          company: { id: 1, name: 'Empresa X' },
          user: { id: 10, name: 'Lucas' },
          createdAt: '2026-05-03T20:00:00Z',
        },
      ],
    },
  })
  findAll(): Promise<Ledger[]> {
    return this.ledgerService.findAll();
  }

  @Roles(UserRole.MASTER)
  @Get(':id')
  @ApiOperation({ summary: 'Buscar lançamento por ID' })
  findOne(@Param('id') id: number): Promise<Ledger> {
    return this.ledgerService.findOne(Number(id));
  }

  @Roles(UserRole.MASTER)
  @Post()
  @ApiOperation({ summary: 'Criar lançamento' })
  @ApiResponse({
    status: 201,
    description: 'Lançamento criado',
    schema: {
      example: {
        id: 1,
        amount: 100,
        type: 'CREDIT',
        description: 'Recarga',
        origin: 'AJUSTE',
        referenceId: 'pedido-123',
        createdAt: '2026-05-03T20:00:00Z',
      },
    },
  })
  create(@Body() dto: CreateLedgerDto): Promise<Ledger> {
    return this.ledgerService.create(dto);
  }

  @Roles(UserRole.MASTER)
  @Delete(':id')
  @ApiOperation({ summary: 'Remover lançamento (não recomendado)' })
  remove(@Param('id') id: number) {
    return this.ledgerService.remove(Number(id));
  }
}
