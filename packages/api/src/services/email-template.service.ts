import { NotificationPayload, NotificationType } from '@facility-app/shared-types';

export class EmailTemplateService {
  private readonly templates = {
    TicketCreated: `
      <h2>New Maintenance Request</h2>
      <p>A new maintenance ticket has been created for your property.</p>
      <p><strong>Ticket:</strong> {{ticket.title}}</p>
      <p><strong>Description:</strong> {{ticket.description}}</p>
      <p><strong>Priority:</strong> {{ticket.priority}}</p>
      <p>Please log in to view details and track progress.</p>
    `,
    TicketAssigned: `
      <h2>Ticket Assigned to You</h2>
      <p>You have been assigned a new maintenance ticket.</p>
      <p><strong>Ticket:</strong> {{ticket.title}}</p>
      <p><strong>Property:</strong> {{ticket.property}}</p>
      <p><strong>Priority:</strong> {{ticket.priority}}</p>
      <p>Please review and update the status accordingly.</p>
    `,
    TicketStatusChanged: `
      <h2>Ticket Status Updated</h2>
      <p>The status of your maintenance ticket has been updated.</p>
      <p><strong>Ticket:</strong> {{ticket.title}}</p>
      <p><strong>New Status:</strong> {{ticket.status}}</p>
      <p><strong>Updated By:</strong> {{ticket.updatedBy}}</p>
      <p>Please log in to view details.</p>
    `,
    TicketCompleted: `
      <h2>Maintenance Request Completed</h2>
      <p>Your maintenance request has been completed.</p>
      <p><strong>Ticket:</strong> {{ticket.title}}</p>
      <p><strong>Completed By:</strong> {{ticket.completedBy}}</p>
      <p><strong>Completion Date:</strong> {{ticket.completedAt}}</p>
      <p>Please log in to review the completed work.</p>
    `,
    QuoteCreated: `
      <h2>New Quote Created</h2>
      <p>A new quote has been created for your maintenance request.</p>
      <p><strong>Ticket:</strong> {{ticket.title}}</p>
      <p><strong>Quote Amount:</strong> {{quote.amount}}</p>
      <p><strong>Valid Until:</strong> {{quote.validUntil}}</p>
      <p>Please log in to review and approve the quote.</p>
    `,
    QuoteApproved: `
      <h2>Quote Approved</h2>
      <p>Your quote has been approved by the client.</p>
      <p><strong>Ticket:</strong> {{ticket.title}}</p>
      <p><strong>Quote Amount:</strong> {{quote.amount}}</p>
      <p>You may now proceed with the work.</p>
    `,
    QuoteDeclined: `
      <h2>Quote Declined</h2>
      <p>Your quote has been declined by the client.</p>
      <p><strong>Ticket:</strong> {{ticket.title}}</p>
      <p><strong>Quote Amount:</strong> {{quote.amount}}</p>
      <p><strong>Reason:</strong> {{quote.declineReason}}</p>
      <p>Please review and provide a revised quote if necessary.</p>
    `,
    OTPRequested: `
      <h2>One-Time Password</h2>
      <p>Your one-time password for facility access is:</p>
      <h1 style="text-align: center; font-size: 32px; margin: 20px 0;">{{otp.code}}</h1>
      <p style="text-align: center; color: #666;">This code will expire in {{otp.expiresIn}} minutes.</p>
      <p>Please do not share this code with anyone.</p>
    `,
    MediaUploaded: `
      <h2>New Media Uploaded</h2>
      <p>New media has been uploaded to your maintenance ticket.</p>
      <p><strong>Ticket:</strong> {{ticket.title}}</p>
      <p><strong>Uploaded By:</strong> {{media.uploadedBy}}</p>
      <p><strong>File Type:</strong> {{media.fileType}}</p>
      <p>Please log in to view the uploaded media.</p>
    `,
    MessageReceived: `
      <h2>New Message Received</h2>
      <p>You have received a new message regarding your maintenance ticket.</p>
      <p><strong>Ticket:</strong> {{ticket.title}}</p>
      <p><strong>From:</strong> {{message.from}}</p>
      <p><strong>Message:</strong> {{message.content}}</p>
      <p>Please log in to respond to the message.</p>
    `,
    Default: `
      <h2>{{title}}</h2>
      <p>{{message}}</p>
      <p>Please log in to your account for more details.</p>
    `
  };

  async getTemplate(type: NotificationType): Promise<string> {
    return this.templates[type] || this.templates.Default;
  }

  render(template: string, payload: NotificationPayload): string {
    // Simple template rendering with sanitization
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(payload, path);
      return this.sanitizeValue(value) || match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private sanitizeValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    // For objects, convert to JSON and then sanitize
    if (typeof value === 'object') {
      return this.sanitizeString(JSON.stringify(value));
    }

    return this.sanitizeString(String(value));
  }

  private sanitizeString(str: string): string {
    if (!str) return '';

    return str
      // Remove potentially dangerous HTML/JavaScript
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      // Escape HTML entities
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      // Remove control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  validateTemplate(template: string): boolean {
    // Basic template validation
    const invalidPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<\?php/i,
      /<%/i,
      /\{\{.*\{\{/g, // Nested template variables
    ];

    return !invalidPatterns.some(pattern => pattern.test(template));
  }
}