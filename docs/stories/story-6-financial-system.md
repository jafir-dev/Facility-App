# Story: Financial System & Invoicing

**Story ID**: Story 6
**Branch**: `feature/story-6`
**Dependencies**: Story 5
**Parallel-safe**: false
**Module**: Financial management
**Epic**: Management Roles & Financials

## User Story
**As a** Supervisor, **I want** the system to automatically generate an invoice when a paid job is completed, **so that** the billing process is streamlined.

## Acceptance Criteria
1. When a ticket with an approved quote is "Completed", an invoice is automatically generated
2. The invoice is a PDF with FMC branding, ticket details, and the final amount
3. The invoice is available for download and emailed to the Tenant
4. A receipt is available after payment is marked as received
5. Financial analytics and reporting for management
6. Payment tracking and status management
7. Tax calculation and compliance

## Technical Implementation Details

### Database Schema Updates

```sql
-- Invoices Table
CREATE TABLE "invoices" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL UNIQUE REFERENCES "tickets"("id"),
    "quote_id" UUID NOT NULL REFERENCES "quotes"("id"),
    "invoice_number" TEXT NOT NULL UNIQUE,
    "issue_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Issued' CHECK (
        "status" IN ('Issued', 'Sent', 'Paid', 'Overdue', 'Cancelled')
    ),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "notes" TEXT,
    "created_by" TEXT NOT NULL REFERENCES "users"("id"),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE "payments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL REFERENCES "invoices"("id"),
    "payment_method" TEXT NOT NULL CHECK (
        "payment_method" IN ('Cash', 'BankTransfer', 'CreditCard', 'Check', 'Online')
    ),
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "transaction_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Completed' CHECK (
        "status" IN ('Pending', 'Completed', 'Failed', 'Refunded')
    ),
    "notes" TEXT,
    "processed_by" TEXT REFERENCES "users"("id"),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Financial Settings Table
CREATE TABLE "financial_settings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "fmc_id" TEXT NOT NULL REFERENCES "users"("id"),
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
    "next_invoice_number" INTEGER NOT NULL DEFAULT 1,
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "bank_name" TEXT,
    "bank_account" TEXT,
    "company_address" TEXT,
    "company_phone" TEXT,
    "company_email" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update Quotes table to link to invoices
ALTER TABLE "quotes"
ADD COLUMN "invoice_id" UUID REFERENCES "invoices"("id");

-- Indexes
CREATE INDEX idx_invoices_ticket_id ON "invoices"("ticket_id");
CREATE INDEX idx_invoices_quote_id ON "invoices"("quote_id");
CREATE INDEX idx_invoices_status ON "invoices"("status");
CREATE INDEX idx_invoices_issue_date ON "invoices"("issue_date");
CREATE INDEX idx_payments_invoice_id ON "payments"("invoice_id");
CREATE INDEX idx_payments_status ON "payments"("status");
CREATE INDEX idx_financial_settings_fmc_id ON "financial_settings"("fmc_id");
```

### Financial Service

