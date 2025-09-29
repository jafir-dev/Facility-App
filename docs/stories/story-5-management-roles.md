# Story: Management Roles & Procurement

**Story ID**: Story 5
**Branch**: `feature/story-5`
**Dependencies**: Story 4
**Parallel-safe**: false
**Module**: Extended user roles
**Epic**: Management Roles & Financials

## User Stories

### Story 5.1: Procurement Role & Workflow
**As a** Procurement team member, **I want** to receive and manage material requests, **so that** I can efficiently purchase materials for jobs.

**Acceptance Criteria:**
1. A "Procurement" user has a dashboard to view new material requests
2. The user can update the status (e.g., "Acknowledged," "Ordered," "Materials Ready")
3. A "Materials Ready" status notifies the requesting Supervisor

### Story 5.2: FMC Head & Building Owner Dashboards
**As an** FMC Head or Building Owner, **I want** a read-only dashboard with key statistics, **so that** I can have high-level oversight.

**Acceptance Criteria:**
1. An FMC Head can view a dashboard summarizing ticket volumes and satisfaction scores across all properties
2. A Building Owner can view a similar dashboard for their specific property
3. These roles can view ticket details but cannot perform actions

### Story 5.3: Vendor Role & Assignment
**As a** Supervisor, **I want** to assign a ticket to a Third-Party Vendor, **so that** specialized work can be delegated.

**Acceptance Criteria:**
1. A "Vendor" role can be registered in the system
2. Supervisors can assign a ticket to a Vendor
3. The assigned Vendor is notified and can manage the ticket via a simplified interface
4. Vendor status updates are visible to the Supervisor and Tenant

## Technical Implementation Details

### Database Schema Updates

```sql
-- Add Procurement Request Table
CREATE TABLE "procurement_requests" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL REFERENCES "tickets"("id"),
    "requested_by" TEXT NOT NULL REFERENCES "users"("id"),
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_of_measure" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Medium' CHECK ("priority" IN ('Low', 'Medium', 'High', 'Emergency')),
    "status" TEXT NOT NULL DEFAULT 'Pending' CHECK (
        "status" IN ('Pending', 'Acknowledged', 'Ordered', 'MaterialsReady', 'Cancelled')
    ),
    "estimated_cost" DECIMAL(10,2),
    "actual_cost" DECIMAL(10,2),
    "vendor_notes" TEXT,
    "acknowledged_by" TEXT REFERENCES "users"("id"),
    "acknowledged_at" TIMESTAMP WITH TIME ZONE,
    "ordered_by" TEXT REFERENCES "users"("id"),
    "ordered_at" TIMESTAMP WITH TIME ZONE,
    "delivered_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add Vendor Table
CREATE TABLE "vendors" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL REFERENCES "users"("id"),
    "company_name" TEXT NOT NULL,
    "specialization" TEXT[],
    "contact_phone" TEXT,
    "service_area" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "rating" DECIMAL(2,1) CHECK ("rating" >= 0 AND "rating" <= 5),
    "completed_jobs" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update Users table to include all roles
ALTER TABLE "users"
ALTER COLUMN "role" TYPE TEXT CHECK (
    "role" IN ('Tenant', 'Supervisor', 'Technician', 'FMCHead', 'Owner', 'Procurement', 'Vendor')
);

-- Add Building-FMC relationship
ALTER TABLE "buildings"
ADD COLUMN "fmc_id" TEXT REFERENCES "users"("id");

-- Add analytics tables
CREATE TABLE "ticket_analytics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "building_id" UUID REFERENCES "buildings"("id"),
    "date" DATE NOT NULL,
    "total_tickets" INTEGER NOT NULL DEFAULT 0,
    "completed_tickets" INTEGER NOT NULL DEFAULT 0,
    "average_resolution_time" INTERVAL,
    "satisfaction_score" DECIMAL(2,1),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_procurement_requests_ticket_id ON "procurement_requests"("ticket_id");
CREATE INDEX idx_procurement_requests_requested_by ON "procurement_requests"("requested_by");
CREATE INDEX idx_procurement_requests_status ON "procurement_requests"("status");
CREATE INDEX idx_vendors_user_id ON "vendors"("user_id");
CREATE INDEX idx_vendors_specialization ON "vendors" USING GIN("specialization");
CREATE INDEX idx_ticket_analytics_building_date ON "ticket_analytics"("building_id", "date");
```

