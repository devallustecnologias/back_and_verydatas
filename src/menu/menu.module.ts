import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from 'src/entities/menu/menu.entity';
import { Plan } from 'src/entities/plan/plan.entity';
import { Company } from 'src/company/company.entity';
import { CompanyAccessControl } from 'src/entities/access-control/company-access-control.entity';
import { User } from 'src/entities/user/user.entity';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [TypeOrmModule.forFeature([Menu, Plan, Company, CompanyAccessControl, User])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
