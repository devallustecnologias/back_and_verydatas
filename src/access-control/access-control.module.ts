import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyAccessControl } from 'src/entities/access-control/company-access-control.entity';
import { Company } from 'src/company/company.entity';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyAccessControl, Company])],
  controllers: [AccessControlController],
  providers: [AccessControlService],
  exports: [TypeOrmModule],
})
export class AccessControlModule {}
