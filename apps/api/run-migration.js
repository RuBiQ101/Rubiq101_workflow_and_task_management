const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    const migrationPath = path.join(
      __dirname,
      'prisma',
      'migrations',
      '20251107233921_roles_subscriptions_activity',
      'migration.sql'
    );

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Executing migration...');
    
    await client.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
