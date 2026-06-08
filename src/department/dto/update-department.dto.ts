import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDepartmentDto {
  @ApiProperty({ required: false, example: 'Financeiro' })
  @IsString()
  @IsOptional()
  name?: string;
}
