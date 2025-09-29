import { Client } from 'pg';
import { UserRepository } from '../repositories/user.repository';
import { PropertyRepository, BuildingRepository } from '../repositories/property.repository';
import { TicketRepository } from '../repositories/ticket.repository';
import { MediaRepository } from '../repositories/media.repository';
import { User, UserRole, TicketStatus, TicketPriority } from '@facility-app/shared-types';
import { v4 as uuidv4 } from 'uuid';

export class DatabaseSeeder {
  private client: Client;

  constructor(connectionConfig: any) {
    this.client = new Client(connectionConfig);
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.end();
  }

  async clearData() {
    console.log('Clearing existing data...');

    await this.client.query('DELETE FROM media');
    await this.client.query('DELETE FROM tickets');
    await this.client.query('DELETE FROM properties');
    await this.client.query('DELETE FROM buildings');
    await this.client.query('DELETE FROM users');

    console.log('✅ Data cleared');
  }

  async seedUsers() {
    console.log('Seeding users...');

    const userRepository = new UserRepository(this.client);

    const users: (Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { id: string })[] = [
      {
        id: 'user-owner-1',
        email: 'owner@example.com',
        firstName: 'John',
        lastName: 'Owner',
        role: 'Owner',
        isActive: true
      },
      {
        id: 'user-fmc-1',
        email: 'fmc@example.com',
        firstName: 'Jane',
        lastName: 'FMC',
        role: 'FMCHead',
        isActive: true
      },
      {
        id: 'user-tenant-1',
        email: 'tenant1@example.com',
        firstName: 'Alice',
        lastName: 'Tenant',
        role: 'Tenant',
        isActive: true
      },
      {
        id: 'user-tenant-2',
        email: 'tenant2@example.com',
        firstName: 'Bob',
        lastName: 'Tenant',
        role: 'Tenant',
        isActive: true
      },
      {
        id: 'user-supervisor-1',
        email: 'supervisor@example.com',
        firstName: 'Mike',
        lastName: 'Supervisor',
        role: 'Supervisor',
        isActive: true
      },
      {
        id: 'user-technician-1',
        email: 'technician@example.com',
        firstName: 'Tom',
        lastName: 'Technician',
        role: 'Technician',
        isActive: true
      },
      {
        id: 'user-vendor-1',
        email: 'vendor@example.com',
        firstName: 'Jerry',
        lastName: 'Vendor',
        role: 'Vendor',
        isActive: true
      }
    ];

    for (const user of users) {
      await userRepository.create(user);
    }

    console.log('✅ Users seeded');
  }

  async seedBuildings() {
    console.log('Seeding buildings...');

    const buildingRepository = new BuildingRepository(this.client);

    const buildings = [
      {
        name: 'Sunset Apartments',
        address: '123 Sunset Blvd, Los Angeles, CA 90028',
        ownerId: 'user-owner-1',
        fmcId: 'user-fmc-1'
      },
      {
        name: 'Ocean View Complex',
        address: '456 Ocean Drive, Miami, FL 33139',
        ownerId: 'user-owner-1',
        fmcId: 'user-fmc-1'
      }
    ];

    for (const building of buildings) {
      await buildingRepository.createWithDetails(building);
    }

    console.log('✅ Buildings seeded');
  }

  async seedProperties() {
    console.log('Seeding properties...');

    const propertyRepository = new PropertyRepository(this.client);

    const properties = [
      {
        name: 'Sunset Apt 101',
        address: '123 Sunset Blvd, Apt 101, Los Angeles, CA 90028',
        unitNumber: '101',
        buildingId: '1', // This will be replaced with actual UUID
        tenantId: 'user-tenant-1'
      },
      {
        name: 'Sunset Apt 102',
        address: '123 Sunset Blvd, Apt 102, Los Angeles, CA 90028',
        unitNumber: '102',
        buildingId: '1', // This will be replaced with actual UUID
        tenantId: 'user-tenant-2'
      },
      {
        name: 'Ocean View 201',
        address: '456 Ocean Drive, Apt 201, Miami, FL 33139',
        unitNumber: '201',
        buildingId: '2', // This will be replaced with actual UUID
        tenantId: 'user-tenant-1'
      }
    ];

    // Get actual building UUIDs
    const buildings = await this.client.query('SELECT id FROM buildings');

    for (let i = 0; i < properties.length; i++) {
      const buildingIndex = i < 2 ? 0 : 1; // First 2 properties in first building, rest in second
      properties[i].buildingId = buildings.rows[buildingIndex].id;
      await propertyRepository.createWithDetails(properties[i]);
    }

    console.log('✅ Properties seeded');
  }

