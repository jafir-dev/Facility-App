import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @Column({ name: 'push_enabled', default: true })
  pushEnabled: boolean;

  @Column({ name: 'email_enabled', default: true })
  emailEnabled: boolean;

  @Column({ name: 'in_app_enabled', default: true })
  inAppEnabled: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}