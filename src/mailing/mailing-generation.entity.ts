import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Histórico de mailings gerados (tela "Mailings Gerados" — equivalente ao
 * listar_mailing do Consignado Rápido). Persiste os leads para permitir
 * re-download sem chamar (e cobrar) o provedor de novo.
 */
@Entity('mailing_generation')
export class MailingGeneration {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  companyId?: number | null;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  username?: string;

  /** Nome da campanha informado na geração. */
  @Column({ nullable: true })
  nome?: string;

  @Column({ default: false })
  comContrato!: boolean;

  /**
   * Origem da geração: 'mailing' (filtros do Consignado) | 'lote' (lista de
   * CPF/NB que o próprio usuário forneceu na Consulta Gerar Lote).
   */
  @Column({ default: 'mailing' })
  source!: string;

  @Column({ type: 'int', default: 0 })
  total!: number;

  /** processando | concluido | erro */
  @Column({ default: 'concluido' })
  status!: string;

  /** mensagem de erro da higienização, se houver */
  @Column({ type: 'varchar', length: 255, nullable: true })
  erro?: string | null;

  /** CSV higienizado final (formato Consignado, 46 colunas, separador ;). */
  @Column({ type: 'longtext', nullable: true })
  csv?: string | null;

  /** Filtros usados (JSON serializado). */
  @Column({ type: 'longtext', nullable: true })
  filtros?: string;

  /** Leads gerados (JSON serializado) — usado no re-download. */
  @Column({ type: 'longtext', nullable: true })
  leads?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
