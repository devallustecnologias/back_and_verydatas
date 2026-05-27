import { ApiProperty } from '@nestjs/swagger';

export class CityResponseDto {
  @ApiProperty({ example: 'Abadia dos Dourados' })
  name!: string;

  @ApiProperty({ example: 'BR' })
  countryCode!: string;

  @ApiProperty({ example: 'MG' })
  stateCode!: string;
}