### Procurement Service

```typescript
// packages/api/src/services/procurement.service.ts
@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(ProcurementRequest)
    private readonly procurementRepository: Repository<ProcurementRequest>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  async createProcurementRequest(
    createRequestDto: CreateProcurementRequestDto,
    requestedBy: string,
  ): Promise<ProcurementRequest> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: createRequestDto.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const procurementRequest = this.procurementRepository.create({
      ...createRequestDto,
      requestedBy,
      status: 'Pending',
    });

    const savedRequest = await this.procurementRepository.save(procurementRequest);

    // Notify procurement team
    const procurementUsers = await this.userRepository.find({
      where: { role: 'Procurement', isActive: true },
    });

    for (const user of procurementUsers) {
      await this.notificationService.sendNotification({
        type: 'ProcurementRequestCreated',
        title: 'New Material Request',
        message: `A new material request has been created for ticket: ${ticket.title}`,
        recipientId: user.id,
        data: { ticketId: ticket.id, procurementRequestId: savedRequest.id },
      });
    }

    return this.getProcurementRequestById(savedRequest.id);
  }

  async updateProcurementStatus(
    id: string,
    status: string,
    updatedBy: string,
    notes?: string,
  ): Promise<ProcurementRequest> {
    const request = await this.procurementRepository.findOne({
      where: { id },
      relations: ['ticket'],
    });

    if (!request) {
      throw new NotFoundException('Procurement request not found');
    }

    const updateData: any = { status };

    // Set timestamps based on status
    switch (status) {
      case 'Acknowledged':
        updateData.acknowledgedBy = updatedBy;
        updateData.acknowledgedAt = new Date();
        break;
      case 'Ordered':
        updateData.orderedBy = updatedBy;
        updateData.orderedAt = new Date();
        break;
      case 'MaterialsReady':
        updateData.deliveredAt = new Date();
        break;
    }

    if (notes) {
      updateData.vendorNotes = notes;
    }

    await this.procurementRepository.update(id, updateData);

    // Notify requester
    if (status === 'MaterialsReady') {
      await this.notificationService.sendNotification({
        type: 'ProcurementRequestCompleted',
        title: 'Materials Ready',
        message: `The materials for your request "${request.description}" are ready for pickup`,
        recipientId: request.requestedBy,
        data: { ticketId: request.ticketId, procurementRequestId: id },
      });
    }

    return this.getProcurementRequestById(id);
  }

  async getProcurementRequestsByStatus(status: string): Promise<ProcurementRequest[]> {
    return this.procurementRepository.find({
      where: { status },
      relations: ['ticket', 'requestedByUser'],
      order: { createdAt: 'ASC' },
    });
  }

  async getProcurementRequestById(id: string): Promise<ProcurementRequest> {
    const request = await this.procurementRepository.findOne({
      where: { id },
      relations: ['ticket', 'requestedByUser'],
    });

    if (!request) {
      throw new NotFoundException('Procurement request not found');
    }

    return request;
  }
}
```

### Vendor Service

