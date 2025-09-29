export type NotificationType =
  | 'TicketCreated'
  | 'TicketAssigned'
  | 'TicketStatusChanged'
  | 'TicketCompleted'
  | 'QuoteCreated'
  | 'QuoteApproved'
  | 'QuoteDeclined'
  | 'OTPRequested'
  | 'MediaUploaded'
  | 'MessageReceived';

export type NotificationChannel = 'Push' | 'Email' | 'InApp';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  recipientId: string;
  ticketId?: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDeliveryLog {
  id: string;
  userId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  status: string;
  errorMessage?: string;
  createdAt: Date;
}