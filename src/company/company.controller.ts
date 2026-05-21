import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Company } from './company.entity';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) { }

  @Get('balances')
  @ApiOperation({
    summary: 'Lista empresas com saldo',
    description:
      'Retorna todas as empresas junto com o saldo da carteira.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de empresas com saldo',
    schema: {
      example: [
        {
          id: 1,
          name: 'Empresa LTDA',
          domain: 'empresa.com.br',
          logoUrl: 'https://empresa.com/logo.png',
          balance: 1500,
        },
        {
          id: 2,
          name: 'Outra Empresa',
          domain: 'outra.com.br',
          logoUrl: null,
          balance: 300,
        },
      ],
    },
  })
  async findCompaniesWithBalance() {
    return this.companyService.findCompaniesWithBalance();
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
}