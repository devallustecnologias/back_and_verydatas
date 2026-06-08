import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Company } from './company.entity';
import { CompanyCnpjDataDto } from './dto/company-cnpj-data.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/entities/user/user.entity';
import { User } from 'src/auth/user.decorator';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) { }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get('user/balances')
  @ApiOperation({
    summary: 'Lista usuários com saldo',
    description:
      'Retorna usuários paginados junto com o saldo da carteira.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'Lucas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de usuários com saldo',
    schema: {
      example: {
        data: [
          {
            uid: 'd4f64555-1eb2-457f-a9b7-bf56711ce65f',
            username: 'Lucas',
            email: 'lucas@email.com',
            role: 'operador',
            company: {
              id: 1,
              name: 'Minha Empresa LTDA',
              domain: 'minhaempresa',
            },
            totalCredit: 1000,
            availableCredit: 750,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  async findUsersWithBalance(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @User() user?: any,
  ) {
    return this.companyService.findUsersWithBalance(
      Number(page),
      Number(limit),
      search,
      user,
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get('balances')
  @ApiOperation({
    summary: 'Lista empresas com saldo',
    description:
      'Retorna empresas paginadas junto com o saldo da carteira.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'Microsoft',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de empresas com saldo',
  })
  async findCompaniesWithBalance(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @User() user?: any,
  ) {
    return this.companyService.findCompaniesWithBalance(
      Number(page),
      Number(limit),
      search,
      user,
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get('historic-user/:userId')
  @ApiOperation({
    summary: 'Buscar histórico de créditos do usuário',
  })
  @ApiResponse({
    status: 200,
    description:
      'Detalhes da carteira do usuário com saldo e histórico paginado',
  })
  async findUserCreditDetails(
    @Param('userId') userId: string,
    @Query('historyPage') historyPage = '1',
    @Query('historyLimit') historyLimit = '10',
    @User() user?: any,
  ) {
    return this.companyService.findUserCreditDetails(
      userId,
      Number(historyPage),
      Number(historyLimit),
      user,
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get('historic-company/:companyId')
  @ApiOperation({
    summary:
      'Buscar histórico de créditos da empresa',
  })
  @ApiResponse({
    status: 200,
    description:
      'Detalhes da carteira da empresa com saldo e histórico paginado',
  })
  async findCreditDetails(
    @Param('companyId') companyId: string,
    @Query('historyPage') historyPage = '1',
    @Query('historyLimit') historyLimit = '10',
    @User() user?: any,
  ) {
    if (user && user.role !== 'master') {
      if (user.companyId == null || Number(companyId) !== user.companyId) {
        throw new ForbiddenException('Acesso negado a esta empresa');
      }
    }
    return this.companyService.findCreditDetailsCompany(
      companyId,
      Number(historyPage),
      Number(historyLimit),
    );
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get()
  @ApiOperation({ summary: 'Listar empresas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de empresas',
    schema: {
      example: [
        {
          id: 1,
          name: 'Minha Empresa',
          domain: 'minhaempresa',
          logoUrl: null,
          users: [],
        },
      ],
    },
  })
  findAll(@User() user?: any): Promise<Company[]> {
    return this.companyService.findAll(user);
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get(':id')
  @ApiOperation({ summary: 'Buscar empresa por ID' })
  findOne(@Param('id') id: number, @User() user?: any): Promise<Company> {
    if (user && user.role !== 'master') {
      if (user.companyId == null || Number(id) !== user.companyId) {
        throw new ForbiddenException('Acesso negado a esta empresa');
      }
    }
    return this.companyService.findOne(Number(id));
  }

  @Roles(UserRole.MASTER)
  @Post()
  @ApiOperation({ summary: 'Criar empresa' })
  @ApiResponse({
    status: 201,
    description: 'Empresa criada',
    schema: {
      example: {
        id: 1,
        name: 'Minha Empresa',
        domain: 'minhaempresa',
        logoUrl: 'https://site.com/logo.png',
        users: [],
      },
    },
  })
  create(@Body() dto: CreateCompanyDto): Promise<Company> {
    return this.companyService.create(dto);
  }

  @Roles(UserRole.MASTER)
  @Put(':id')
  @ApiOperation({ summary: 'Atualizar empresa' })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateCompanyDto,
  ): Promise<Company> {
    return this.companyService.update(Number(id), dto);
  }

  @Roles(UserRole.MASTER)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar status da empresa (ATIVA/BLOQUEADA)' })
  updateStatus(
    @Param('id') id: number,
    @Body() dto: UpdateCompanyStatusDto,
  ) {
    return this.companyService.updateStatus(Number(id), dto.status);
  }

  @Roles(UserRole.MASTER)
  @Delete(':id')
  @ApiOperation({ summary: 'Remover empresa' })
  remove(@Param('id') id: number) {
    return this.companyService.remove(Number(id));
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get(':id/permissions')
  @ApiOperation({ summary: 'Listar permissões da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Permissões da empresa',
  })
  getCompanyPermissions(@Param('id') id: number, @User() user?: any) {
    if (user && user.role !== 'master') {
      if (user.companyId == null || Number(id) !== user.companyId) {
        throw new ForbiddenException('Acesso negado a esta empresa');
      }
    }
    return this.companyService.getPermissions(Number(id));
  }

  @Roles(UserRole.MASTER, UserRole.EMPRESA)
  @Get('cnpj/:cnpj')
  @ApiOperation({
    summary: 'Buscar dados da empresa pelo CNPJ',
  })
  @ApiParam({
    name: 'cnpj',
    example: '34028316000103',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados aproveitáveis para cadastro da empresa',
    type: CompanyCnpjDataDto,
  })
  async getDataByCnpj(
    @Param('cnpj') cnpj: string,
  ): Promise<CompanyCnpjDataDto> {
    return this.companyService.getDataByCnpj(cnpj);
  }
}
