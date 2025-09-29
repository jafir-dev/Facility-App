import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

interface Migration {
  id: string;
  name: string;
  timestamp: Date;
  applied: boolean;
}

export class MigrationRunner {
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

  async createMigrationsTable() {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name)
      );
    `);
  }

  async getAppliedMigrations(): Promise<Migration[]> {
    const result = await this.client.query(`
      SELECT id, name, applied_at as "timestamp", true as "applied"
      FROM migrations
      ORDER BY applied_at ASC
    `);
    return result.rows;
  }

  async getMigrationFiles(): Promise<string[]> {
    const migrationsDir = path.join(__dirname);
    const files = await fs.promises.readdir(migrationsDir);
    return files
      .filter(file => file.endsWith('.sql') && file !== 'run.ts' && file !== 'create.ts')
      .sort();
  }

  async applyMigration(migrationFile: string) {
    const migrationPath = path.join(__dirname, migrationFile);
    const sql = await readFile(migrationPath, 'utf8');

    console.log(`Applying migration: ${migrationFile}`);

    try {
      await this.client.query('BEGIN');
      await this.client.query(sql);
      await this.client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migrationFile]
      );
      await this.client.query('COMMIT');
      console.log(`✅ Migration ${migrationFile} applied successfully`);
    } catch (error) {
      await this.client.query('ROLLBACK');
      console.error(`❌ Migration ${migrationFile} failed:`, error);
      throw error;
    }
  }

  async run() {
    try {
      await this.connect();
      await this.createMigrationsTable();

      const appliedMigrations = await this.getAppliedMigrations();
      const appliedNames = new Set(appliedMigrations.map(m => m.name));
      const migrationFiles = await this.getMigrationFiles();

      const pendingMigrations = migrationFiles.filter(
        file => !appliedNames.has(file)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ Database is up to date');
        return;
      }

      console.log(`Found ${pendingMigrations.length} pending migrations`);

      for (const migrationFile of pendingMigrations) {
        await this.applyMigration(migrationFile);
      }

      console.log('✅ All migrations applied successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'facility_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  };

  const runner = new MigrationRunner(connectionConfig);
  runner.run().catch(console.error);
}