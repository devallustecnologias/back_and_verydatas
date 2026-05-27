import { ApiProperty } from '@nestjs/swagger';

export class StateResponseDto {
  @ApiProperty({ example: 'Acre' })
  name!: string;

  @ApiProperty({ example: 'AC' })
  isoCode!: string;

  @ApiProperty({ example: 'BR' })
  countryCode!: string;
}