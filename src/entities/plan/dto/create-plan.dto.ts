import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({
    example: 'Plano Pro',
  })
  name!: string;

  @ApiProperty({
    example: [1, 2, 3],
    description: 'IDs das permissões',
  })
  permissionIds!: number[];

  @ApiProperty({
    example: false,
    required: false,
  })
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