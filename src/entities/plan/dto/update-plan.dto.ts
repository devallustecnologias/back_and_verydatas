import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePlanDto {
  @ApiProperty({ example: 'Plano Atualizado', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({
    example: [1, 2],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  permissionIds?: number[];

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
