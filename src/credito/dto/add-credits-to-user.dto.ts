import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class AddCreditsToUserDto {
  @ApiProperty({
    example: 1,
    description: 'ID da empresa que irá fornecer os créditos',
  })
  @IsInt()
  companyId!: number;

  @ApiProperty({
    example:
      '6e545637-9adf-4235-abda-0465765b8ea2',
    description: 'ID do usuário que receberá os créditos',
  })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    example: 100,
    description: 'Quantidade de créditos',
  })
  @IsPositive()
  amount!: number;

  @ApiProperty({
    example: 'Crédito para operador',
    description: 'Descrição da transferência',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;
}