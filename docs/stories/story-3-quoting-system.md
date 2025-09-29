# Story: Quoting & Approval System

**Story ID**: Story 3
**Branch**: `feature/story-3`
**Dependencies**: Stories 2-1, 2-2, 2-3, 2-4
**Parallel-safe**: false
**Module**: Financial workflow
**Epic**: Quoting, Verification & Advanced Media

## User Stories

### Story 3.1: Supervisor Quote Creation
**As a** Supervisor, **I want** to create and add a detailed quote to a ticket, **so that** I can inform the tenant of costs.

**Acceptance Criteria:**
1. A Supervisor can initiate a "Create Quote" action on a ticket
2. The quote form includes fields for material and labor costs
3. Submitting the quote changes the ticket status to "Pending Quote Approval"
4. The Tenant is notified that a quote is ready

### Story 3.2: Tenant Quote Review and Approval
**As a** Tenant, **I want** to review a quote and either approve or decline it, **so that** I have control over paid work.

**Acceptance Criteria:**
1. The Tenant can view the itemized quote in their app
2. The interface provides "Approve" and "Decline" actions
3. Approving changes the status to "Approved" and notifies the Supervisor
4. Declining changes the status to "Declined" and notifies the Supervisor

## Technical Implementation Details

### Database Schema Updates

```sql
-- Quote Table
CREATE TABLE "quotes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL REFERENCES "tickets"("id"),
    "created_by" TEXT NOT NULL REFERENCES "users"("id"),
    "material_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "labor_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quote Items Table for detailed breakdown
CREATE TABLE "quote_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL CHECK (type IN ('Material', 'Labor')),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update Tickets table to add quote reference
ALTER TABLE "tickets"
ADD COLUMN "quote_id" UUID REFERENCES "quotes"("id"),
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'New' CHECK (
    "status" IN ('New', 'Assigned', 'InProgress', 'PendingQuoteApproval', 'Approved', 'Completed', 'Declined')
);

-- Indexes
CREATE INDEX idx_quotes_ticket_id ON "quotes"("ticket_id");
CREATE INDEX idx_quotes_created_by ON "quotes"("created_by");
CREATE INDEX idx_quote_items_quote_id ON "quote_items"("quote_id");
```

### Data Models

```typescript
// packages/shared-types/src/quote.ts
export type QuoteStatus = 'Pending' | 'Approved' | 'Declined';
export type QuoteItemType = 'Material' | 'Labor';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: QuoteItemType;
  createdAt: Date;
}

export interface Quote {
  id: string;
  ticketId: string;
  createdBy: string;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  description?: string;
  status: QuoteStatus;
  items: QuoteItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuoteDto {
  ticketId: string;
  description?: string;
  items: Omit<QuoteItem, 'id' | 'createdAt' | 'totalPrice'>[];
}

export interface UpdateQuoteDto {
  description?: string;
  items?: Omit<QuoteItem, 'id' | 'createdAt' | 'totalPrice'>[];
}
```

### Quote Service

