import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCargoDto {
  @ApiProperty({ example: 'Gerente de Vendas' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 1, description: 'ID do departamento ao qual o cargo pertence' })
  @IsInt()
  @IsNotEmpty()
  departmentId!: number;

  @ApiProperty({
    required: false,
    example: 1,
    description: 'ID da empresa. Ignorado para não-MASTER (usa empresa do token).',
  })
  @IsInt()
  @IsOptional()
  companyId?: number;
}
