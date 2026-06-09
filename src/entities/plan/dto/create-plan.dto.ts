import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({
    example: 'Plano Pro',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: [1, 2, 3],
    description: 'IDs das permissões',
  })
  @IsArray()
  @IsInt({ each: true })
  permissionIds!: number[];

  @ApiProperty({
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiProperty({
    example: 1000,
    required: false,
    description: 'Limite de créditos do plano',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  creditLimit?: number;

  @ApiProperty({
    example: 5,
    required: false,
    description: 'Limite de usuários do plano',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  userLimit?: number;
}