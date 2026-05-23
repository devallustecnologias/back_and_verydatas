import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, IsOptional } from 'class-validator';

export class AddCreditsWalletDto {
  @ApiProperty({
    example: 'uuid-da-wallet',
  })
  @IsString()
  walletId!: string;

  @ApiProperty({
    example: 100,
  })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({
    example: 'Crédito inicial da empresa',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}