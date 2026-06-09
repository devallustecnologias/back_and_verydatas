import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from 'src/company/company.entity';

export enum IpMode {
  ANY = 'ANY',
  RESTRICTED = 'RESTRICTED',
}

@Entity('company_access_control')
export class CompanyAccessControl {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Company, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  // Horário
  @Column({ default: false })
  scheduleEnabled!: boolean;

  // Ex: ['MON','TUE','WED','THU','FRI']
  @Column({ type: 'simple-array', nullable: true })
  allowedDays!: string[];

  @Column({ type: 'varchar', length: 5, nullable: true })
  startTime!: string | null; // 'HH:mm'

  @Column({ type: 'varchar', length: 5, nullable: true })
  endTime!: string | null; // 'HH:mm'

  @Column({ type: 'varchar', length: 64, default: 'America/Sao_Paulo' })
  timezone!: string;

  // IP
  @Column({
    type: 'enum',
    enum: IpMode,
    default: IpMode.ANY,
  })
  ipMode!: IpMode;

  @Column({ type: 'simple-array', nullable: true })
  allowedIps!: string[];

  // Permissões de menus/ações da Árvore de Permissões
  @Column({ type: 'json', nullable: true })
  menuPermissions: any | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
