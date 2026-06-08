import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/user.decorator';
import { UserRole } from 'src/entities/user/user.entity';
import { CargoService } from './cargo.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';

@ApiTags('Cargos')
@Controller('cargos')
export class CargoController {
  constructor(private readonly cargoService: CargoService) {}

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Post()
  @ApiOperation({ summary: 'Criar cargo' })
  create(@Body() dto: CreateCargoDto, @User() user: any) {
    return this.cargoService.create(dto, user);
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get()
  @ApiOperation({ summary: 'Listar cargos' })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  findAll(
    @User() user: any,
    @Query('companyId') companyId?: string,
  ) {
    return this.cargoService.findAll(
      user,
      companyId ? Number(companyId) : undefined,
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get(':id')
  @ApiOperation({ summary: 'Buscar cargo por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @User() user: any) {
    return this.cargoService.findOne(id, user);
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Put(':id')
  @ApiOperation({ summary: 'Atualizar cargo' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCargoDto,
    @User() user: any,
  ) {
    return this.cargoService.update(id, dto, user);
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Delete(':id')
  @ApiOperation({ summary: 'Remover cargo (soft-delete)' })
  remove(@Param('id', ParseIntPipe) id: number, @User() user: any) {
    return this.cargoService.remove(id, user);
  }
}
