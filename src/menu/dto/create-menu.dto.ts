import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateMenuDto {
  @ApiProperty({ example: 'Consultas Corban' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'consultas-corban' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  parentId?: number;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @IsOptional()
  order?: number;
}
