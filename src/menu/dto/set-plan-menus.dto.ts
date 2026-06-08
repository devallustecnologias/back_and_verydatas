import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class SetPlanMenusDto {
  @ApiProperty({ example: [1, 2, 3], description: 'IDs dos menus liberados para o plano' })
  @IsArray()
  @IsInt({ each: true })
  menuIds!: number[];
}