```typescript
// packages/api/src/services/financial.service.ts
@Injectable()
export class FinancialService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(FinancialSettings)
    private readonly financialSettingsRepository: Repository<FinancialSettings>,
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async generateInvoice(ticketId: string, generatedBy: string): Promise<Invoice> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['quote', 'property', 'tenant'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.quote) {
      throw new BadRequestException('Ticket does not have an approved quote');
    }

    if (ticket.quote.invoiceId) {
      throw new BadRequestException('Invoice already exists for this ticket');
    }

    // Get financial settings
    const settings = await this.getFinancialSettings();

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(settings);

    // Calculate totals
    const subtotal = ticket.quote.totalCost;
    const taxAmount = subtotal * (settings.taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    // Create invoice
    const invoice = this.invoiceRepository.create({
      ticketId,
      quoteId: ticket.quote.id,
      invoiceNumber,
      issueDate: new Date(),
      dueDate: this.calculateDueDate(settings.paymentTermsDays),
      subtotal,
      taxRate: settings.taxRate,
      taxAmount,
      totalAmount,
      currency: settings.currency,
      createdBy: generatedBy,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Update quote with invoice reference
    await this.quoteRepository.update(ticket.quote.id, {
      invoiceId: savedInvoice.id,
    });

    // Generate PDF invoice
    const pdfBuffer = await this.pdfService.generateInvoicePdf(savedInvoice, ticket, settings);

    // Save PDF to file storage
    const filename = `invoice_${invoiceNumber}.pdf`;
    const filePath = await this.fileUploadService.savePdf(pdfBuffer, filename, savedInvoice.id);

    // Send invoice email
    await this.emailService.sendInvoiceEmail(ticket.tenant.email, {
      ticket,
      invoice: savedInvoice,
      pdfBuffer,
      settings,
    });

    // Notify tenant
    await this.notificationService.sendNotification({
      type: 'InvoiceGenerated',
      title: 'Invoice Generated',
      message: `An invoice has been generated for your completed maintenance request: ${ticket.title}`,
      recipientId: ticket.tenantId,
      data: { ticketId: ticket.id, invoiceId: savedInvoice.id },
    });

    return savedInvoice;
  }

  async recordPayment(
    invoiceId: string,
    paymentData: CreatePaymentDto,
    processedBy: string,
  ): Promise<Payment> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['ticket', 'ticket.tenant'],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'Paid') {
      throw new BadRequestException('Invoice is already paid');
    }

    // Create payment record
    const payment = this.paymentRepository.create({
      invoiceId,
      ...paymentData,
      processedBy,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // Check if invoice is fully paid
    const totalPaid = await this.getTotalPaidForInvoice(invoiceId);
    if (totalPaid >= invoice.totalAmount) {
      await this.invoiceRepository.update(invoiceId, {
        status: 'Paid',
      });

      // Generate receipt
      const receipt = await this.generateReceipt(savedPayment);

      // Send receipt email
      await this.emailService.sendReceiptEmail(invoice.ticket.tenant.email, {
        invoice,
        payment: savedPayment,
        receipt,
      });
    }

    return savedPayment;
  }

  async getFinancialSummary(
    fmcId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialSummary> {
    const invoices = await this.invoiceRepository.find({
      where: {
        createdBy: fmcId,
        issueDate: Between(startDate, endDate),
      },
      relations: ['payments'],
    });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, inv) => {
      const paid = inv.payments?.reduce((s, p) => s + p.amount, 0) || 0;
      return sum + paid;
    }, 0);
    const totalOutstanding = totalInvoiced - totalPaid;

    const paidInvoices = invoices.filter(inv => inv.status === 'Paid').length;
    const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue').length;

    return {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      invoiceCount: invoices.length,
      paidInvoiceCount: paidInvoices,
      overdueInvoiceCount: overdueInvoices,
      averageInvoiceValue: invoices.length > 0 ? totalInvoiced / invoices.length : 0,
    };
  }

  async generateInvoiceReport(
    fmcId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    const invoices = await this.invoiceRepository.find({
      where: {
        createdBy: fmcId,
        issueDate: Between(startDate, endDate),
      },
      relations: ['ticket', 'ticket.property', 'ticket.tenant', 'quote'],
      order: { issueDate: 'ASC' },
    });

    const summary = await this.getFinancialSummary(fmcId, startDate, endDate);

    return this.pdfService.generateFinancialReport(invoices, summary, startDate, endDate);
  }

  private async getFinancialSettings(): Promise<FinancialSettings> {
    let settings = await this.financialSettingsRepository.findOne({
      order: { createdAt: 'DESC' },
    });

    if (!settings) {
      // Create default settings
      settings = this.financialSettingsRepository.create({
        fmcId: 'default',
        taxRate: 5,
        currency: 'AED',
        invoicePrefix: 'INV',
        nextInvoiceNumber: 1,
        paymentTermsDays: 30,
      });
      settings = await this.financialSettingsRepository.save(settings);
    }

    return settings;
  }

  private async generateInvoiceNumber(settings: FinancialSettings): Promise<string> {
    const invoiceNumber = `${settings.invoicePrefix}-${settings.nextInvoiceNumber.toString().padStart(6, '0')}`;

    // Update next invoice number
    await this.financialSettingsRepository.update(settings.id, {
      nextInvoiceNumber: settings.nextInvoiceNumber + 1,
    });

    return invoiceNumber;
  }

  private calculateDueDate(termsDays: number): Date {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + termsDays);
    return dueDate;
  }

  private async getTotalPaidForInvoice(invoiceId: string): Promise<number> {
    const payments = await this.paymentRepository.find({
      where: {
        invoiceId,
        status: 'Completed',
      },
    });

    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  @Cron('0 0 * * * *') // Daily at midnight
  async checkOverdueInvoices() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await this.invoiceRepository.find({
      where: {
        dueDate: LessThan(today),
        status: 'Issued',
      },
      relations: ['ticket', 'ticket.tenant'],
    });

    for (const invoice of overdueInvoices) {
      await this.invoiceRepository.update(invoice.id, {
        status: 'Overdue',
      });

      // Send overdue notification
      await this.notificationService.sendNotification({
        type: 'InvoiceOverdue',
        title: 'Invoice Overdue',
        message: `Your invoice ${invoice.invoiceNumber} is now overdue`,
        recipientId: invoice.ticket.tenantId,
        data: { invoiceId: invoice.id },
      });
    }
  }
}
```

