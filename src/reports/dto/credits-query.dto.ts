import { IsOptional, IsEnum, IsInt, Min, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { LedgerOrigin, LedgerType } from 'src/ledger/ledger.entity';

export class CreditsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(LedgerOrigin)
  origin?: LedgerOrigin;

  @IsOptional()
  @IsEnum(LedgerType)
  type?: LedgerType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
