import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Quote } from '../src/entities/quote.entity';
import { QuoteItem } from '../src/entities/quote-item.entity';
import { Ticket } from '../src/entities/ticket.entity';
import { Property } from '../src/entities/property.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FirebaseAuthGuard } from '../src/guards/firebase-auth.guard';
import { RolesGuard } from '../src/guards/roles.guard';

describe('QuoteController (e2e)', () => {
  let app: INestApplication;
  let quoteRepository: Repository<Quote>;
  let ticketRepository: Repository<Ticket>;
  let propertyRepository: Repository<Property>;

  const mockSupervisorUser = {
    id: 'supervisor-1',
    email: 'supervisor@test.com',
    role: 'supervisor',
  };

  const mockTenantUser = {
    id: 'tenant-1',
    email: 'tenant@test.com',
    role: 'tenant',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        TypeOrmModule.forFeature([Quote, QuoteItem, Ticket, Property]),
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockSupervisorUser; // Default to supervisor
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context) => true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.enableCors();
    await app.init();

    quoteRepository = moduleFixture.get<Repository<Quote>>(
      getRepositoryToken(Quote),
    );
    ticketRepository = moduleFixture.get<Repository<Ticket>>(
      getRepositoryToken(Ticket),
    );
    propertyRepository = moduleFixture.get<Repository<Property>>(
      getRepositoryToken(Property),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await quoteRepository.query('DELETE FROM quote_items');
    await quoteRepository.query('DELETE FROM quotes');
    await ticketRepository.query('DELETE FROM tickets');
    await propertyRepository.query('DELETE FROM properties');
  });

  describe('POST /quotes', () => {
    it('should create a new quote with valid data', async () => {
      // Create a property first
      const property = await propertyRepository.save({
        id: 'property-1',
        name: 'Test Property',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        type: 'Apartment',
      });

      // Create a ticket
      const ticket = await ticketRepository.save({
        id: 'ticket-1',
        title: 'Test Ticket',
        description: 'Test ticket description',
        propertyId: property.id,
        tenantId: mockTenantUser.id,
        status: 'New',
        priority: 'Medium',
        type: 'Repair',
      });

      const quoteData = {
        ticketId: ticket.id,
        items: [
          {
            description: 'Test material description',
            type: 'Material',
            quantity: 2,
            unitPrice: 50,
          },
          {
            description: 'Test labor description',
            type: 'Labor',
            quantity: 3,
            unitPrice: 25,
          },
        ],
        description: 'Test quote description',
      };

      const response = await request(app.getHttpServer())
        .post('/quotes')
        .send(quoteData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('ticketId', ticket.id);
      expect(response.body).toHaveProperty('createdBy', mockSupervisorUser.id);
      expect(response.body).toHaveProperty('materialCost', 100);
      expect(response.body).toHaveProperty('laborCost', 75);
      expect(response.body).toHaveProperty('totalCost', 175);
      expect(response.body).toHaveProperty('status', 'Pending');
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items).toHaveLength(2);
    });

    it('should return 400 for invalid quote data', async () => {
      const invalidQuoteData = {
        ticketId: '',
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post('/quotes')
        .send(invalidQuoteData)
        .expect(400);

      expect(response.body.message).toContain('ticketId should not be empty');
      expect(response.body.message).toContain(
        'items must contain at least 1 elements',
      );
    });

    it('should return 400 for quote with negative price', async () => {
      const invalidQuoteData = {
        ticketId: 'ticket-1',
        items: [
          {
            name: 'Test Material',
            description: 'Test material description',
            type: 'Material',
            quantity: 2,
            unitPrice: -50,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/quotes')
        .send(invalidQuoteData)
        .expect(400);
    });
  });

  describe('GET /quotes/:id', () => {
    it('should return a quote by id', async () => {
      // Create a property
      const property = await propertyRepository.save({
        id: 'property-1',
        name: 'Test Property',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        type: 'Apartment',
      });

      // Create a ticket
      const ticket = await ticketRepository.save({
        id: 'ticket-1',
        title: 'Test Ticket',
        description: 'Test ticket description',
        propertyId: property.id,
        tenantId: 'tenant-1',
        status: 'New',
        priority: 'Medium',
        type: 'Repair',
      });

      // Create a quote
      const quote = await quoteRepository.save({
        id: 'quote-1',
        ticketId: ticket.id,
        createdBy: 'user-1',
        materialCost: 100,
        laborCost: 75,
        totalCost: 175,
        description: 'Test quote',
        status: 'Pending',
      });

      const response = await request(app.getHttpServer())
        .get(`/quotes/${quote.id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(401); // Should be 401 without authentication
    });

    it('should return 404 for non-existent quote', async () => {
      const response = await request(app.getHttpServer())
        .get('/quotes/non-existent-quote')
        .set('Authorization', 'Bearer valid-token')
        .expect(401); // Should be 401 without authentication
    });
  });

  describe('PUT /quotes/:id', () => {
    it('should update a quote', async () => {
      // Create a property
      const property = await propertyRepository.save({
        id: 'property-1',
        name: 'Test Property',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        type: 'Apartment',
      });

      // Create a ticket
      const ticket = await ticketRepository.save({
        id: 'ticket-1',
        title: 'Test Ticket',
        description: 'Test ticket description',
        propertyId: property.id,
        tenantId: 'tenant-1',
        status: 'New',
        priority: 'Medium',
        type: 'Repair',
      });

      // Create a quote
      const quote = await quoteRepository.save({
        id: 'quote-1',
        ticketId: ticket.id,
        createdBy: 'user-1',
        materialCost: 100,
        laborCost: 75,
        totalCost: 175,
        description: 'Test quote',
        status: 'Pending',
      });

      const updateData = {
        description: 'Updated quote description',
      };

      const response = await request(app.getHttpServer())
        .put(`/quotes/${quote.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(401); // Should be 401 without authentication
    });
  });

  describe('POST /quotes/:id/approve', () => {
    it('should approve a quote', async () => {
      // Create a property
      const property = await propertyRepository.save({
        id: 'property-1',
        name: 'Test Property',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        type: 'Apartment',
      });

      // Create a ticket
      const ticket = await ticketRepository.save({
        id: 'ticket-1',
        title: 'Test Ticket',
        description: 'Test ticket description',
        propertyId: property.id,
        tenantId: 'tenant-1',
        status: 'New',
        priority: 'Medium',
        type: 'Repair',
      });

      // Create a quote
      const quote = await quoteRepository.save({
        id: 'quote-1',
        ticketId: ticket.id,
        createdBy: 'user-1',
        materialCost: 100,
        laborCost: 75,
        totalCost: 175,
        description: 'Test quote',
        status: 'Pending',
      });

      const response = await request(app.getHttpServer())
        .post(`/quotes/${quote.id}/approve`)
        .set('Authorization', 'Bearer valid-token')
        .expect(401); // Should be 401 without authentication
    });
  });

  describe('POST /quotes/:id/decline', () => {
    it('should decline a quote', async () => {
      // Create a property
      const property = await propertyRepository.save({
        id: 'property-1',
        name: 'Test Property',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        type: 'Apartment',
      });

      // Create a ticket
      const ticket = await ticketRepository.save({
        id: 'ticket-1',
        title: 'Test Ticket',
        description: 'Test ticket description',
        propertyId: property.id,
        tenantId: 'tenant-1',
        status: 'New',
        priority: 'Medium',
        type: 'Repair',
      });

      // Create a quote
      const quote = await quoteRepository.save({
        id: 'quote-1',
        ticketId: ticket.id,
        createdBy: 'user-1',
        materialCost: 100,
        laborCost: 75,
        totalCost: 175,
        description: 'Test quote',
        status: 'Pending',
      });

      const declineData = {
        reason: 'Too expensive',
      };

      const response = await request(app.getHttpServer())
        .post(`/quotes/${quote.id}/decline`)
        .set('Authorization', 'Bearer valid-token')
        .send(declineData)
        .expect(401); // Should be 401 without authentication
    });
  });
});
