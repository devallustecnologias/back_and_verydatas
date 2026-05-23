import { ApiProperty } from '@nestjs/swagger';

export class AddCreditsDto {
  @ApiProperty({
    example: '1',
    description: 'ID da empresa ou UID do usuário',
  })
  userIdOrCompanyId!: string;

  @ApiProperty({
    example: 1000,
    description: 'Quantidade de créditos',
  })
  amount!: number;

  @ApiProperty({
    example: 'Crédito inicial da empresa',
    required: false,
  })
  description?: string;
}