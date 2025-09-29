export * from './repositories';
export * from './migrations/run';
export * from './seeds/run';

import { Client } from 'pg';
import {
  UserRepository,
  PropertyRepository,
  BuildingRepository,
  TicketRepository,
  MediaRepository
} from './repositories';

export class DatabaseManager {
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

  get repositories() {
    return {
      users: new UserRepository(this.client),
      properties: new PropertyRepository(this.client),
      buildings: new BuildingRepository(this.client),
      tickets: new TicketRepository(this.client),
      media: new MediaRepository(this.client)
    };
  }
}