```typescript
// packages/api/src/services/vendor.service.ts
@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly notificationService: NotificationService,
  ) {}

  async createVendorProfile(createVendorDto: CreateVendorDto, userId: string): Promise<Vendor> {
    const user = await this.userRepository.findOne({
      where: { id: userId, role: 'Vendor' },
    });

    if (!user) {
      throw new NotFoundException('User not found or not a vendor');
    }

    const existingVendor = await this.vendorRepository.findOne({
      where: { userId },
    });

    if (existingVendor) {
      throw new BadRequestException('Vendor profile already exists');
    }

    const vendor = this.vendorRepository.create({
      ...createVendorDto,
      userId,
    });

    return this.vendorRepository.save(vendor);
  }

  async getVendorsBySpecialization(specialization: string[]): Promise<Vendor[]> {
    return this.vendorRepository
      .createQueryBuilder('vendor')
      .where('vendor.is_active = :isActive', { isActive: true })
      .andWhere('vendor.specialization && :specialization', { specialization })
      .orderBy('vendor.rating', 'DESC')
      .getMany();
  }

  async assignTicketToVendor(ticketId: string, vendorId: string, assignedBy: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId, isActive: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Update ticket
    await this.ticketRepository.update(ticketId, {
      assignedTo: vendor.userId,
      assignedBy,
      status: 'Assigned',
    });

    // Notify vendor
    await this.notificationService.sendNotification({
      type: 'TicketAssigned',
      title: 'New Ticket Assigned',
      message: `You have been assigned a new maintenance ticket: ${ticket.title}`,
      recipientId: vendor.userId,
      data: { ticketId: ticket.id },
    });

    return this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['assignedToUser'],
    });
  }

  async updateVendorPerformance(vendorId: string, rating: number, ticketId: string): Promise<void> {
    await this.vendorRepository.manager.transaction(async (manager) => {
      const vendor = await manager.findOne(Vendor, {
        where: { id: vendorId },
      });

      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }

      // Update rating using weighted average
      const totalRating = vendor.rating * vendor.completed_jobs + rating;
      const totalJobs = vendor.completed_jobs + 1;
      const newRating = totalRating / totalJobs;

      await manager.update(Vendor, vendorId, {
        rating: newRating,
        completedJobs: totalJobs,
      });
    });
  }
}
```

### Analytics Service

