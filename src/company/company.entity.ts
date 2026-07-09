import { Plan } from 'src/entities/plan/plan.entity';
import { User } from 'src/entities/user/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum CompanyStatus {
  ATIVA = 'ATIVA',
  BLOQUEADA = 'BLOQUEADA',
}

@Entity('company')
export class Company {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  domain!: string;

  @Column({ nullable: true })
  logoUrl?: string;

  // Dados da empresa
  @Column({ nullable: true, unique: true })
  cnpj?: string;

  @Column({ nullable: true })
  corporateName?: string; // Razão social

  @Column({ nullable: true })
  tradeName?: string; // Nome fantasia

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true, length: 2 })
  state?: string;

  @Column({ nullable: true })
  zipCode?: string;

  @Column({ nullable: true })
  companyEmail?: string;

  @Column({ nullable: true })
  landlinePhone?: string;

  @Column({ nullable: true })
  whatsapp?: string;

  @Column({ nullable: true })
  representativeCpf?: string;

  @Column({ nullable: true })
  representativeName?: string;

  // Contato responsável
  @Column({ nullable: true })
  contactName?: string;

  @Column({ nullable: true })
  contactCpf?: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ nullable: true })
  contactWhatsapp?: string;

  @Column({ nullable: true })
  aneps?: string;

  // White Label §13
  @Column({ nullable: true, unique: true })
  subdomain?: string; // ex: 'empresa' -> empresa.verytasdados.com.br

  @Column({ nullable: true, unique: true })
  customDomain?: string; // ex: 'www.empresa.com.br'

  @Column({ nullable: true })
  brandPrimaryColor?: string;

  @Column({ nullable: true })
  brandSecondaryColor?: string;

  @Column({
    type: 'enum',
    enum: CompanyStatus,
    default: CompanyStatus.ATIVA,
  })
  status!: CompanyStatus;

  @OneToMany(() => User, (user) => user.company)
  users!: User[];

  @ManyToOne(() => Plan, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan | null;

  @ManyToOne(() => Company, (c) => c.filiais, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_company_id' })
  parentCompany?: Company | null;

  @OneToMany(() => Company, (c) => c.parentCompany)
  filiais?: Company[];

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}