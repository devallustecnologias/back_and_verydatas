import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCompanyDto {
  @ApiProperty({
    example: 'Empresa Atualizada',
    required: false,
  })
  name?: string;

  @ApiProperty({
    example: 'empresa-nova',
    required: false,
  })
  domain?: string;

  @ApiProperty({
    example: 'https://site.com/logo.png',
    required: false,
  })
  logoUrl?: string;

  @ApiProperty({
    example: 2,
    required: false,
    description: 'ID do plano da empresa',
  })
  planId?: number;

  // Dados da empresa

  @ApiProperty({
    example: '12.345.678/0001-90',
    required: false,
  })
  cnpj?: string;

  @ApiProperty({
    example: 'Empresa Atualizada LTDA',
    required: false,
  })
  corporateName?: string;

  @ApiProperty({
    example: 'Empresa Atualizada',
    required: false,
  })
  tradeName?: string;

  @ApiProperty({
    example: 'Rua Nova, 500 - Centro',
    required: false,
  })
  address?: string;

  @ApiProperty({
    example: 'Belo Horizonte',
    required: false,
  })
  city?: string;

  @ApiProperty({
    example: 'MG',
    required: false,
  })
  state?: string;

  @ApiProperty({
    example: '30100-000',
    required: false,
  })
  zipCode?: string;

  @ApiProperty({
    example: 'empresa@empresa.com',
    required: false,
  })
  companyEmail?: string;

  @ApiProperty({
    example: '(31) 3333-4444',
    required: false,
  })
  landlinePhone?: string;

  @ApiProperty({
    example: '(31) 99999-9999',
    required: false,
  })
  whatsapp?: string;

  @ApiProperty({
    example: '123.456.789-00',
    required: false,
  })
  representativeCpf?: string;

  @ApiProperty({
    example: 'Carlos Henrique',
    required: false,
  })
  representativeName?: string;

  // Contato responsável

  @ApiProperty({
    example: 'Fernanda Oliveira',
    required: false,
  })
  contactName?: string;

  @ApiProperty({
    example: '987.654.321-00',
    required: false,
  })
  contactCpf?: string;

  @ApiProperty({
    example: 'contato@empresa.com',
    required: false,
  })
  contactEmail?: string;

  @ApiProperty({
    example: '(31) 98888-7777',
    required: false,
  })
  contactWhatsapp?: string;

  @ApiProperty({
    example: 'ANEPS-12345',
    required: false,
    description: 'Certificação de Crédito Consignado (ANEPS)',
  })
  aneps?: string;

  // White Label §13
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'empresa',
    description: 'Subdomínio sob verytasdados.com.br',
    required: false,
  })
  subdomain?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'www.empresa.com.br',
    description: 'Domínio próprio para white label completo',
    required: false,
  })
  customDomain?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '#1A73E8', required: false })
  brandPrimaryColor?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '#34A853', required: false })
  brandSecondaryColor?: string;
}