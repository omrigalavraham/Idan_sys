import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

async function setupDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    const schema = fs.readFileSync('./init.sql', 'utf8');
    await client.query(schema);
    console.log('✅ Database schema created successfully');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();