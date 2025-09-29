import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('notifications')
@Index(['userId', 'type'])
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: [
      'TicketCreated',
      'TicketAssigned',
      'TicketStatusChanged',
      'TicketCompleted',
      'QuoteCreated',
      'QuoteApproved',
      'QuoteDeclined',
      'OTPRequested',
      'MediaUploaded',
      'MessageReceived'
    ]
  })
  type: string;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['Push', 'Email', 'InApp']
  })
  channel: string;

  @Column({ default: 'Pending' })
  status: string;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}