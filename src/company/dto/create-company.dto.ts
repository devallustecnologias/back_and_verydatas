import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Minha Empresa LTDA' })
  name!: string;

  @ApiProperty({
    example: 'minhaempresa',
    description:
      'Domínio único (usado para identificar a empresa)',
  })
  domain!: string;

  @ApiProperty({
    example: 'https://site.com/logo.png',
    required: false,
  })
  logoUrl?: string;

  @ApiProperty({
    example: 1,
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
    example: 'Minha Empresa LTDA',
    required: false,
  })
  corporateName?: string;

  @ApiProperty({
    example: 'Minha Empresa',
    required: false,
  })
  tradeName?: string;

  @ApiProperty({
    example: 'Rua A, 123 - Centro',
    required: false,
  })
  address?: string;

  @ApiProperty({
    example: 'São Paulo',
    required: false,
  })
  city?: string;

  @ApiProperty({
    example: 'SP',
    required: false,
  })
  state?: string;

  @ApiProperty({
    example: '00000-000',
    required: false,
  })
  zipCode?: string;

  @ApiProperty({
    example: 'empresa@email.com',
    required: false,
  })
  companyEmail?: string;

  @ApiProperty({
    example: '(11) 3333-4444',
    required: false,
  })
  landlinePhone?: string;

  @ApiProperty({
    example: '(11) 99999-9999',
    required: false,
  })
  whatsapp?: string;

  @ApiProperty({
    example: '123.456.789-00',
    required: false,
  })
  representativeCpf?: string;

  @ApiProperty({
    example: 'João da Silva',
    required: false,
  })
  representativeName?: string;

  // Contato responsável

  @ApiProperty({
    example: 'Maria Souza',
    required: false,
  })
  contactName?: string;

  @ApiProperty({
    example: '987.654.321-00',
    required: false,
  })
  contactCpf?: string;

  @ApiProperty({
    example: 'contato@email.com',
    required: false,
  })
  contactEmail?: string;

  @ApiProperty({
    example: '(11) 98888-7777',
    required: false,
  })
  contactWhatsapp?: string;

  @ApiProperty({
    example: 'ANEPS-12345',
    description: 'Certificação de Crédito Consignado (ANEPS) — obrigatório para contratar',
  })
  aneps!: string;

  // White Label §13
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'empresa',
    description: 'Subdomínio sob verytasdados.com.br (ex: empresa -> empresa.verytasdados.com.br)',
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