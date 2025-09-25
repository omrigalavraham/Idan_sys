import { testConnection, initializeDatabase } from './server/database/connection.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

(async (): Promise<void> => {
  console.log('🔍 Testing database connection...');
  console.log('📊 Database config:');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
  console.log(`   LOCAL_DATABASE_URL: ${process.env.LOCAL_DATABASE_URL ? 'Set' : 'Not set'}`);
  console.log(`   Host: ${process.env.DB_HOST || 'dpg-d3antq7fte5s73dgjgl0-a.frankfurt-postgres.render.com'}`);
  console.log(`   Port: ${process.env.DB_PORT || '5432'}`);
  console.log(`   Database: ${process.env.DB_NAME || 'idan_db'}`);
  console.log(`   User: ${process.env.DB_USER || 'idan_db_user'}`);
  console.log('');

  try {
    const ok = await testConnection();
    if (ok) {
      console.log('✅ Database is online and connected!');
      
      // Optional: Initialize database schema
      console.log('🔧 Initializing database schema...');
      await initializeDatabase();
      console.log('✅ Database schema initialized successfully!');
    } else {
      console.log('❌ Database connection failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during database test:', (error as Error).message);
    process.exit(1);
  }
})();