### PDF Service for Invoice Generation

```typescript
// packages/api/src/services/pdf.service.ts
import * as fs from 'fs';
import * as path from 'path';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import * as PDFKit from 'pdfkit';

@Injectable()
export class PdfService {
  async generateInvoicePdf(invoice: Invoice, ticket: Ticket, settings: FinancialSettings): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFKit({
        size: 'A4',
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      this.addHeader(doc, settings);

      // Invoice details
      doc.moveDown();
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();

      // Invoice number and dates
      doc.fontSize(12);
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
      doc.text(`Issue Date: ${invoice.issueDate.toLocaleDateString()}`);
      doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`);
      doc.text(`Status: ${invoice.status}`);

      // Bill to and Ship to
      doc.moveDown();
      this.addAddressSection(doc, ticket, settings);

      // Invoice items table
      doc.moveDown();
      this.addInvoiceItemsTable(doc, ticket.quote);

      // Totals
      doc.moveDown();
      this.addTotalsSection(doc, invoice);

      // Payment information
      doc.moveDown();
      this.addPaymentInfo(doc, settings);

      // Notes
      if (invoice.notes) {
        doc.moveDown();
        doc.fontSize(10).text('Notes:');
        doc.text(invoice.notes);
      }

      // Footer
      this.addFooter(doc, settings);

      doc.end();
    });
  }

  private addHeader(doc: PDFKit.PDFDocument, settings: FinancialSettings) {
    doc.fontSize(16).text(settings.companyName || 'Facility Management Company', { align: 'center' });

    if (settings.companyAddress) {
      doc.fontSize(10).text(settings.companyAddress, { align: 'center' });
    }

    if (settings.companyPhone) {
      doc.text(`Phone: ${settings.companyPhone}`, { align: 'center' });
    }

    if (settings.companyEmail) {
      doc.text(`Email: ${settings.companyEmail}`, { align: 'center' });
    }
  }

  private addAddressSection(doc: PDFKit.PDFDocument, ticket: Ticket, settings: FinancialSettings) {
    // Bill To
    doc.text('Bill To:', { continued: true }).font('Helvetica-Bold');
    doc.text(`${ticket.tenant.firstName} ${ticket.tenant.lastName}`, { continued: false });
    doc.font('Helvetica');
    doc.text(ticket.property.address);

    // Ship To (same as Bill To for maintenance services)
    doc.moveDown();
    doc.text('Service Location:', { continued: true }).font('Helvetica-Bold');
    doc.text(ticket.property.address, { continued: false });
    doc.font('Helvetica');
  }

  private addInvoiceItemsTable(doc: PDFKit.PDFDocument, quote: Quote) {
    const tableTop = doc.y;
    const tableWidth = 500;
    const rowHeight = 20;
    const cellPadding = 5;

    // Table header
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop, { width: 250, align: 'left' });
    doc.text('Qty', 300, tableTop, { width: 50, align: 'center' });
    doc.text('Unit Price', 350, tableTop, { width: 75, align: 'right' });
    doc.text('Total', 425, tableTop, { width: 75, align: 'right' });

    // Draw header line
    doc.moveTo(50, tableTop + rowHeight)
       .lineTo(550, tableTop + rowHeight)
       .stroke();

    // Table rows
    doc.font('Helvetica');
    let currentY = tableTop + rowHeight + 10;

    quote.items.forEach((item) => {
      doc.text(item.description, 50, currentY, { width: 250, align: 'left' });
      doc.text(item.quantity.toString(), 300, currentY, { width: 50, align: 'center' });
      doc.text(`$${item.unitPrice.toFixed(2)}`, 350, currentY, { width: 75, align: 'right' });
      doc.text(`$${item.totalPrice.toFixed(2)}`, 425, currentY, { width: 75, align: 'right' });
      currentY += rowHeight;
    });

    // Draw bottom line
    doc.moveTo(50, currentY)
       .lineTo(550, currentY)
       .stroke();
  }

  private addTotalsSection(doc: PDFKit.PDFDocument, invoice: Invoice) {
    const totalsX = 350;
    let currentY = doc.y + 10;

    doc.font('Helvetica');
    doc.text('Subtotal:', totalsX, currentY, { width: 75, align: 'left' });
    doc.text(`$${invoice.subtotal.toFixed(2)}`, totalsX + 75, currentY, { width: 75, align: 'right' });
    currentY += 20;

    doc.text(`Tax (${invoice.taxRate}%):`, totalsX, currentY, { width: 75, align: 'left' });
    doc.text(`$${invoice.taxAmount.toFixed(2)}`, totalsX + 75, currentY, { width: 75, align: 'right' });
    currentY += 20;

    doc.font('Helvetica-Bold');
    doc.text('Total:', totalsX, currentY, { width: 75, align: 'left' });
    doc.text(`$${invoice.totalAmount.toFixed(2)}`, totalsX + 75, currentY, { width: 75, align: 'right' });
    currentY += 20;

    // Draw box around total
    doc.rect(totalsX - 10, currentY - 40, 160, 40).stroke();
  }

  private addPaymentInfo(doc: PDFKit.PDFDocument, settings: FinancialSettings) {
    doc.font('Helvetica-Bold');
    doc.text('Payment Information:');
    doc.font('Helvetica');

    if (settings.bankName) {
      doc.text(`Bank: ${settings.bankName}`);
    }
    if (settings.bankAccount) {
      doc.text(`Account: ${settings.bankAccount}`);
    }
    doc.text(`Payment Terms: ${settings.paymentTermsDays} days`);
  }

  private addFooter(doc: PDFKit.PDFDocument, settings: FinancialSettings) {
    doc.fontSize(8);
    doc.text('Thank you for your business!', { align: 'center' });

    if (settings.companyEmail) {
      doc.text(`For inquiries: ${settings.companyEmail}`, { align: 'center' });
    }
  }

  async generateFinancialReport(
    invoices: Invoice[],
    summary: FinancialSummary,
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFKit({
        size: 'A4',
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text('Financial Report', { align: 'center' });
      doc.fontSize(12).text(`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      // Summary section
      doc.fontSize(14).text('Summary', { continued: true }).font('Helvetica-Bold');
      doc.font('Helvetica');
      doc.moveDown();
      doc.text(`Total Invoiced: $${summary.totalInvoiced.toFixed(2)}`);
      doc.text(`Total Paid: $${summary.totalPaid.toFixed(2)}`);
      doc.text(`Total Outstanding: $${summary.totalOutstanding.toFixed(2)}`);
      doc.text(`Number of Invoices: ${summary.invoiceCount}`);
      doc.text(`Paid Invoices: ${summary.paidInvoiceCount}`);
      doc.text(`Overdue Invoices: ${summary.overdueInvoiceCount}`);
      doc.text(`Average Invoice Value: $${summary.averageInvoiceValue.toFixed(2)}`);

      // Detailed invoices table
      doc.moveDown();
      doc.fontSize(14).text('Detailed Invoices', { continued: true }).font('Helvetica-Bold');
      doc.font('Helvetica');
      doc.moveDown();

      // Table header
      const tableTop = doc.y;
      const tableWidth = 500;
      const rowHeight = 15;

      doc.text('Invoice #', 50, tableTop, { width: 80, align: 'left' });
      doc.text('Date', 130, tableTop, { width: 60, align: 'left' });
      doc.text('Customer', 190, tableTop, { width: 80, align: 'left' });
      doc.text('Amount', 270, tableTop, { width: 60, align: 'right' });
      doc.text('Status', 330, tableTop, { width: 60, align: 'left' });

      // Draw header line
      doc.moveTo(50, tableTop + rowHeight)
         .lineTo(550, tableTop + rowHeight)
         .stroke();

      // Table rows
      let currentY = tableTop + rowHeight + 5;

      invoices.forEach((invoice) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        doc.fontSize(10);
        doc.text(invoice.invoiceNumber, 50, currentY, { width: 80, align: 'left' });
        doc.text(invoice.issueDate.toLocaleDateString(), 130, currentY, { width: 60, align: 'left' });
        doc.text(`${invoice.ticket?.tenant?.firstName} ${invoice.ticket?.tenant?.lastName}`, 190, currentY, { width: 80, align: 'left' });
        doc.text(`$${invoice.totalAmount.toFixed(2)}`, 270, currentY, { width: 60, align: 'right' });
        doc.text(invoice.status, 330, currentY, { width: 60, align: 'left' });
        currentY += rowHeight;
      });

      doc.end();
    });
  }
}
```

### Financial Controller

```typescript
// packages/api/src/controllers/financial.controller.ts
@Controller('financial')
@UseGuards(FirebaseAuthGuard)
@ApiTags('financial')
export class FinancialController {
  constructor(
    private readonly financialService: FinancialService,
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  @Post('invoices/generate/:ticketId')
  @Roles('Supervisor', 'FMCHead')
  async generateInvoice(
    @Param('ticketId') ticketId: string,
    @Req() req: Request,
  ): Promise<Invoice> {
    return this.financialService.generateInvoice(ticketId, req.user.id);
  }

  @Get('invoices/:id')
  async getInvoice(@Param('id') id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['ticket', 'ticket.tenant', 'ticket.property', 'quote'],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  @Get('invoices/:id/pdf')
  async getInvoicePdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['ticket', 'ticket.tenant', 'ticket.property', 'quote'],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const pdfBuffer = await this.financialService.getInvoicePdf(invoice.id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice_${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Post('payments')
  @Roles('Supervisor', 'FMCHead')
  async recordPayment(
    @Body() paymentData: CreatePaymentDto,
    @Req() req: Request,
  ): Promise<Payment> {
    return this.financialService.recordPayment(paymentData.invoiceId, paymentData, req.user.id);
  }

  @Get('summary')
  @Roles('FMCHead', 'Owner')
  async getFinancialSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: Request,
  ): Promise<FinancialSummary> {
    return this.financialService.getFinancialSummary(
      req.user.id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('report')
  @Roles('FMCHead', 'Owner')
  async generateFinancialReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: Request,
  ): Promise<Buffer> {
    return this.financialService.generateInvoiceReport(
      req.user.id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Put('settings')
  @Roles('FMCHead')
  async updateFinancialSettings(
    @Body() settingsData: UpdateFinancialSettingsDto,
    @Req() req: Request,
  ): Promise<FinancialSettings> {
    return this.financialService.updateSettings(req.user.id, settingsData);
  }
}
```

### Financial Analytics Dashboard

```tsx
// apps/web/src/components/financial/financial-dashboard.tsx
export function FinancialDashboard() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['financial-summary', dateRange],
    queryFn: () => financialApi.getSummary(dateRange.from, dateRange.to),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['financial-invoices', dateRange],
    queryFn: () => financialApi.getInvoices(dateRange.from, dateRange.to),
  });

  const downloadReport = async () => {
    try {
      const blob = await financialApi.downloadReport(dateRange.from, dateRange.to);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  if (summaryLoading || invoicesLoading) {
    return (
      <div className=\"flex justify-center py-8\">
        <Loader2 className=\"h-8 w-8 animate-spin\" />
      </div>
    );
  }

  return (
    <div className=\"space-y-6\">
      <div className=\"flex justify-between items-center\">
        <h1 className=\"text-3xl font-bold\">Financial Dashboard</h1>
        <div className=\"flex gap-2\">
          <DatePicker
            selected={dateRange.from}
            onChange={(date) => {
              if (date) {
                setDateRange({ from: date, to: dateRange.to });
              }
            }}
            selectsStart
            startDate={dateRange.from}
            endDate={dateRange.to}
          />
          <DatePicker
            selected={dateRange.to}
            onChange={(date) => {
              if (date) {
                setDateRange({ from: dateRange.from, to: date });
              }
            }}
            selectsEnd
            startDate={dateRange.from}
            endDate={dateRange.to}
            minDate={dateRange.from}
          />
          <Button onClick={downloadReport} variant=\"outline\">
            <Download className=\"h-4 w-4 mr-2\" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-muted-foreground\">Total Invoiced</p>
                <p className=\"text-2xl font-bold\">${summary?.totalInvoiced.toFixed(2) || '0.00'}</p>
              </div>
              <DollarSign className=\"h-4 w-4 text-muted-foreground\" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-muted-foreground\">Total Paid</p>
                <p className=\"text-2xl font-bold\">${summary?.totalPaid.toFixed(2) || '0.00'}</p>
              </div>
              <DollarSign className=\"h-4 w-4 text-green-500\" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-muted-foreground\">Outstanding</p>
                <p className=\"text-2xl font-bold\">${summary?.totalOutstanding.toFixed(2) || '0.00'}</p>
              </div>
              <AlertTriangle className=\"h-4 w-4 text-orange-500\" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-muted-foreground\">Average Invoice</p>
                <p className=\"text-2xl font-bold\">${summary?.averageInvoiceValue.toFixed(2) || '0.00'}</p>
              </div>
              <TrendingUp className=\"h-4 w-4 text-muted-foreground\" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width=\"100%\" height={300}>
              <LineChart data={invoices?.dailyData || []}>
                <CartesianGrid strokeDasharray=\"3 3\" />
                <XAxis dataKey=\"date\" />
                <YAxis />
                <Tooltip />
                <Line type=\"monotone\" dataKey=\"revenue\" stroke=\"#8884d8\" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width=\"100%\" height={300}>
              <PieChart>
                <Pie
                  data={summary?.statusDistribution || []}
                  cx=\"50%\"
                  cy=\"50%\"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill=\"#8884d8\"
                  dataKey=\"value\"
                >
                  {summary?.statusDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices?.recent?.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className=\"font-medium\">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    {invoice.ticket.tenant.firstName} {invoice.ticket.tenant.lastName}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.issueDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>${invoice.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className=\"flex gap-2\">
                      <Button
                        variant=\"outline\"
                        size=\"sm\"
                        onClick={() => window.open(`/api/financial/invoices/${invoice.id}/pdf`)}
                      >
                        <Download className=\"h-4 w-4\" />
                      </Button>
                      {invoice.status === 'Issued' && (
                        <Button size=\"sm\" onClick={() => recordPayment(invoice.id)}>
                          Record Payment
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Success Metrics
- ✅ Invoices are automatically generated when paid jobs are completed
- ✅ PDF invoices are properly formatted and downloadable
- ✅ Invoice emails are sent to tenants with PDF attachments
- ✅ Payment recording and receipt generation works correctly
- ✅ Financial dashboard shows accurate summary and analytics
- ✅ Financial reports can be downloaded as PDF files
- ✅ Tax calculations are accurate and compliant
- ✅ All financial data is properly secured and audited

## Notes for Developers
- Implement proper financial audit trails
- Add support for multiple currencies and exchange rates
- Consider adding integration with payment gateways
- Implement proper financial reconciliation processes
- Add support for recurring invoices and subscriptions
- Consider adding advanced financial reporting features
- Implement proper data backup and disaster recovery for financial data
- Add support for custom invoice templates and branding
- Consider adding integration with accounting software
- Implement proper fraud detection and prevention measures
- Add support for partial payments and payment plans
- Consider adding automated payment reminders
- Implement proper financial forecasting and budgeting features
- Add support for multi-company financial management
- Consider adding real-time financial analytics and insights
- Implement proper compliance with financial regulations and standards