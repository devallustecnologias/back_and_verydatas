import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/company/company.entity';
import { Cargo } from 'src/entities/cargo/cargo.entity';
import { Department } from 'src/entities/department/department.entity';
import { CargoController } from './cargo.controller';
import { CargoService } from './cargo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cargo, Department, Company])],
  controllers: [CargoController],
  providers: [CargoService],
  exports: [CargoService],
})
export class CargoModule {}