```typescript
// packages/api/src/services/quote.service.ts
@Injectable()
export class QuoteService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(QuoteItem)
    private readonly quoteItemRepository: Repository<QuoteItem>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly notificationService: NotificationService,
  ) {}

  async createQuote(createQuoteDto: CreateQuoteDto, createdBy: string): Promise<Quote> {
    // Check if ticket exists and doesn't already have a quote
    const ticket = await this.ticketRepository.findOne({
      where: { id: createQuoteDto.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.quoteId) {
      throw new BadRequestException('Ticket already has a quote');
    }

    // Calculate totals
    const materialCost = createQuoteDto.items
      .filter(item => item.type === 'Material')
      .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const laborCost = createQuoteDto.items
      .filter(item => item.type === 'Labor')
      .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const totalCost = materialCost + laborCost;

    // Create quote
    const quote = this.quoteRepository.create({
      ticketId: createQuoteDto.ticketId,
      createdBy,
      materialCost,
      laborCost,
      totalCost,
      description: createQuoteDto.description,
      status: 'Pending',
    });

    const savedQuote = await this.quoteRepository.save(quote);

    // Create quote items
    const quoteItems = createQuoteDto.items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
      quoteId: savedQuote.id,
    }));

    await this.quoteItemRepository.save(quoteItems);

    // Update ticket status
    await this.ticketRepository.update(createQuoteDto.ticketId, {
      status: 'PendingQuoteApproval',
      quoteId: savedQuote.id,
    });

    // Notify tenant
    await this.notificationService.sendNotification({
      type: 'QuoteCreated',
      title: 'Quote Ready for Review',
      message: `A quote has been created for your maintenance request: ${ticket.title}`,
      recipientId: ticket.tenantId,
      data: { ticketId: ticket.id, quoteId: savedQuote.id },
    });

    return this.getQuoteById(savedQuote.id);
  }

  async getQuoteById(id: string): Promise<Quote> {
    const quote = await this.quoteRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async approveQuote(quoteId: string, userId: string): Promise<Quote> {
    const quote = await this.getQuoteById(quoteId);
    const ticket = await this.ticketRepository.findOne({
      where: { id: quote.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.tenantId !== userId) {
      throw new ForbiddenException('You can only approve quotes for your own tickets');
    }

    if (quote.status !== 'Pending') {
      throw new BadRequestException('Quote is not pending approval');
    }

    // Update quote status
    await this.quoteRepository.update(quoteId, { status: 'Approved' });

    // Update ticket status
    await this.ticketRepository.update(quote.ticketId, { status: 'Approved' });

    // Notify supervisor
    await this.notificationService.sendNotification({
      type: 'QuoteApproved',
      title: 'Quote Approved',
      message: `The quote for ${ticket.title} has been approved`,
      recipientId: quote.createdBy,
      data: { ticketId: ticket.id, quoteId: quote.id },
    });

    return this.getQuoteById(quoteId);
  }

  async declineQuote(quoteId: string, userId: string, reason?: string): Promise<Quote> {
    const quote = await this.getQuoteById(quoteId);
    const ticket = await this.ticketRepository.findOne({
      where: { id: quote.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.tenantId !== userId) {
      throw new ForbiddenException('You can only decline quotes for your own tickets');
    }

    if (quote.status !== 'Pending') {
      throw new BadRequestException('Quote is not pending approval');
    }

    // Update quote status
    await this.quoteRepository.update(quoteId, {
      status: 'Declined',
      description: reason ? `${quote.description}\n\nDeclined reason: ${reason}` : quote.description,
    });

    // Update ticket status
    await this.ticketRepository.update(quote.ticketId, { status: 'Declined' });

    // Notify supervisor
    await this.notificationService.sendNotification({
      type: 'QuoteDeclined',
      title: 'Quote Declined',
      message: `The quote for ${ticket.title} has been declined${reason ? `: ${reason}` : ''}`,
      recipientId: quote.createdBy,
      data: { ticketId: ticket.id, quoteId: quote.id },
    });

    return this.getQuoteById(quoteId);
  }

  async getQuotesByTicket(ticketId: string): Promise<Quote[]> {
    return this.quoteRepository.find({
      where: { ticketId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }
}
```

### Quote Controller

```typescript
// packages/api/src/controllers/quote.controller.ts
@Controller('quotes')
@UseGuards(FirebaseAuthGuard)
@ApiTags('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @Roles('Supervisor')
  async createQuote(
    @Body() createQuoteDto: CreateQuoteDto,
    @Req() req: Request,
  ): Promise<Quote> {
    return this.quoteService.createQuote(createQuoteDto, req.user.id);
  }

  @Get(':id')
  async getQuote(@Param('id') id: string): Promise<Quote> {
    return this.quoteService.getQuoteById(id);
  }

  @Post(':id/approve')
  @Roles('Tenant')
  async approveQuote(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Quote> {
    return this.quoteService.approveQuote(id, req.user.id);
  }

  @Post(':id/decline')
  @Roles('Tenant')
  async declineQuote(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Req() req: Request,
  ): Promise<Quote> {
    return this.quoteService.declineQuote(id, req.user.id, reason);
  }

  @Get('ticket/:ticketId')
  async getQuotesByTicket(@Param('ticketId') ticketId: string): Promise<Quote[]> {
    return this.quoteService.getQuotesByTicket(ticketId);
  }
}
```

