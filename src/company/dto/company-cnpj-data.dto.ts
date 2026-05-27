import { ApiProperty } from '@nestjs/swagger';

export class CompanyCnpjDataDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  cnpj!: string;

  @ApiProperty()
  corporateName!: string;

  @ApiProperty()
  tradeName!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  zipCode!: string;

  @ApiProperty()
  companyEmail!: string;

  @ApiProperty()
  landlinePhone!: string;

  @ApiProperty({ required: false })
  whatsapp?: string;

  @ApiProperty({ required: false })
  representativeCpf?: string;

  @ApiProperty({ required: false })
  representativeName?: string;

  @ApiProperty({ required: false })
  contactName?: string;

  @ApiProperty({ required: false })
  contactCpf?: string;

  @ApiProperty({ required: false })
  contactEmail?: string;

  @ApiProperty({ required: false })
  contactWhatsapp?: string;
}