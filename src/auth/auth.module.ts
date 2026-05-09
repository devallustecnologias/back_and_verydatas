import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { LocalAuthGuard } from './local-auth.guard';
import { User } from '../entities/user/user.entity';
import { PermissionModule } from 'src/entities/permission/permission.module';
import { Permission } from 'src/entities/permission/permission.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    UserModule,
    PassportModule,
    TypeOrmModule.forFeature([User, Permission]),
    JwtModule.register({
      secret: 'mysecretkey',
      signOptions: { expiresIn: '12h' },
    }),
   
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalAuthGuard],
  exports: [AuthService],
})
export class AuthModule { }
