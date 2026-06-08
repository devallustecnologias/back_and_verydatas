import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional } from 'class-validator';

export class UpdateMenuDto {
  @ApiProperty({ example: 'Consultas Corban', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'consultas-corban', required: false })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  parentId?: number;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @IsOptional()
  order?: number;
}
