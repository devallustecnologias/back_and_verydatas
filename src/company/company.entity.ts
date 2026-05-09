import { Plan } from 'src/entities/plan/plan.entity';
import { User } from 'src/entities/user/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

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

  @OneToMany(() => User, user => user.company)
  users!: User[];

  @ManyToOne(() => Plan, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan | null;
}