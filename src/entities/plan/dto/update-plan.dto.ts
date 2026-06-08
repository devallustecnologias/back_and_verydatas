import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdatePlanDto {
  @ApiProperty({ example: 'Plano Atualizado' })
  name!: string;

  @ApiProperty({
    example: [1, 2],
  })
  permissionIds!: number[];

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