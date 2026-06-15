import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Lucas',
  })
  username!: string;

  @ApiProperty({
    example: 'lucas@email.com',
  })
  email!: string;

  @ApiProperty({
    required: false,
    example: '123456',
    description: 'Senha de acesso definida pelo admin/master ao criar o usuário',
  })
  password?: string;

  @ApiProperty({
    required: false,
    example: '12345678900',
  })
  cpf?: string;

  @ApiProperty({
    required: false,
    example: '5538999999999',
  })
  whatsapp?: string;

  @ApiProperty({
    required: false,
    example: 1,
    description: 'ID da empresa',
  })
  companyId?: number;

  @ApiProperty({
    required: false,
    example: [1, 2, 3],
    description:
      'IDs das permissões do plano do operador',
  })
  permissionIds?: number[];

  @ApiProperty({
    required: false,
    example: 1,
    description: 'ID do departamento do usuário',
  })
  @IsInt()
  @IsOptional()
  departmentId?: number;

  @ApiProperty({
    required: false,
    example: 1,
    description: 'ID do cargo do usuário',
  })
  @IsInt()
  @IsOptional()
  cargoId?: number;
}