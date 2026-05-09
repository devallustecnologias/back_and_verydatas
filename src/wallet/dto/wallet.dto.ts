import { ApiProperty } from "@nestjs/swagger";

export class CreateWalletDto {
  @ApiProperty({ required: false })
  companyId?: number;

  @ApiProperty({ required: false })
  userId?: string;
}