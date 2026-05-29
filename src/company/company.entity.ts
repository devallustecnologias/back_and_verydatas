import { Plan } from 'src/entities/plan/plan.entity';
import { User } from 'src/entities/user/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

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

  @Column({ nullable: true })
  slogan?: string;

  @Column({ nullable: true, default: '#1F2937' })
  primaryColor?: string;

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

  @OneToMany(() => User, (user) => user.company)
  users!: User[];

  @ManyToOne(() => Plan, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan | null;
}