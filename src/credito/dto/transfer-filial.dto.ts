import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class TransferFilialDto {
  @ApiProperty({
    example: 5,
    description: 'ID da empresa filial que receberá (ou devolverá) os créditos',
  })
  @IsInt()
  filialCompanyId!: number;

  @ApiProperty({
    example: 100,
    description: 'Quantidade de créditos a transferir',
  })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({
    example: 'Repasse mensal de créditos',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
