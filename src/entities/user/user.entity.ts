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

  // §15 — Lockout: tentativas de login falhas
  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  // §15 — Lockout: bloqueio temporário até esta data
  @Column({ type: 'timestamp', nullable: true })
  lockedUntil?: Date | null;

  // §15 — Sessão única: ID da sessão ativa
  @Column({ type: 'varchar', nullable: true })
  currentSessionId?: string | null;

  // §15 — Inatividade: última atividade registrada
  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt?: Date | null;

  // Senha provisória gerada pelo sistema — usuário deve trocar no primeiro acesso
  @Column({ type: 'boolean', default: false })
  mustChangePassword!: boolean;

  // Refresh token ativo (hash sha256) — rotação a cada uso; null = sem refresh válido
  @Column({ type: 'varchar', length: 64, nullable: true })
  @Exclude()
  refreshTokenHash?: string | null;

  // 2FA TOTP: secret base32 (definido no setup, confirmado no enable)
  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  twoFactorSecret?: string | null;

  // 2FA TOTP habilitado (exigido no login)
  @Column({ type: 'boolean', default: false })
  twoFactorEnabled!: boolean;

  // 2FA: último timeStep TOTP aceito — rejeita replay do mesmo código na janela
  @Column({ type: 'int', nullable: true })
  @Exclude()
  twoFactorLastTimeStep?: number | null;

  // 2FA: hash do twoFactorToken pendente — uso único na 2ª etapa do login
  @Column({ type: 'varchar', length: 64, nullable: true })
  @Exclude()
  twoFactorTokenHash?: string | null;
}