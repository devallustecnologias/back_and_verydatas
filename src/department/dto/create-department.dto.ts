import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Comercial' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    required: false,
    example: 1,
    description: 'ID da empresa. Ignorado para não-MASTER (usa empresa do token).',
  })
  @IsInt()
  @IsOptional()
  companyId?: number;
}
