import { ApiProperty } from '@nestjs/swagger';

export class TransferWalletDto {
  @ApiProperty()
  fromWalletId!: string;

  @ApiProperty()
  toWalletId!: string;

  @ApiProperty()
  amount!: number;
}