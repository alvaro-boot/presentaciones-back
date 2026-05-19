import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../common/enums';
import { Proposal } from './proposal.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EDITOR })
  role: UserRole;

  @OneToMany(() => Proposal, (p) => p.createdBy)
  proposals: Proposal[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
