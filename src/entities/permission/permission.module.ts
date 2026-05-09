import { PermissionController } from './permission.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionService } from './permission.service';
import { Module } from '@nestjs/common';
import { User } from '../user/user.entity';
import { Plan } from '../plan/plan.entity';
import { Permission } from './permission.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, Plan, Permission]),],
    controllers: [
        PermissionController,],
    providers: [
        PermissionService,],
        exports: [PermissionService],
})
export class PermissionModule { }
