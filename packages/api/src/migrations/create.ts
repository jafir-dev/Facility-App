import * as fs from 'fs';
import * as path from 'path';

export async function createMigration(name: string) {
  const migrationsDir = path.join(__dirname);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const fileName = `${timestamp}-${name}.sql`;
  const filePath = path.join(migrationsDir, fileName);

  const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your SQL migration here

`;

  try {
    await fs.promises.writeFile(filePath, template);
    console.log(`✅ Migration file created: ${fileName}`);
  } catch (error) {
    console.error('❌ Failed to create migration file:', error);
    throw error;
  }
}

// Create migration if this file is executed directly
if (require.main === module) {
  const name = process.argv[2];
  if (!name) {
    console.error('❌ Please provide a migration name');
    process.exit(1);
  }
  createMigration(name).catch(console.error);
}