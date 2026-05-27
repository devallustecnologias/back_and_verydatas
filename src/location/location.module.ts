import { LocationController } from './location.controller';
import { LocationService } from './location.service';

import { Module } from '@nestjs/common';

@Module({
    imports: [],
    controllers: [
        LocationController,],
    providers: [
        LocationService,],
})
export class LocationModule { }
