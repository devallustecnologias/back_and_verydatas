import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('menu')
export class Menu {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty()
  @Column()
  name!: string;

  @ApiProperty()
  @Column({ unique: true })
  key!: string;

  @ApiProperty({ type: () => Menu, nullable: true })
  @ManyToOne(() => Menu, (menu) => menu.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: Menu | null;

  @ApiProperty({ type: () => [Menu] })
  @OneToMany(() => Menu, (menu) => menu.parent)
  children!: Menu[];

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  order!: number;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
