# Story: Communication Suite

**Story ID**: Story 7
**Branch**: `feature/story-7`
**Dependencies**: Story 6
**Parallel-safe**: false
**Module**: Communication features
**Epic**: Communications & Go-to-Market

## User Stories

### Story 7.1: Integrated Ticket Chat
**As a** user involved in a ticket, **I want** to send and receive messages within that ticket, **so that** I can communicate in real-time without leaving the app.

**Acceptance Criteria:**
1. Each ticket has a dedicated chat thread
2. Users associated with the ticket can view the history and send new messages
3. Sending a message triggers a notification to other participants
4. Messages support text, images, and file attachments
5. Real-time message delivery using WebSockets
6. Message history is persistent and searchable

### Story 7.2: Implement Full Email Notification System
**As a** user, **I want** to receive email notifications for all key ticket events, **so that** I stay informed.

**Acceptance Criteria:**
1. An email notification service is integrated
2. Email templates are created for all critical events
3. Emails are sent reliably upon event triggers
4. Users can manage their email notification preferences
5. Email tracking and delivery status monitoring
6. Support for rich HTML email templates

## Technical Implementation Details

### Database Schema Updates

```sql
-- Messages Table
CREATE TABLE "messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
    "sender_id" TEXT NOT NULL REFERENCES "users"("id"),
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Text' CHECK (
        "type" IN ('Text', 'Image', 'File', 'System')
    ),
    "media_url" TEXT,
    "file_name" TEXT,
    "file_size" BIGINT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Message Participants Table (for tracking read status)
CREATE TABLE "message_participants" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
    "user_id" TEXT NOT NULL REFERENCES "users"("id"),
    "last_read_at" TIMESTAMP WITH TIME ZONE,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("ticket_id", "user_id")
);

-- Email Templates Table
CREATE TABLE "email_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL UNIQUE,
    "subject" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "text_content" TEXT,
    "variables" TEXT[], -- Array of template variables
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email Logs Table
CREATE TABLE "email_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "template_id" UUID REFERENCES "email_templates"("id"),
    "recipient_email" TEXT NOT NULL,
    "recipient_id" TEXT REFERENCES "users"("id"),
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending' CHECK (
        "status" IN ('Pending', 'Sent', 'Delivered', 'Bounced', 'Failed')
    ),
    "sent_at" TIMESTAMP WITH TIME ZONE,
    "delivered_at" TIMESTAMP WITH TIME ZONE,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification Preferences Table
CREATE TABLE "notification_preferences" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "chat_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_events" TEXT[] DEFAULT ARRAY[
        'TicketCreated', 'TicketAssigned', 'TicketStatusChanged', 'TicketCompleted',
        'QuoteCreated', 'QuoteApproved', 'QuoteDeclined', 'MessageReceived',
        'OTPRequested', 'InvoiceGenerated', 'PaymentReceived'
    ],
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_messages_ticket_id ON "messages"("ticket_id");
CREATE INDEX idx_messages_sender_id ON "messages"("sender_id");
CREATE INDEX idx_messages_created_at ON "messages"("created_at");
CREATE INDEX idx_message_participants_ticket_user ON "message_participants"("ticket_id", "user_id");
CREATE INDEX idx_email_logs_status ON "email_logs"("status");
CREATE INDEX idx_email_logs_recipient ON "email_logs"("recipient_email");
CREATE INDEX idx_email_logs_created_at ON "email_logs"("created_at");
```

### Chat Service with WebSocket Support

