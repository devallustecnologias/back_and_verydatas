import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Module } from '@nestjs/common';
import { User } from 'src/entities/user/user.entity';
import { Plan } from 'src/entities/plan/plan.entity';
import { Permission } from 'src/entities/permission/permission.entity';
import { Company } from 'src/company/company.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, Plan, Permission, Company]),],
    controllers: [
        UserController,],
    providers: [
        UserService,],
        exports: [UserService],
})
export class UserModule { }
