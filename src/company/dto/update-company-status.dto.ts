import { IsEnum } from 'class-validator';
import { CompanyStatus } from 'src/company/company.entity';

export class UpdateCompanyStatusDto {
  @IsEnum(CompanyStatus)
  status!: CompanyStatus;
}