```typescript
// packages/api/src/services/analytics.service.ts
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketAnalytics)
    private readonly analyticsRepository: Repository<TicketAnalytics>,
  ) {}

  async generateDailyAnalytics(buildingId: string, date: Date): Promise<TicketAnalytics> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const tickets = await this.ticketRepository.find({
      where: {
        property: {
          buildingId,
        },
        createdAt: Between(startOfDay, endOfDay),
      },
    });

    const completedTickets = tickets.filter(ticket => ticket.status === 'Completed');

    const totalResolutionTime = completedTickets.reduce((total, ticket) => {
      if (ticket.completedAt && ticket.createdAt) {
        return total + (ticket.completedAt.getTime() - ticket.createdAt.getTime());
      }
      return total;
    }, 0);

    const averageResolutionTime = completedTickets.length > 0
      ? totalResolutionTime / completedTickets.length
      : 0;

    const satisfactionScore = await this.calculateSatisfactionScore(completedTickets);

    let analytics = await this.analyticsRepository.findOne({
      where: { buildingId, date: startOfDay },
    });

    if (analytics) {
      // Update existing record
      await this.analyticsRepository.update(analytics.id, {
        totalTickets: tickets.length,
        completedTickets: completedTickets.length,
        averageResolutionTime: new Date(averageResolutionTime),
        satisfactionScore,
      });
    } else {
      // Create new record
      analytics = this.analyticsRepository.create({
        buildingId,
        date: startOfDay,
        totalTickets: tickets.length,
        completedTickets: completedTickets.length,
        averageResolutionTime: new Date(averageResolutionTime),
        satisfactionScore,
      });

      await this.analyticsRepository.save(analytics);
    }

    return this.analyticsRepository.findOne({
      where: { id: analytics.id },
    });
  }

  async getBuildingAnalytics(
    buildingId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BuildingAnalyticsResponse> {
    const analytics = await this.analyticsRepository.find({
      where: {
        buildingId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    const totalTickets = analytics.reduce((sum, day) => sum + day.totalTickets, 0);
    const completedTickets = analytics.reduce((sum, day) => sum + day.completedTickets, 0);
    const completionRate = totalTickets > 0 ? (completedTickets / totalTickets) * 100 : 0;

    const averageResolutionTime = this.calculateAverageResolutionTime(analytics);
    const averageSatisfaction = this.calculateAverageSatisfaction(analytics);

    // Calculate trends
    const trends = this.calculateTrends(analytics);

    return {
      summary: {
        totalTickets,
        completedTickets,
        completionRate,
        averageResolutionTime,
        averageSatisfaction,
      },
      dailyData: analytics,
      trends,
    };
  }

  private async calculateSatisfactionScore(tickets: Ticket[]): Promise<number> {
    // This would typically involve survey responses or OTP verification success rates
    // For now, we'll use a simple calculation based on completion time
    if (tickets.length === 0) return 0;

    let totalScore = 0;
    for (const ticket of tickets) {
      if (ticket.completedAt && ticket.createdAt) {
        const resolutionTime = ticket.completedAt.getTime() - ticket.createdAt.getTime();
        const hours = resolutionTime / (1000 * 60 * 60);

        // Score based on resolution time (faster = higher score)
        if (hours < 24) totalScore += 5;
        else if (hours < 48) totalScore += 4;
        else if (hours < 72) totalScore += 3;
        else if (hours < 96) totalScore += 2;
        else totalScore += 1;
      }
    }

    return totalScore / tickets.length;
  }

  private calculateAverageResolutionTime(analytics: TicketAnalytics[]): number {
    const validTimes = analytics
      .filter(day => day.averageResolutionTime)
      .map(day => day.averageResolutionTime.getTime());

    if (validTimes.length === 0) return 0;

    const totalTime = validTimes.reduce((sum, time) => sum + time, 0);
    return totalTime / validTimes.length;
  }

  private calculateAverageSatisfaction(analytics: TicketAnalytics[]): number {
    const validScores = analytics
      .filter(day => day.satisfactionScore !== null)
      .map(day => day.satisfactionScore);

    if (validScores.length === 0) return 0;

    const totalScore = validScores.reduce((sum, score) => sum + score, 0);
    return totalScore / validScores.length;
  }

  private calculateTrends(analytics: TicketAnalytics[]): AnalyticsTrends {
    if (analytics.length < 2) {
      return { ticketVolume: 'stable', resolutionTime: 'stable', satisfaction: 'stable' };
    }

    const recent = analytics.slice(-7); // Last 7 days
    const previous = analytics.slice(-14, -7); // Previous 7 days

    const recentVolume = recent.reduce((sum, day) => sum + day.totalTickets, 0);
    const previousVolume = previous.reduce((sum, day) => sum + day.totalTickets, 0);

    const recentResolution = this.calculateAverageResolutionTime(recent);
    const previousResolution = this.calculateAverageResolutionTime(previous);

    const recentSatisfaction = this.calculateAverageSatisfaction(recent);
    const previousSatisfaction = this.calculateAverageSatisfaction(previous);

    return {
      ticketVolume: this.calculateTrendDirection(recentVolume, previousVolume),
      resolutionTime: this.calculateTrendDirection(recentResolution, previousResolution, true),
      satisfaction: this.calculateTrendDirection(recentSatisfaction, previousSatisfaction),
    };
  }

  private calculateTrendDirection(
    current: number,
    previous: number,
    inverse = false,
  ): 'increasing' | 'decreasing' | 'stable' {
    if (previous === 0) return 'stable';

    const change = ((current - previous) / previous) * 100;

    if (Math.abs(change) < 5) return 'stable';

    if (inverse) {
      return change > 0 ? 'decreasing' : 'increasing';
    }

    return change > 0 ? 'increasing' : 'decreasing';
  }

  @Cron('0 0 * * * *') // Run daily at midnight
  async generateDailyAnalyticsForAllBuildings() {
    const buildings = await this.ticketRepository.manager.query(
      'SELECT DISTINCT id FROM buildings'
    );

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    for (const building of buildings) {
      try {
        await this.generateDailyAnalytics(building.id, yesterday);
      } catch (error) {
        console.error(`Failed to generate analytics for building ${building.id}:`, error);
      }
    }
  }
}
```

### Procurement Dashboard UI

