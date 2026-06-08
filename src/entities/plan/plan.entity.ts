import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../permission/permission.entity';
import { Menu } from '../menu/menu.entity';

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

  @ApiProperty({ type: () => [Menu] })
  @ManyToMany(() => Menu)
  @JoinTable()
  menus!: Menu[];

  @ApiProperty()
  @Column({ default: false })
  isSystem!: boolean;

  @ApiProperty({ default: 0 })
  @Column({ type: 'int', default: 0 })
  creditLimit!: number;

  @ApiProperty({ default: 0 })
  @Column({ type: 'int', default: 0 })
  userLimit!: number;
}