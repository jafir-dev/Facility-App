import { Client } from 'pg';
import { BaseRepository, FilterQuery, UpdateQuery } from './base.repository';
import { Property, Building } from '@facility-app/shared-types';

export interface PropertyFilter extends FilterQuery<Property> {
  buildingId?: string;
  tenantId?: string;
}

export interface PropertyUpdate extends UpdateQuery<Property> {
  name?: string;
  address?: string;
  unitNumber?: string;
  buildingId?: string;
  tenantId?: string;
}

export interface BuildingFilter extends FilterQuery<Building> {
  ownerId?: string;
  fmcId?: string;
}

export interface BuildingUpdate extends UpdateQuery<Building> {
  name?: string;
  address?: string;
  ownerId?: string;
  fmcId?: string;
}

export class PropertyRepository extends BaseRepository<Property> {
  constructor(client: Client) {
    super('properties', client);
  }

  async findByBuilding(buildingId: string): Promise<Property[]> {
    return this.findAll({ buildingId });
  }

  async findByTenant(tenantId: string): Promise<Property[]> {
    return this.findAll({ tenantId });
  }

  async createWithDetails(propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> {
    const query = `
      INSERT INTO properties (id, name, address, unit_number, building_id, tenant_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      propertyData.name,
      propertyData.address,
      propertyData.unitNumber,
      propertyData.buildingId,
      propertyData.tenantId
    ];

    const result = await this.client.query(query, values);
    return this.transformToCamelCase(result.rows[0]);
  }
}

export class BuildingRepository extends BaseRepository<Building> {
  constructor(client: Client) {
    super('buildings', client);
  }

  async findByOwner(ownerId: string): Promise<Building[]> {
    return this.findAll({ ownerId });
  }

  async findByFmc(fmcId: string): Promise<Building[]> {
    return this.findAll({ fmcId });
  }

  async createWithDetails(buildingData: Omit<Building, 'id' | 'createdAt' | 'updatedAt'>): Promise<Building> {
    const query = `
      INSERT INTO buildings (id, name, address, owner_id, fmc_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      buildingData.name,
      buildingData.address,
      buildingData.ownerId,
      buildingData.fmcId
    ];

    const result = await this.client.query(query, values);
    return this.transformToCamelCase(result.rows[0]);
  }
}