```tsx
// apps/web/src/components/procurement/procurement-dashboard.tsx
export function ProcurementDashboard() {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const { data: pendingRequests, isLoading: pendingLoading } = useQuery({
    queryKey: ['procurement-requests', 'pending'],
    queryFn: () => procurementApi.getRequestsByStatus('Pending'),
  });

  const { data: acknowledgedRequests, isLoading: acknowledgedLoading } = useQuery({
    queryKey: ['procurement-requests', 'acknowledged'],
    queryFn: () => procurementApi.getRequestsByStatus('Acknowledged'),
  });

  const { data: orderedRequests, isLoading: orderedLoading } = useQuery({
    queryKey: ['procurement-requests', 'ordered'],
    queryFn: () => procurementApi.getRequestsByStatus('Ordered'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      procurementApi.updateStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-requests'] });
      setIsStatusDialogOpen(false);
      setSelectedRequest(null);
    },
  });

  const handleStatusUpdate = (status: string, notes?: string) => {
    if (selectedRequest) {
      updateStatusMutation.mutate({ id: selectedRequest.id, status, notes });
    }
  };

  const getRequestsForTab = (tab: string) => {
    switch (tab) {
      case 'pending':
        return pendingRequests || [];
      case 'acknowledged':
        return acknowledgedRequests || [];
      case 'ordered':
        return orderedRequests || [];
      default:
        return [];
    }
  };

  const isLoadingForTab = (tab: string) => {
    switch (tab) {
      case 'pending':
        return pendingLoading;
      case 'acknowledged':
        return acknowledgedLoading;
      case 'ordered':
        return orderedLoading;
      default:
        return false;
    }
  };

  return (
    <div className=\"space-y-6\">
      <div className=\"flex justify-between items-center\">
        <h1 className=\"text-3xl font-bold\">Procurement Dashboard</h1>
        <div className=\"flex gap-2\">
          <Badge variant=\"outline\">
            Pending: {pendingRequests?.length || 0}
          </Badge>
          <Badge variant=\"outline\">
            Acknowledged: {acknowledgedRequests?.length || 0}
          </Badge>
          <Badge variant=\"outline\">
            Ordered: {orderedRequests?.length || 0}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value=\"pending\">
            Pending ({pendingRequests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value=\"acknowledged\">
            Acknowledged ({acknowledgedRequests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value=\"ordered\">
            Ordered ({orderedRequests?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className=\"space-y-4\">
          {isLoadingForTab(activeTab) ? (
            <div className=\"flex justify-center py-8\">
              <Loader2 className=\"h-8 w-8 animate-spin\" />
            </div>
          ) : (
            <div className=\"grid gap-4\">
              {getRequestsForTab(activeTab).map((request) => (
                <Card key={request.id}>
                  <CardContent className=\"p-6\">
                    <div className=\"flex justify-between items-start mb-4\">
                      <div>
                        <h3 className=\"font-semibold\">{request.description}</h3>
                        <p className=\"text-sm text-muted-foreground\">
                          Ticket: {request.ticket.title}
                        </p>
                      </div>
                      <div className=\"flex gap-2\">
                        <Badge variant={getStatusVariant(request.status)}>
                          {request.status}
                        </Badge>
                        <Badge variant=\"outline\">
                          {request.priority}
                        </Badge>
                      </div>
                    </div>

                    <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 mb-4\">
                      <div>
                        <p className=\"text-sm text-muted-foreground\">Quantity</p>
                        <p className=\"font-medium\">
                          {request.quantity} {request.unitOfMeasure}
                        </p>
                      </div>
                      <div>
                        <p className=\"text-sm text-muted-foreground\">Estimated Cost</p>
                        <p className=\"font-medium\">
                          ${request.estimatedCost?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className=\"text-sm text-muted-foreground\">Requested By</p>
                        <p className=\"font-medium\">
                          {request.requestedByUser.firstName} {request.requestedByUser.lastName}
                        </p>
                      </div>
                      <div>
                        <p className=\"text-sm text-muted-foreground\">Requested</p>
                        <p className=\"font-medium\">
                          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {request.vendorNotes && (
                      <div className=\"mt-4 p-3 bg-muted rounded-lg\">
                        <p className=\"text-sm font-medium mb-1\">Notes:</p>
                        <p className=\"text-sm\">{request.vendorNotes}</p>
                      </div>
                    )}

                    <div className=\"flex gap-2 mt-4\">
                      {activeTab === 'pending' && (
                        <>
                          <Button
                            onClick={() => {
                              setSelectedRequest(request);
                              handleStatusUpdate('Acknowledged');
                            }}
                            size=\"sm\"
                          >
                            Acknowledge
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsStatusDialogOpen(true);
                            }}
                            variant=\"outline\"
                            size=\"sm\"
                          >
                            Update Status
                          </Button>
                        </>
                      )}
                      {activeTab === 'acknowledged' && (
                        <Button
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsStatusDialogOpen(true);
                          }}
                          size=\"sm\"
                        >
                          Mark as Ordered
                        </Button>
                      )}
                      {activeTab === 'ordered' && (
                        <Button
                          onClick={() => {
                            setSelectedRequest(request);
                            handleStatusUpdate('MaterialsReady');
                          }}
                          size=\"sm\"
                        >
                          Mark as Ready
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <StatusUpdateDialog
        request={selectedRequest}
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
```

