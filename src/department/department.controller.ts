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
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Departments')
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Post()
  @ApiOperation({ summary: 'Criar departamento' })
  create(@Body() dto: CreateDepartmentDto, @User() user: any) {
    return this.departmentService.create(dto, user);
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get()
  @ApiOperation({ summary: 'Listar departamentos' })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  findAll(
    @User() user: any,
    @Query('companyId') companyId?: string,
  ) {
    return this.departmentService.findAll(
      user,
      companyId ? Number(companyId) : undefined,
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get(':id')
  @ApiOperation({ summary: 'Buscar departamento por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @User() user: any) {
    return this.departmentService.findOne(id, user);
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Put(':id')
  @ApiOperation({ summary: 'Atualizar departamento' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
    @User() user: any,
  ) {
    return this.departmentService.update(id, dto, user);
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Delete(':id')
  @ApiOperation({ summary: 'Remover departamento (soft-delete)' })
  remove(@Param('id', ParseIntPipe) id: number, @User() user: any) {
    return this.departmentService.remove(id, user);
  }
}
