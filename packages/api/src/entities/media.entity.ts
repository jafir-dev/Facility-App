import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { MediaContext, MediaType } from '../types/media';

@Entity('media')
export class MediaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mimetype: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({
    type: 'enum',
    enum: MediaType,
  })
  type: MediaType;

  @Column({
    type: 'enum',
    enum: MediaContext,
  })
  context: MediaContext;

  @Column({ nullable: true })
  @Index()
  ticketId: string;

  @Column()
  @Index()
  uploadedBy: string;

  @Column({ type: 'timestamp with time zone' })
  uploadedAt: Date;

  @Column({ nullable: true })
  thumbnailPath: string;

  @Column({ nullable: true })
  compressedPath: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}