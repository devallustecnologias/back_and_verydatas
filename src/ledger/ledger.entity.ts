import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { Wallet } from "./walled.entity";

export enum LedgerType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}
export enum LedgerOrigin {
  TRANSFER = 'TRANSFER',
  CONSUMO = 'CONSUMO',
  AJUSTE = 'AJUSTE',
}

@Entity()
export class Ledger {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('int')
  amount!: number;

  @Column({ type: 'enum', enum: LedgerType })
  type!: LedgerType;

  @Column()
  description!: string;

  @Column({ type: 'enum', enum: LedgerOrigin, nullable: true })
  origin?: LedgerOrigin;

  @Column({ nullable: true })
  referenceId?: string;

  @ManyToOne(() => Wallet)
  wallet!: Wallet;

  @CreateDateColumn()
  createdAt!: Date;
}