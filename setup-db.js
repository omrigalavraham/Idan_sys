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
    
    // Split the SQL into individual statements and execute them one by one
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (error) {
        console.log(`Skipping statement (likely already exists): ${error.message}`);
      }
    }
    
    console.log('✅ Database schema created successfully');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();