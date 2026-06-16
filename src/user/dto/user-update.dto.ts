import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    example: 'Novo Nome',
  })
  username!: string;

  @ApiProperty({
    example: 'novo@email.com',
  })
  email!: string;

  @ApiProperty({
    required: false,
    example: '123456',
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

  @ApiProperty({ required: false, example: [3, 8] })
  @IsOptional()
  extraMenuIds?: number[];
}