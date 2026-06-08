// src/user/entities/user.entity.ts

import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Company } from 'src/company/company.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Plan } from '../plan/plan.entity';
import { Department } from '../department/department.entity';
import { Cargo } from '../cargo/cargo.entity';

export enum UserRole {
  MASTER = 'master',
  EMPRESA = 'empresa',
  OPERADOR = 'operador',
}

export enum UserStatus {
  ATIVO = 'ATIVO',
  BLOQUEADO = 'BLOQUEADO',
  SUSPENSO = 'SUSPENSO',
  EXCLUIDO = 'EXCLUIDO',
}

@Entity()
export class User {
  @ApiProperty()
  @PrimaryColumn()
  uid!: string;

  @ApiProperty()
  @Column()
  username!: string;

  @ApiProperty()
  @Column({ unique: true })
  email!: string;

  @ApiProperty()
  @Column()
  @Exclude()
  password!: string;

  @ApiProperty({
    required: false,
    example: '12345678900',
  })
  @Column({
    nullable: true,
    unique: true,
  })
  cpf?: string;

  @ApiProperty({
    required: false,
    example: '5538999999999',
  })
  @Column({
    nullable: true,
  })
  whatsapp?: string;

  @ApiProperty({ enum: UserRole })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.OPERADOR,
  })
  role!: UserRole;

  @ManyToOne(
    () => Company,
    company => company.users,
    { nullable: true },
  )
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @ManyToOne(() => Plan, {
    nullable: true,
  })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan | null;

  @ApiProperty({ enum: UserStatus })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ATIVO,
  })
  status!: UserStatus;

  @ApiProperty()
  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt!: Date;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  @ManyToOne(() => Cargo, { nullable: true })
  @JoinColumn({ name: 'cargo_id' })
  cargo?: Cargo | null;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}