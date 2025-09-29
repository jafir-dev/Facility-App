import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type FilterQuery<T> = {
  [P in keyof T]?: T[P] | T[P][];
};

export type UpdateQuery<T> = {
  [P in keyof T]?: T[P];
};

export abstract class BaseRepository<T extends BaseEntity> {
  protected tableName: string;
  protected client: Client;

  constructor(tableName: string, client: Client) {
    this.tableName = tableName;
    this.client = client;
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const id = uuidv4();
    const now = new Date();
    const entity: T = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now
    } as T;

    const columns = Object.keys(data).map(k => this.toSnakeCase(k)).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns}, id, created_at, updated_at)
      VALUES (${placeholders}, $${values.length + 1}, $${values.length + 2}, $${values.length + 3})
      RETURNING *
    `;

    const result = await this.client.query(query, [...values, id, now, now]);
    return this.transformToCamelCase(result.rows[0]);
  }

  async findById(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.client.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.transformToCamelCase(result.rows[0]);
  }

  async findAll(filter?: FilterQuery<T>, limit?: number, offset?: number): Promise<T[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const values: any[] = [];
    let paramIndex = 1;

    if (filter && Object.keys(filter).length > 0) {
      const whereClauses = Object.entries(filter).map(([key, value]) => {
        if (Array.isArray(value)) {
          values.push(...value);
          return `${this.toSnakeCase(key)} IN (${value.map((_, i) => `$${paramIndex++}`).join(', ')})`;
        } else {
          values.push(value);
          return `${this.toSnakeCase(key)} = $${paramIndex++}`;
        }
      });
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(limit);
      paramIndex++;
    }

    if (offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(offset);
    }

    const result = await this.client.query(query, values);
    return result.rows.map(row => this.transformToCamelCase(row));
  }

  async update(id: string, data: UpdateQuery<T>): Promise<T | null> {
    if (Object.keys(data).length === 0) {
      return this.findById(id);
    }

    const setClauses = Object.keys(data).map((key, index) =>
      `${this.toSnakeCase(key)} = $${index + 1}`
    ).join(', ');

    const values = Object.values(data);
    const query = `
      UPDATE ${this.tableName}
      SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length + 1}
      RETURNING *
    `;

    const result = await this.client.query(query, [...values, id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.transformToCamelCase(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await this.client.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async count(filter?: FilterQuery<T>): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const values: any[] = [];
    let paramIndex = 1;

    if (filter && Object.keys(filter).length > 0) {
      const whereClauses = Object.entries(filter).map(([key, value]) => {
        if (Array.isArray(value)) {
          values.push(...value);
          return `${this.toSnakeCase(key)} IN (${value.map((_, i) => `$${paramIndex++}`).join(', ')})`;
        } else {
          values.push(value);
          return `${this.toSnakeCase(key)} = $${paramIndex++}`;
        }
      });
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const result = await this.client.query(query, values);
    return parseInt(result.rows[0].count);
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  protected transformToCamelCase(row: any): T {
    const transformed: any = {};
    for (const [key, value] of Object.entries(row)) {
      transformed[this.toCamelCase(key)] = value;
    }
    return transformed as T;
  }
}