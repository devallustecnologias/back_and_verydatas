import { Module } from '@nestjs/common';

import { PermissionsGuard } from './permissions.guard';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [UserModule],

  providers: [PermissionsGuard],

  exports: [PermissionsGuard],
})
export class PermissionsModule {}