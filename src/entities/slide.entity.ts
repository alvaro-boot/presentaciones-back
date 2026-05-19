import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Proposal } from './proposal.entity';

@Entity('slides')
export class Slide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proposal_id' })
  proposalId: string;

  @ManyToOne(() => Proposal, (p) => p.slides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proposal_id' })
  proposal: Proposal;

  @Column({ type: 'int' })
  order: number;

  @Column()
  key: string;

  @Column()
  title: string;

  @Column({ type: 'longtext' })
  html: string;

  @Column({ type: 'text', nullable: true })
  css: string | null;

  @Column({ name: 'grapes_data', type: 'json', nullable: true })
  grapesData: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  scripts: Record<string, unknown> | null;

  @Column({ default: true })
  enabled: boolean;
}
