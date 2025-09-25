import fs from 'fs';
import { query } from './server-dist/server/database/connection.js';

async function setupDatabase() {
  try {
    const schema = fs.readFileSync('./init.sql', 'utf8');
    await query(schema);
    console.log('✅ Database schema created successfully');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();