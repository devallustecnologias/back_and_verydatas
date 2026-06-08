import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../permission/permission.entity';

@Entity()
export class Plan {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty()
  @Column({ unique: true })
  name!: string;

  @ApiProperty({ type: () => [Permission] })
  @ManyToMany(() => Permission)
  @JoinTable()
  permissions!: Permission[];

  @ApiProperty()
  @Column({ default: false })
  isSystem!: boolean; 
}