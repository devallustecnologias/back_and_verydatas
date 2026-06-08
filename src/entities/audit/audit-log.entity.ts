import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Ações registradas no log de auditoria (§12 do documento).
 * 'CONSUMO' reservado para uso futuro (módulo de consultas §7).
 */
export const AUDIT_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'USER_CHANGE',
  'PERMISSION_CHANGE',
  'CREDIT_ADD',
  'CREDIT_ESTORNO',
  'CONSUMO',
] as const;

export type AuditAction = typeof AUDIT_ACTIONS[number] | string;

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Ação: LOGIN, LOGOUT, USER_CHANGE, PERMISSION_CHANGE, CREDIT_ADD, CREDIT_ESTORNO, CONSUMO, ou method+path para mutações genéricas */
  @Column({ type: 'varchar', length: 128 })
  action!: string;

  /** UID do usuário autenticado (nullable: rotas públicas ou falha de autenticação) */
  @Column({ type: 'varchar', length: 191, nullable: true })
  userId!: string | null;

  /** Nome do usuário no momento do registro */
  @Column({ type: 'varchar', length: 191, nullable: true })
  username!: string | null;

  /** ID da empresa (tenant) — null para MASTER sem empresa */
  @Column({ type: 'int', nullable: true })
  companyId!: number | null;

  /** IP de origem da requisição */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  /** Detalhe livre: rota, resumo da operação, etc. */
  @Column({ type: 'text', nullable: true })
  detail!: string | null;

  /** Data e hora do registro (= Data + Hora do §12) */
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