  async seedTickets() {
    console.log('Seeding tickets...');

    const ticketRepository = new TicketRepository(this.client);

    const properties = await this.client.query('SELECT id FROM properties');

    const tickets = [
      {
        title: 'Leaking Faucet in Kitchen',
        description: 'The kitchen faucet is leaking and needs to be repaired urgently.',
        status: 'New' as TicketStatus,
        priority: 'Medium' as TicketPriority,
        propertyId: properties.rows[0].id,
        tenantId: 'user-tenant-1'
      },
      {
        title: 'AC Not Working',
        description: 'Air conditioning unit is not cooling properly. Temperature is very high.',
        status: 'Assigned' as TicketStatus,
        priority: 'High' as TicketPriority,
        propertyId: properties.rows[0].id,
        tenantId: 'user-tenant-1',
        assignedTo: 'user-technician-1',
        assignedBy: 'user-supervisor-1'
      },
      {
        title: 'Broken Window',
        description: 'Window in living room is cracked and needs replacement.',
        status: 'InProgress' as TicketStatus,
        priority: 'Medium' as TicketPriority,
        propertyId: properties.rows[1].id,
        tenantId: 'user-tenant-2',
        assignedTo: 'user-technician-1',
        assignedBy: 'user-supervisor-1'
      },
      {
        title: 'Electrical Issues',
        description: 'Power outlets in bedroom are not working properly.',
        status: 'Emergency' as TicketStatus,
        priority: 'Emergency' as TicketPriority,
        propertyId: properties.rows[2].id,
        tenantId: 'user-tenant-1'
      }
    ];

    for (const ticket of tickets) {
      await ticketRepository.createWithDetails(ticket);
    }

    console.log('✅ Tickets seeded');
  }

  async seedMedia() {
    console.log('Seeding media...');

    const mediaRepository = new MediaRepository(this.client);
    const tickets = await this.client.query('SELECT id FROM tickets');

    const mediaItems = [
      {
        filename: 'leaking_faucet.jpg',
        originalName: 'leaking_faucet.jpg',
        mimetype: 'image/jpeg',
        size: 2048576,
        type: 'Image' as const,
        context: 'TicketCreation' as const,
        ticketId: tickets.rows[0].id,
        uploadedBy: 'user-tenant-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        filename: 'ac_unit.jpg',
        originalName: 'ac_unit.jpg',
        mimetype: 'image/jpeg',
        size: 3072000,
        type: 'Image' as const,
        context: 'TicketCreation' as const,
        ticketId: tickets.rows[1].id,
        uploadedBy: 'user-tenant-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        filename: 'broken_window.jpg',
        originalName: 'broken_window.jpg',
        mimetype: 'image/jpeg',
        size: 1536000,
        type: 'Image' as const,
        context: 'TicketCreation' as const,
        ticketId: tickets.rows[2].id,
        uploadedBy: 'user-tenant-2',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const media of mediaItems) {
      await mediaRepository.createWithDetails(media);
    }

    console.log('✅ Media seeded');
  }

  async run() {
    try {
      await this.connect();

      await this.clearData();
      await this.seedUsers();
      await this.seedBuildings();
      await this.seedProperties();
      await this.seedTickets();
      await this.seedMedia();

      console.log('🎉 Database seeded successfully!');
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'facility_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  };

  const seeder = new DatabaseSeeder(connectionConfig);
  seeder.run().catch(console.error);
}