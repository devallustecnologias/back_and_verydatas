import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

/**
 * Consulta Gerar Lote: o usuário fornece a própria lista de identificadores
 * (CPF de 11 dígitos ou NB de 10 dígitos) e recebe a planilha de 46 colunas
 * (mesmo formato da higienização do Mailing), sem usar filtros de mailing.
 */
export class GerarLoteDto {
  @ApiProperty({
    type: [String],
    example: ['11499770359', '1234567890'],
    description: 'Lista de CPF (11 díg.) e/ou NB (10 díg.). Não-dígitos são ignorados.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  identificadores!: string[];

  @ApiProperty({ required: false, example: 'Carteira de clientes - Maio' })
  @IsOptional()
  @IsString()
  nome?: string;
}
