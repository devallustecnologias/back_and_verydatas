import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyCnpjDataDto } from './dto/company-cnpj-data.dto';
import { Company } from './company.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/auth/user.decorator';

@ApiTags('Companies')
@Controller('company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

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
    @User() currentUser?: any,
  ) {
    return this.companyService.findCompaniesWithBalance(
      Number(page),
      Number(limit),
      search,
      currentUser,
    );
  }

  @Get('balances/users')
  @ApiOperation({
    summary: 'Lista usuários com saldo',
    description: 'Retorna usuários paginados junto com o saldo da carteira.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de usuários com saldo',
  })
  async findUsersWithBalance(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @User() currentUser?: any,
  ) {
    return this.companyService.findUsersWithBalance(
      Number(page),
      Number(limit),
      search,
      currentUser,
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
    @User() currentUser?: any,
  ) {
    return this.companyService.findUserCreditDetails(
      userId,
      Number(historyPage),
      Number(historyLimit),
      currentUser,
    );
  }

  @Get('historic-company/:companyId')
  @ApiOperation({
    summary: 'Buscar histórico de créditos da empresa',
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
              description: 'Crédito adicionado manualmente',
              origin: 'AJUSTE',
              referenceId: null,
              createdAt: '2026-05-23T18:20:00.000Z',
            },
            {
              id: 11,
              amount: 200,
              type: 'DEBIT',
              description: 'Consumo da operação XYZ',
              origin: 'CONSUMO',
              referenceId: 'OP-9281',
              createdAt: '2026-05-23T17:10:00.000Z',
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
    @User() currentUser?: any,
  ) {
    return this.companyService.findCreditDetailsCompany(
      companyId,
      Number(historyPage),
      Number(historyLimit),
      currentUser,
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
  findAll(@User() currentUser?: any): Promise<Company[]> {
    return this.companyService.findAll(currentUser);
  }

  @Get('branding/info')
  @ApiOperation({ summary: 'Obter branding da empresa pelo domínio/tenant da requisição' })
  async getBrandingInfo(@Req() req: any) {
    const company = req.company as Company;
    if (!company) {
      return {
        logoUrl: '/logo.png',
        slogan: 'O crédito que respeita você',
        primaryColor: '#1F2937',
        name: 'Devallus',
      };
    }
    return {
      logoUrl: company.logoUrl || '/logo.png',
      slogan: company.slogan || 'O crédito que respeita você',
      primaryColor: company.primaryColor || '#1F2937',
      name: company.name,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar empresa por ID' })
  findOne(
    @Param('id') id: number,
    @User() currentUser?: any,
  ): Promise<Company> {
    return this.companyService.findOne(Number(id), currentUser);
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
    @User() currentUser?: any,
  ): Promise<Company> {
    return this.companyService.update(Number(id), dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover empresa' })
  remove(
    @Param('id') id: number,
    @User() currentUser?: any,
  ) {
    return this.companyService.remove(Number(id), currentUser);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Listar permissões da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Permissões da empresa',
  })
  getCompanyPermissions(
    @Param('id') id: number,
    @User() currentUser?: any,
  ) {
    return this.companyService.getPermissions(Number(id), currentUser);
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