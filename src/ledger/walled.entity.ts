import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['COMPANY', 'USER'] })
  type!: 'COMPANY' | 'USER';

  @Column({ nullable: true })
  companyId?: number;

  @Column({ nullable: true })
  userId?: string;
}