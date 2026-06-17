import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class FiltroDto {
  @ApiProperty({ example: 'uf' })
  key!: string;

  @ApiProperty({ example: 'in', description: 'equal | in | not_in | between' })
  op!: string;

  @ApiProperty({ example: ['SP', 'MG'] })
  value!: any;
}

export class GerarMailingDto {
  @ApiProperty({ required: false, example: 'Campanha Maio' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({ example: 5000, description: 'Qtd de leads. Máx 1000 (mailing) ou 25000 (com contrato).' })
  @IsInt()
  limit!: number;

  @ApiProperty({ required: false, description: 'Usa o endpoint mailingContratos (até 25000, com contratos)' })
  @IsOptional()
  @IsBoolean()
  comContrato?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  zip?: boolean;

  @ApiProperty({ type: [FiltroDto], required: false })
  @IsOptional()
  @IsArray()
  filtros?: FiltroDto[];
}
