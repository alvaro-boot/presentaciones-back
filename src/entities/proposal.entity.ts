import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProposalStatus } from '../common/enums';
import { Asset } from './asset.entity';
import { Slide } from './slide.entity';
import { User } from './user.entity';

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column({ name: 'client_name' })
  clientName: string;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: ProposalStatus, default: ProposalStatus.DRAFT })
  status: ProposalStatus;

  @Column({ name: 'is_template', default: false })
  isTemplate: boolean;

  @Column({ name: 'template_id', type: 'varchar', length: 36, nullable: true })
  templateId: string | null;

  @ManyToOne(() => Proposal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template: Proposal | null;

  @Column({ name: 'map_config', type: 'json', nullable: true })
  mapConfig: Record<string, unknown> | null;

  @Column({ name: 'theme_config', type: 'json', nullable: true })
  themeConfig: Record<string, string> | null;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, (u) => u.proposals, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @OneToMany(() => Slide, (s) => s.proposal, { cascade: true })
  slides: Slide[];

  @OneToMany(() => Asset, (a) => a.proposal)
  assets: Asset[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
