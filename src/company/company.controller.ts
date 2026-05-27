import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Company } from './company.entity';
import { CompanyCnpjDataDto } from './dto/company-cnpj-data.dto';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) { }

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
  ) {
    return this.companyService.findUsersWithBalance(
      Number(page),
      Number(limit),
      search,
    );
  }

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
  ) {
    return this.companyService.findCompaniesWithBalance(
      Number(page),
      Number(limit),
      search,
    );
  }

  @Get('historic-user/:userId')
  @ApiOperation({
    summary: 'Buscar histórico de créditos do usuário',
  })
  @ApiResponse({
    status: 200,
    description:
      'Detalhes da carteira do usuário com saldo e histórico paginado',
    schema: {
      example: {
        user: {
          uid: '6e545637-9adf-4235-abda-0465765b8ea2',
          username: 'afranio',
          email: 'afranio@gmail.com',
          role: 'operador',
          company: {
            id: 1,
            name: 'Minha Empresa LTDA',
            domain: 'minhaempresa',
          },
        },

        wallet: {
          id: '3d8d2d11-cf9d-4f2e-9c42-8cb0e5d51a22',
          type: 'USER',
          companyId: null,
          userId: '6e545637-9adf-4235-abda-0465765b8ea2',
        },

        totalCredit: 1000,
        totalDebit: 200,
        availableCredit: 800,

        history: {
          data: [
            {
              id: 12,
              amount: 1000,
              type: 'CREDIT',
              description: 'Crédito recebido da empresa',
              origin: 'TRANSFER',
              referenceId: null,
              createdAt: '2026-05-23T18:20:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    },
  })
  findUserCreditDetails(
    @Param('userId') userId: string,
    @Query('historyPage') historyPage = '1',
    @Query('historyLimit') historyLimit = '10',
  ) {
    return this.companyService.findUserCreditDetails(
      userId,
      Number(historyPage),
      Number(historyLimit),
    );
  }

  @Get('historic-company/:companyId')
  @ApiOperation({
    summary:
      'Buscar histórico de créditos da empresa',
  })
  @ApiResponse({
    status: 200,
    description:
      'Detalhes da carteira da empresa com saldo e histórico paginado',
    schema: {
      example: {
        company: {
          id: 1,
          name: 'Minha Empresa LTDA',
          domain: 'minhaempresa',
        },

        wallet: {
          id: '3d8d2d11-cf9d-4f2e-9c42-8cb0e5d51a22',
          type: 'COMPANY',
          companyId: 1,
          userId: null,
        },

        totalCredit: 5000,

        totalDebit: 1200,

        availableCredit: 3800,

        history: {
          data: [
            {
              id: 12,
              amount: 1000,
              type: 'CREDIT',
              description:
                'Crédito adicionado manualmente',
              origin: 'AJUSTE',
              referenceId: null,
              createdAt:
                '2026-05-23T18:20:00.000Z',
            },
            {
              id: 11,
              amount: 200,
              type: 'DEBIT',
              description:
                'Consumo da operação XYZ',
              origin: 'CONSUMO',
              referenceId: 'OP-9281',
              createdAt:
                '2026-05-23T17:10:00.000Z',
            },
          ],

          total: 2,

          page: 1,

          limit: 10,

          totalPages: 1,
        },
      },
    },
  })
  findCreditDetails(
    @Param('companyId') companyId: string,
    @Query('historyPage') historyPage = '1',
    @Query('historyLimit') historyLimit = '10',
  ) {
    return this.companyService.findCreditDetailsCompany(
      companyId,
      Number(historyPage),
      Number(historyLimit),
    );
  }

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
  findAll(): Promise<Company[]> {
    return this.companyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar empresa por ID' })
  findOne(@Param('id') id: number): Promise<Company> {
    return this.companyService.findOne(Number(id));
  }

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

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar empresa' })
  update(
    @Param('id') id: number,
    @Body() dto: UpdateCompanyDto,
  ): Promise<Company> {
    return this.companyService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover empresa' })
  remove(@Param('id') id: number) {
    return this.companyService.remove(Number(id));
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Listar permissões da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Permissões da empresa',
  })
  getCompanyPermissions(@Param('id') id: number) {
    return this.companyService.getPermissions(Number(id));
  }

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