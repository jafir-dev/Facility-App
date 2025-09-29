import { Client } from 'pg';
import { BaseRepository, FilterQuery, UpdateQuery } from './base.repository';
import { User, UserRole } from '@facility-app/shared-types';

export interface UserFilter extends FilterQuery<User> {
  role?: UserRole | UserRole[];
  isActive?: boolean;
  email?: string;
}

export interface UserUpdate extends UpdateQuery<User> {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export class UserRepository extends BaseRepository<User> {
  constructor(client: Client) {
    super('users', client);
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await this.client.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.transformToCamelCase(result.rows[0]);
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.findAll({ role });
  }

  async findActiveUsers(): Promise<User[]> {
    return this.findAll({ isActive: true });
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { id: string }): Promise<User> {
    const query = `
      INSERT INTO users (id, email, first_name, last_name, role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      userData.id,
      userData.email,
      userData.firstName,
      userData.lastName,
      userData.role,
      userData.isActive
    ];

    const result = await this.client.query(query, values);
    return this.transformToCamelCase(result.rows[0]);
  }

  async update(id: string, userData: UserUpdate): Promise<User | null> {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (userData.email !== undefined) {
      setClauses.push(`email = $${paramIndex}`);
      values.push(userData.email);
      paramIndex++;
    }

    if (userData.firstName !== undefined) {
      setClauses.push(`first_name = $${paramIndex}`);
      values.push(userData.firstName);
      paramIndex++;
    }

    if (userData.lastName !== undefined) {
      setClauses.push(`last_name = $${paramIndex}`);
      values.push(userData.lastName);
      paramIndex++;
    }

    if (userData.role !== undefined) {
      setClauses.push(`role = $${paramIndex}`);
      values.push(userData.role);
      paramIndex++;
    }

    if (userData.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex}`);
      values.push(userData.isActive);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);
    const result = await this.client.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.transformToCamelCase(result.rows[0]);
  }
}