import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateCargoDto {
  @ApiProperty({ required: false, example: 'Analista Júnior' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false, example: 2, description: 'ID do novo departamento' })
  @IsInt()
  @IsOptional()
  departmentId?: number;
}
