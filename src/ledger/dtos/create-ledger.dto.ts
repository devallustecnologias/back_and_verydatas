import { ApiProperty } from '@nestjs/swagger';
import { LedgerType, LedgerOrigin } from '../ledger.entity';

export class CreateLedgerDto {
  @ApiProperty({ example: 100 })
  amount!: number;

  @ApiProperty({ enum: LedgerType, example: LedgerType.CREDIT })
  type!: LedgerType;

  @ApiProperty({ example: 'Recarga de créditos' })
  description!: string;

  @ApiProperty({
    enum: LedgerOrigin,
    required: false,
    example: LedgerOrigin.AJUSTE,
  })
  origin?: LedgerOrigin;

  @ApiProperty({
    required: false,
    example: 'pedido-123',
  })
  referenceId?: string;

@ApiProperty({
  required: true,
  example: 'uuid-wallet-id',
})
walletId!: string;
}