```typescript
// packages/api/src/services/chat.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Message, MessageParticipant } from '../entities';
import { WebSocketGateway } from '../gateways/chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageParticipant)
    private readonly participantRepository: Repository<MessageParticipant>,
    private readonly webSocketGateway: WebSocketGateway,
    private readonly notificationService: NotificationService,
  ) {}

  async sendMessage(
    ticketId: string,
    senderId: string,
    content: string,
    type: 'Text' | 'Image' | 'File' = 'Text',
    mediaUrl?: string,
    fileName?: string,
    fileSize?: number,
  ): Promise<Message> {
    // Check if user is a participant in the ticket
    const isParticipant = await this.participantRepository.findOne({
      where: { ticketId, userId: senderId },
    });

    if (!isParticipant) {
      throw new Error('User is not a participant in this ticket');
    }

    const message = this.messageRepository.create({
      ticketId,
      senderId,
      content,
      type,
      mediaUrl,
      fileName,
      fileSize,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Get all participants except sender
    const participants = await this.participantRepository.find({
      where: { ticketId, userId: senderId, isMuted: false },
    });

    // Send real-time message via WebSocket
    this.webSocketGateway.sendMessageToTicket(ticketId, {
      type: 'message',
      data: savedMessage,
    });

    // Send push notifications to other participants
    for (const participant of participants) {
      if (participant.userId !== senderId) {
        await this.notificationService.sendNotification({
          type: 'MessageReceived',
          title: 'New Message',
          message: `New message in ticket chat`,
          recipientId: participant.userId,
          data: {
            ticketId,
            messageId: savedMessage.id,
            messagePreview: content.substring(0, 100),
          },
        });
      }
    }

    return savedMessage;
  }

  async getMessagesByTicket(
    ticketId: string,
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Message[]> {
    // Check if user is a participant
    const isParticipant = await this.participantRepository.findOne({
      where: { ticketId, userId },
    });

    if (!isParticipant) {
      throw new Error('User is not a participant in this ticket');
    }

    const messages = await this.messageRepository.find({
      where: { ticketId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    // Mark messages as read
    await this.markMessagesAsRead(ticketId, userId);

    return messages.reverse();
  }

  async markMessagesAsRead(ticketId: string, userId: string): Promise<void> {
    await this.messageRepository.update(
      {
        ticketId,
        senderId: userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    // Update participant's last read timestamp
    await this.participantRepository.update(
      { ticketId, userId },
      { lastReadAt: new Date() },
    );
  }

  async getUnreadCount(userId: string): Promise<{ [ticketId: string]: number }> {
    const result = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.ticket_id', 'ticketId')
      .addSelect('COUNT(*)', 'unreadCount')
      .leftJoin(
        'message_participants',
        'participant',
        'participant.ticket_id = message.ticket_id AND participant.user_id = :userId',
        { userId },
      )
      .where('message.sender_id != :userId', { userId })
      .andWhere('message.is_read = false')
      .andWhere(
        '(participant.last_read_at IS NULL OR message.created_at > participant.last_read_at)',
      )
      .groupBy('message.ticket_id')
      .getRawMany();

    return result.reduce((acc, row) => {
      acc[row.ticketId] = parseInt(row.unreadCount);
      return acc;
    }, {});
  }

  async addParticipantToTicket(ticketId: string, userId: string): Promise<void> {
    const existingParticipant = await this.participantRepository.findOne({
      where: { ticketId, userId },
    });

    if (!existingParticipant) {
      const participant = this.participantRepository.create({
        ticketId,
        userId,
      });
      await this.participantRepository.save(participant);

      // Send system message
      await this.sendMessage(
        ticketId,
        'system',
        `${userId} joined the chat`,
        'System',
      );
    }
  }

  async removeParticipantFromTicket(ticketId: string, userId: string): Promise<void> {
    await this.participantRepository.delete({ ticketId, userId });

    // Send system message
    await this.sendMessage(
      ticketId,
      'system',
      `${userId} left the chat`,
      'System',
    );
  }

  async searchMessages(
    ticketId: string,
    userId: string,
    query: string,
    limit = 20,
  ): Promise<Message[]> {
    // Check if user is a participant
    const isParticipant = await this.participantRepository.findOne({
      where: { ticketId, userId },
    });

    if (!isParticipant) {
      throw new Error('User is not a participant in this ticket');
    }

    return this.messageRepository
      .createQueryBuilder('message')
      .where('message.ticket_id = :ticketId', { ticketId })
      .andWhere('message.content ILIKE :query', { query: `%${query}%` })
      .orderBy('message.created_at', 'DESC')
      .take(limit)
      .getMany();
  }
}
```

### WebSocket Gateway for Real-time Chat