### FMC Head Analytics Dashboard

```tsx
// apps/web/src/components/analytics/fmc-head-dashboard.tsx
export function FMCHeadDashboard() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['fmc-analytics', dateRange],
    queryFn: () => analyticsApi.getFMCAnalytics(dateRange.from, dateRange.to),
  });

  if (isLoading) {
    return (
      <div className=\"flex justify-center py-8\">
        <Loader2 className=\"h-8 w-8 animate-spin\" />
      </div>
    );
  }

  if (!analytics) {
    return <div>No analytics data available</div>;
  }

  return (
    <div className=\"space-y-6\">
      <div className=\"flex justify-between items-center\">
        <h1 className=\"text-3xl font-bold\">FMC Analytics Dashboard</h1>
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
      </div>

      {/* Key Metrics */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-muted-foreground\">Total Tickets</p>
                <p className=\"text-2xl font-bold\">{analytics.summary.totalTickets}</p>
              </div>
              <TrendingUp className=\"h-4 w-4 text-muted-foreground\" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-muted-foreground\">Completion Rate</p>
                <p className=\"text-2xl font-bold\">{analytics.summary.completionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className=\"h-4 w-4 text-green-500\" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-muted-foreground\">Avg. Resolution Time</p>
                <p className=\"text-2xl font-bold\">{formatDuration(analytics.summary.averageResolutionTime)}</p>
              </div>
              <Clock className=\"h-4 w-4 text-muted-foreground\" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className=\"p-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-muted-foreground\">Satisfaction Score</p>
                <p className=\"text-2xl font-bold\">{analytics.summary.averageSatisfaction.toFixed(1)}/5</p>
              </div>
              <Star className=\"h-4 w-4 text-yellow-500\" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width=\"100%\" height={300}>
              <LineChart data={analytics.dailyData}>
                <CartesianGrid strokeDasharray=\"3 3\" />
                <XAxis dataKey=\"date\" />
                <YAxis />
                <Tooltip />
                <Line type=\"monotone\" dataKey=\"totalTickets\" stroke=\"#8884d8\" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Building Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width=\"100%\" height={300}>
              <BarChart data={analytics.buildingPerformance}>
                <CartesianGrid strokeDasharray=\"3 3\" />
                <XAxis dataKey=\"name\" />
                <YAxis />
                <Tooltip />
                <Bar dataKey=\"completionRate\" fill=\"#82ca9d\" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Building Details */}
      <Card>
        <CardHeader>
          <CardTitle>Building Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"space-y-4\">
            {analytics.buildingDetails.map((building) => (
              <div key={building.id} className=\"flex justify-between items-center p-4 border rounded-lg\">
                <div>
                  <h3 className=\"font-semibold\">{building.name}</h3>
                  <p className=\"text-sm text-muted-foreground\">{building.address}</p>
                </div>
                <div className=\"text-right\">
                  <p className=\"text-sm font-medium\">{building.totalTickets} tickets</p>
                  <p className=\"text-sm text-muted-foreground\">
                    {building.completionRate.toFixed(1)}% completion
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Success Metrics
- ✅ Procurement team can view and manage material requests
- ✅ Status updates trigger proper notifications
- ✅ FMC Head can view comprehensive analytics dashboard
- ✅ Building Owners can view their property-specific analytics
- ✅ Vendor registration and assignment works correctly
- ✅ Vendor performance tracking is implemented
- ✅ Analytics data is generated and updated daily
- ✅ All dashboards provide real-time data updates

## Notes for Developers
- Implement proper role-based access control for all dashboards
- Add more detailed analytics and reporting features
- Consider adding predictive analytics for maintenance needs
- Implement proper data visualization with interactive charts
- Add export functionality for analytics reports
- Consider adding vendor rating and review system
- Implement proper procurement budget tracking
- Add integration with external vendor management systems
- Consider adding automated reordering for frequently used materials
- Implement proper audit logging for all management actions
- Add customizable dashboard views and widgets
- Consider adding mobile-responsive design for all dashboards
- Implement proper data caching for better performance
- Add real-time updates using WebSockets for live analytics
- Consider adding machine learning for predictive maintenance insights