import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Module } from '@nestjs/common';
import { User } from 'src/entities/user/user.entity';
import { Plan } from 'src/entities/plan/plan.entity';
import { Permission } from 'src/entities/permission/permission.entity';
import { Company } from 'src/company/company.entity';
import { Department } from 'src/entities/department/department.entity';
import { Cargo } from 'src/entities/cargo/cargo.entity';
import { MailModule } from 'src/mail/mail.module';

@Module({
    imports: [TypeOrmModule.forFeature([User, Plan, Permission, Company, Department, Cargo]), MailModule],
    controllers: [
        UserController,],
    providers: [
        UserService,],
        exports: [UserService],
})
export class UserModule { }