```typescript
// packages/api/src/gateways/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../services/chat.service';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly connectedClients = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.connectedClients.set(userId, client.id);

      // Join user to their ticket rooms
      const userTickets = await this.chatService.getUserTickets(userId);
      userTickets.forEach((ticketId) => {
        client.join(`ticket:${ticketId}`);
      });

      console.log(`User ${userId} connected`);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Remove from connected clients
    for (const [userId, socketId] of this.connectedClients.entries()) {
      if (socketId === client.id) {
        this.connectedClients.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  }

  @SubscribeMessage('joinTicket')
  async handleJoinTicket(client: Socket, ticketId: string) {
    const userId = this.getUserIdFromClient(client);
    if (!userId) return;

    // Check if user has access to this ticket
    const hasAccess = await this.chatService.hasTicketAccess(userId, ticketId);
    if (!hasAccess) {
      client.emit('error', { message: 'Access denied' });
      return;
    }

    client.join(`ticket:${ticketId}`);
    console.log(`User ${userId} joined ticket ${ticketId}`);

    // Send recent messages
    const messages = await this.chatService.getMessagesByTicket(ticketId, userId, 20);
    client.emit('messages', { ticketId, messages });
  }

  @SubscribeMessage('leaveTicket')
  handleLeaveTicket(client: Socket, ticketId: string) {
    client.leave(`ticket:${ticketId}`);
    console.log(`User left ticket ${ticketId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, data: {
    ticketId: string;
    content: string;
    type?: 'Text' | 'Image' | 'File';
    mediaUrl?: string;
    fileName?: string;
    fileSize?: number;
  }) {
    const userId = this.getUserIdFromClient(client);
    if (!userId) return;

    try {
      const message = await this.chatService.sendMessage(
        data.ticketId,
        userId,
        data.content,
        data.type || 'Text',
        data.mediaUrl,
        data.fileName,
        data.fileSize,
      );

      // Broadcast to all clients in the ticket room
      this.server.to(`ticket:${data.ticketId}`).emit('newMessage', {
        ticketId: data.ticketId,
        message,
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(client: Socket, ticketId: string) {
    const userId = this.getUserIdFromClient(client);
    if (!userId) return;

    await this.chatService.markMessagesAsRead(ticketId, userId);

    // Notify other participants
    this.server.to(`ticket:${ticketId}`).emit('messagesRead', {
      ticketId,
      userId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, data: { ticketId: string; isTyping: boolean }) {
    const userId = this.getUserIdFromClient(client);
    if (!userId) return;

    client.to(`ticket:${data.ticketId}`).emit('userTyping', {
      ticketId: data.ticketId,
      userId,
      isTyping: data.isTyping,
    });
  }

  // Helper methods
  private getUserIdFromClient(client: Socket): string | null {
    for (const [userId, socketId] of this.connectedClients.entries()) {
      if (socketId === client.id) {
        return userId;
      }
    }
    return null;
  }

  // Public method for sending messages from other services
  sendMessageToTicket(ticketId: string, data: any) {
    this.server.to(`ticket:${ticketId}`).emit('ticketUpdate', data);
  }
}
```

### Enhanced Email Service with Templates

```typescript
// packages/api/src/services/email-template.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailTemplate } from '../entities/email-template.entity';
import * as handlebars from 'handlebars';

@Injectable()
export class EmailTemplateService {
  private readonly templateCache = new Map<string, handlebars.TemplateDelegate>();

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly emailTemplateRepository: Repository<EmailTemplate>,
  ) {
    this.registerHelpers();
  }

  async getTemplate(name: string): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOne({
      where: { name, isActive: true },
    });

    if (!template) {
      throw new Error(`Email template '${name}' not found`);
    }

    return template;
  }

  async renderTemplate(name: string, context: Record<string, any>): Promise<{
    subject: string;
    html: string;
    text: string;
  }> {
    const template = await this.getTemplate(name);

    // Validate required variables
    const missingVariables = template.variables.filter(
      variable => !(variable in context),
    );

    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
    }

    // Get or compile template
    let htmlTemplate = this.templateCache.get(`${name}_html`);
    if (!htmlTemplate) {
      htmlTemplate = handlebars.compile(template.htmlContent);
      this.templateCache.set(`${name}_html`, htmlTemplate);
    }

    let textTemplate = this.templateCache.get(`${name}_text`);
    if (!textTemplate && template.textContent) {
      textTemplate = handlebars.compile(template.textContent);
      this.templateCache.set(`${name}_text`, textTemplate);
    }

    // Render templates
    const html = htmlTemplate(context);
    const text = textTemplate ? textTemplate(context) : '';
    const subject = handlebars.compile(template.subject)(context);

    return { subject, html, text };
  }

  async createTemplate(templateData: {
    name: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    variables: string[];
  }): Promise<EmailTemplate> {
    const template = this.emailTemplateRepository.create(templateData);
    return this.emailTemplateRepository.save(template);
  }

  async updateTemplate(
    name: string,
    updates: Partial<{
      subject: string;
      htmlContent: string;
      textContent: string;
      variables: string[];
      isActive: boolean;
    }>,
  ): Promise<EmailTemplate> {
    await this.emailTemplateRepository.update({ name }, updates);
    return this.getTemplate(name);
  }

  async listTemplates(): Promise<EmailTemplate[]> {
    return this.emailTemplateRepository.find({
      order: { name: 'ASC' },
    });
  }

  async deleteTemplate(name: string): Promise<void> {
    await this.emailTemplateRepository.delete({ name });
    this.templateCache.delete(`${name}_html`);
    this.templateCache.delete(`${name}_text`);
  }

  private registerHelpers(): void {
    // Format date helper
    handlebars.registerHelper('formatDate', (date: string | Date, format: string) => {
      const d = new Date(date);
      return d.toLocaleDateString();
    });

    // Format currency helper
    handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'AED') => {
      return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // Equals helper
    handlebars.registerHelper('eq', (a: any, b: any) => a === b);

    // Not equals helper
    handlebars.registerHelper('ne', (a: any, b: any) => a !== b);

    // JSON stringify helper
    handlebars.registerHelper('json', (context: any) => {
      return JSON.stringify(context);
    });
  }
}
```

### Enhanced Email Service with Template Support

```typescript
// packages/api/src/services/email.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailLog } from '../entities/email-log.entity';
import { EmailTemplateService } from './email-template.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import * as nodemailer from 'nodemailer';
import * as AWS from 'aws-sdk';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly ses: AWS.SES;

  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {
    // Configure transporter based on environment
    if (process.env.EMAIL_PROVIDER === 'ses') {
      this.ses = new AWS.SES({
        region: process.env.AWS_REGION || 'me-south-1',
      });
      this.transporter = nodemailer.createTransport({
        SES: { ses: this.ses, aws: AWS },
      });
    } else {
      // Fallback to SMTP
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendEmail(
    to: string,
    data: {
      templateName: string;
      context: Record<string, any>;
      from?: string;
      attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType?: string;
      }>;
    },
  ): Promise<EmailLog> {
    try {
      // Check user preferences
      const preferences = await this.notificationPreferencesService.getPreferences(to);

      if (!preferences.emailEnabled) {
        throw new Error('Email notifications disabled for this user');
      }

      const template = await this.emailTemplateService.renderTemplate(
        data.templateName,
        data.context,
      );

      const mailOptions: nodemailer.SendMailOptions = {
        from: data.from || process.env.EMAIL_FROM,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: data.attachments,
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      // Log successful send
      const emailLog = this.emailLogRepository.create({
        templateName: data.templateName,
        recipientEmail: to,
        subject: template.subject,
        content: template.html,
        status: 'Sent',
        sentAt: new Date(),
        metadata: {
          messageId: result.messageId,
          templateContext: data.context,
        },
      });

      const savedLog = await this.emailLogRepository.save(emailLog);

      // Track delivery (for SES)
      if (process.env.EMAIL_PROVIDER === 'ses') {
        this.trackDelivery(result.messageId, savedLog.id);
      }

      return savedLog;
    } catch (error) {
      // Log failed send
      const emailLog = this.emailLogRepository.create({
        templateName: data.templateName,
        recipientEmail: to,
        subject: data.templateName,
        content: JSON.stringify(data.context),
        status: 'Failed',
        errorMessage: error.message,
        metadata: {
          templateContext: data.context,
        },
      });

      await this.emailLogRepository.save(emailLog);
      throw error;
    }
  }

  async sendBulkEmails(
    recipients: Array<{
      email: string;
      userId?: string;
      context: Record<string, any>;
    }>,
    templateName: string,
    options: {
      from?: string;
      attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType?: string;
      }>;
    } = {},
  ): Promise<EmailLog[]> {
    const logs: EmailLog[] = [];

    for (const recipient of recipients) {
      try {
        const log = await this.sendEmail(recipient.email, {
          templateName,
          context: recipient.context,
          from: options.from,
          attachments: options.attachments,
        });

        logs.push(log);
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
      }
    }

    return logs;
  }

  async getDeliveryStats(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    total: number;
    sent: number;
    delivered: number;
    bounced: number;
    failed: number;
  }> {
    const logs = await this.emailLogRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const stats = {
      total: logs.length,
      sent: logs.filter(log => log.status === 'Sent').length,
      delivered: logs.filter(log => log.status === 'Delivered').length,
      bounced: logs.filter(log => log.status === 'Bounced').length,
      failed: logs.filter(log => log.status === 'Failed').length,
    };

    return stats;
  }

  private async trackDelivery(messageId: string, emailLogId: string): Promise<void> {
    // Implement SES notification tracking
    // This would typically involve setting up SNS notifications for SES events
  }
}
```

### Chat UI Components

```tsx
// apps/web/src/components/chat/chat-interface.tsx
interface ChatInterfaceProps {
  ticketId: string;
  currentUserId: string;
}

export function ChatInterface({ ticketId, currentUserId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const socket = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load initial messages
    loadMessages();

    // Join ticket room
    if (socket) {
      socket.emit('joinTicket', ticketId);

      // Listen for new messages
      socket.on('newMessage', (data) => {
        if (data.ticketId === ticketId) {
          setMessages(prev => [...prev, data.message]);
        }
      });

      // Listen for typing indicators
      socket.on('userTyping', (data) => {
        if (data.ticketId === ticketId && data.userId !== currentUserId) {
          setTypingUsers(prev => {
            const users = prev.filter(id => id !== data.userId);
            if (data.isTyping) {
              return [...users, data.userId];
            }
            return users;
          });
        }
      });

      // Listen for read receipts
      socket.on('messagesRead', (data) => {
        if (data.ticketId === ticketId) {
          // Update message read status
          setMessages(prev =>
            prev.map(msg =>
              msg.senderId !== currentUserId && !msg.isRead
                ? { ...msg, isRead: true, readAt: new Date() }
                : msg,
            ),
          );
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('leaveTicket', ticketId);
        socket.off('newMessage');
        socket.off('userTyping');
        socket.off('messagesRead');
      }
    };
  }, [ticketId, currentUserId, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await chatApi.getMessages(ticketId);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await chatApi.sendMessage(ticketId, {
        content: newMessage.trim(),
        type: 'Text',
      });

      setNewMessage('');

      // Send typing stopped
      if (socket) {
        socket.emit('typing', { ticketId, isTyping: false });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    if (socket) {
      socket.emit('typing', { ticketId, isTyping: value.length > 0 });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className=\"flex flex-col h-full\">
      {/* Messages */}
      <div className=\"flex-1 overflow-y-auto p-4 space-y-4\">
        {isLoading ? (
          <div className=\"flex justify-center\">
            <Loader2 className=\"h-6 w-6 animate-spin\" />
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUserId}
            />
          ))
        )}
        {typingUsers.length > 0 && (
          <div className=\"text-sm text-gray-500 italic\">
            {typingUsers.length === 1
              ? 'Someone is typing...'
              : `${typingUsers.length} people are typing...`}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className=\"border-t p-4\">
        <div className=\"flex gap-2\">
          <Textarea
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder=\"Type a message...\"
            className=\"flex-1 resize-none\"
            rows={1}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            size=\"icon\"
          >
            <Send className=\"h-4 w-4\" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-900'
        }`}
      >
        {message.type === 'Image' && message.mediaUrl && (
          <div className=\"mb-2\">
            <img
              src={message.mediaUrl}
              alt=\"Shared image\"
              className=\"max-w-full rounded\"
            />
          </div>
        )}
        {message.type === 'File' && (
          <div className=\"mb-2\">
            <a
              href={message.mediaUrl}
              download={message.fileName}
              className=\"flex items-center gap-2 text-blue-500 hover:underline\"
            >
              <Paperclip className=\"h-4 w-4\" />
              {message.fileName}
            </a>
          </div>
        )}
        <p className=\"text-sm whitespace-pre-wrap\">{message.content}</p>
        <p className=\"text-xs opacity-70 mt-1\">
          {format(new Date(message.createdAt), 'HH:mm')}
        </p>
      </div>
    </div>
  );
}
```

### Mobile Chat UI

```dart
// apps/mobile/lib/features/chat/presentation/chat_page.dart
class ChatPage extends ConsumerStatefulWidget {
  final String ticketId;

  const ChatPage({super.key, required this.ticketId});

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final Socket _socket = io.io();

  List<Message> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _initializeChat();
  }

  Future<void> _initializeChat() async {
    // Load messages
    final messages = await ref.read(chatRepositoryProvider).getMessages(widget.ticketId);
    setState(() {
      _messages = messages;
      _isLoading = false;
    });

    // Connect to WebSocket
    _socket.connect();
    _socket.emit('joinTicket', widget.ticketId);

    _socket.on('newMessage', (data) {
      if (data['ticketId'] == widget.ticketId) {
        setState(() {
          _messages.add(Message.fromJson(data['message']));
        });
        _scrollToBottom();
      }
    });

    _socket.on('userTyping', (data) {
      // Handle typing indicators
    });
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;

    setState(() {
      _isSending = true;
    });

    try {
      final message = await ref.read(chatRepositoryProvider).sendMessage(
        widget.ticketId,
        _messageController.text.trim(),
      );

      setState(() {
        _messages.add(message);
        _messageController.clear();
        _isSending = false;
      });

      _scrollToBottom();
    } catch (e) {
      setState(() {
        _isSending = false;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info),
            onPressed: () {
              // Show ticket info
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      final isOwn = message.senderId == ref.watch(authProvider).user?.id;

                      return MessageBubble(
                        message: message,
                        isOwn: isOwn,
                      );
                    },
                  ),
          ),
          _buildMessageInput(),
        ],
      ),
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        border: Border(top: BorderSide(color: Colors.grey[300]!)),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.attach_file),
            onPressed: _pickFile,
          ),
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: const InputDecoration(
                hintText: 'Type a message...',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              ),
              maxLines: 3,
              minLines: 1,
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: _isSending
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                    ),
                  )
                : const Icon(Icons.send),
            onPressed: _isSending ? null : _sendMessage,
          ),
        ],
      ),
    );
  }

  Future<void> _pickFile() async {
    final picker = FilePicker.platform;
    final result = await picker.pickFiles();

    if (result != null) {
      // Handle file upload
    }
  }
}

class MessageBubble extends StatelessWidget {
  final Message message;
  final bool isOwn;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isOwn,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: isOwn ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: isOwn ? Theme.of(context).primaryColor : Colors.grey[300],
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (message.type == 'Image' && message.mediaUrl != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        message.mediaUrl!,
                        width: 200,
                        height: 200,
                        fit: BoxFit.cover,
                      ),
                    ),
                  if (message.type == 'File')
                    Row(
                      children: [
                        const Icon(Icons.insert_drive_file),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            message.fileName ?? 'File',
                            style: TextStyle(
                              color: isOwn ? Colors.white : Colors.black,
                            ),
                          ),
                        ),
                      ],
                    ),
                  Text(
                    message.content,
                    style: TextStyle(
                      color: isOwn ? Colors.white : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    DateFormat('HH:mm').format(message.createdAt),
                    style: TextStyle(
                      fontSize: 12,
                      color: isOwn ? Colors.white70 : Colors.black54,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

## Success Metrics
- ✅ Real-time chat works within ticket contexts
- ✅ Messages are delivered instantly via WebSockets
- ✅ File and image sharing works in chat
- ✅ Email notifications are sent for all configured events
- ✅ Email templates are customizable and reusable
- ✅ Users can manage their notification preferences
- ✅ Message history is persistent and searchable
- ✅ Read receipts and typing indicators work correctly

## Notes for Developers
- Implement proper message encryption for sensitive communications
- Add support for message reactions and emojis
- Consider adding voice message support
- Implement proper message threading for organized conversations
- Add support for message pinning and bookmarks
- Consider adding AI-powered chatbots for common queries
- Implement proper message archiving and retention policies
- Add support for message translation for multi-language support
- Consider adding video calling capabilities
- Implement proper chat analytics and insights
- Add support for chat exports and reporting
- Consider adding integrations with external communication platforms
- Implement proper spam and abuse detection
- Add support for rich text formatting and markdown
- Consider adding chat widgets for embedded communication
- Implement proper backup and recovery for chat data
- Add support for offline messaging and synchronization
- Consider adding automated chat summaries and insights