### Supervisor Quote Creation UI

```tsx
// apps/web/src/components/quotes/create-quote-form.tsx
interface CreateQuoteFormProps {
  ticketId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateQuoteForm({ ticketId, onSuccess, onCancel }: CreateQuoteFormProps) {
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<QuoteItemInput[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, type: 'Material' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteItemInput, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const calculateTotals = () => {
    return items.reduce(
      (acc, item) => {
        const itemTotal = item.quantity * item.unitPrice;
        if (item.type === 'Material') {
          acc.material += itemTotal;
        } else {
          acc.labor += itemTotal;
        }
        return acc;
      },
      { material: 0, labor: 0, total: 0 }
    );
  };

  const totals = calculateTotals();
  totals.total = totals.material + totals.labor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await quoteApi.createQuote({
        ticketId,
        description,
        items,
      });

      onSuccess();
    } catch (error) {
      console.error('Failed to create quote:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className=\"space-y-6\">
      <div>
        <label className=\"block text-sm font-medium mb-2\">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className=\"w-full p-2 border rounded-md\"
          rows={3}
          placeholder=\"Additional details about the quote...\"
        />
      </div>

      <div>
        <div className=\"flex justify-between items-center mb-4\">
          <h3 className=\"text-lg font-medium\">Quote Items</h3>
          <Button type=\"button\" onClick={addItem} variant=\"outline\">
            Add Item
          </Button>
        </div>

        <div className=\"space-y-4\">
          {items.map((item, index) => (
            <div key={index} className=\"border rounded-lg p-4 space-y-3\">
              <div className=\"flex justify-between items-start\">
                <h4 className=\"font-medium\">Item {index + 1}</h4>
                <Button
                  type=\"button\"
                  onClick={() => removeItem(index)}
                  variant=\"outline\"
                  size=\"sm\"
                >
                  Remove
                </Button>
              </div>

              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-3\">
                <div>
                  <label className=\"block text-sm font-medium mb-1\">Description</label>
                  <input
                    type=\"text\"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className=\"w-full p-2 border rounded-md\"
                    required
                  />
                </div>

                <div>
                  <label className=\"block text-sm font-medium mb-1\">Type</label>
                  <select
                    value={item.type}
                    onChange={(e) => updateItem(index, 'type', e.target.value)}
                    className=\"w-full p-2 border rounded-md\"
                  >
                    <option value=\"Material\">Material</option>
                    <option value=\"Labor\">Labor</option>
                  </select>
                </div>

                <div>
                  <label className=\"block text-sm font-medium mb-1\">Quantity</label>
                  <input
                    type=\"number\"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                    className=\"w-full p-2 border rounded-md\"
                    min=\"0.01\"
                    step=\"0.01\"
                    required
                  />
                </div>

                <div>
                  <label className=\"block text-sm font-medium mb-1\">Unit Price</label>
                  <input
                    type=\"number\"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                    className=\"w-full p-2 border rounded-md\"
                    min=\"0\"
                    step=\"0.01\"
                    required
                  />
                </div>
              </div>

              <div className=\"text-right font-medium\">
                Item Total: ${(item.quantity * item.unitPrice).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <div className=\"border rounded-lg p-4 bg-gray-50\">
          <div className=\"space-y-2\">
            <div className=\"flex justify-between\">
              <span>Material Cost:</span>
              <span>${totals.material.toFixed(2)}</span>
            </div>
            <div className=\"flex justify-between\">
              <span>Labor Cost:</span>
              <span>${totals.labor.toFixed(2)}</span>
            </div>
            <div className=\"border-t pt-2 flex justify-between font-bold text-lg\">
              <span>Total Cost:</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div className=\"flex gap-3\">
        <Button type=\"submit\" disabled={isLoading || items.length === 0}>
          {isLoading ? 'Creating...' : 'Create Quote'}
        </Button>
        <Button type=\"button\" onClick={onCancel} variant=\"outline\">
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

### Tenant Quote Review UI

```tsx
// apps/mobile/lib/features/quotes/presentation/quote-detail-page.dart
class QuoteDetailPage extends ConsumerWidget {
  final String quoteId;

