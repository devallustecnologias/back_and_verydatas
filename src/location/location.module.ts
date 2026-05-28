import { UserModule } from 'src/user/user.module';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';

import { Module } from '@nestjs/common';

@Module({
    imports: [UserModule],
    controllers: [
        LocationController,],
    providers: [
        LocationService,],
})
export class LocationModule { }