  const QuoteDetailPage({super.key, required this.quoteId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quoteAsync = ref.watch(quoteDetailsProvider(quoteId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quote Details'),
      ),
      body: quoteAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
        data: (quote) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildQuoteHeader(quote),
              const SizedBox(height: 24),
              if (quote.description != null)
                _buildDescription(quote.description!),
              const SizedBox(height: 24),
              _buildItemsList(quote.items),
              const SizedBox(height: 24),
              _buildTotals(quote),
              const SizedBox(height: 32),
              if (quote.status == 'Pending')
                _buildActionButtons(context, ref, quote.id)
              else
                _buildStatusBadge(quote.status),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuoteHeader(Quote quote) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Quote for ${quote.ticketTitle}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Created on ${DateFormat('MMM dd, yyyy').format(quote.createdAt)}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            QuoteStatusBadge(status: quote.status),
          ],
        ),
      ),
    );
  }

  Widget _buildDescription(String description) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Description',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(description),
          ],
        ),
      ),
    );
  }

  Widget _buildItemsList(List<QuoteItem> items) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Quote Items',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            ...items.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.description,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        Text(
                          '${item.quantity} x \$${item.unitPrice.toStringAsFixed(2)}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '\$${item.totalPrice.toStringAsFixed(2)}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildTotals(Quote quote) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Material Cost:'),
                Text('\$${quote.materialCost.toStringAsFixed(2)}'),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Labor Cost:'),
                Text('\$${quote.laborCost.toStringAsFixed(2)}'),
              ],
            ),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total Cost:',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                Text(
                  '\$${quote.totalCost.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, WidgetRef ref, String quoteId) {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton(
            onPressed: () => _approveQuote(context, ref, quoteId),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            child: const Text('Approve Quote'),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton(
            onPressed: () => _showDeclineDialog(context, ref, quoteId),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Decline Quote'),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status) {
      case 'Approved':
        color = Colors.green;
        break;
      case 'Declined':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color),
      ),
      child: Center(
        child: Text(
          'Quote $status',
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ),
    );
  }

  Future<void> _approveQuote(BuildContext context, WidgetRef ref, String quoteId) async {
    try {
      await ref.read(quoteRepositoryProvider).approveQuote(quoteId);

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Quote approved successfully!')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _showDeclineDialog(BuildContext context, WidgetRef ref, String quoteId) async {
    final reasonController = TextEditingController();

    return showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Decline Quote'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Please provide a reason for declining this quote:'),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'Reason for decline...',
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await _declineQuote(context, ref, quoteId, reasonController.text);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Decline'),
          ),
        ],
      ),
    );
  }

  Future<void> _declineQuote(BuildContext context, WidgetRef ref, String quoteId, String reason) async {
    try {
      await ref.read(quoteRepositoryProvider).declineQuote(quoteId, reason);

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Quote declined successfully!')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }
}
```

## Success Metrics
- ✅ Supervisors can create detailed quotes with material and labor breakdowns
- ✅ Tenants can review quotes in their mobile app
- ✅ Quote approval/decline workflow works correctly
- ✅ Notifications are sent to appropriate users
- ✅ Ticket status changes correctly based on quote status
- ✅ Quote totals are calculated accurately
- ✅ All quote data is persisted correctly
- ✅ UI provides clear feedback for all actions

## Notes for Developers
- Implement proper validation for quote items (positive quantities, prices)
- Add support for quote revisions
- Consider adding quote expiration dates
- Implement proper error handling for concurrent quote modifications
- Add support for bulk operations on quotes
- Consider adding quote templates for common repairs
- Implement proper audit logging for quote changes
- Add support for quote attachments (photos, documents)
- Consider adding integration with external pricing APIs
- Implement proper currency handling for international support