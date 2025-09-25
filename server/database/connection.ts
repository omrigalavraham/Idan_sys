import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// --------------------------------------
// 1️⃣ הגדרת חיבור למסד נתונים
// --------------------------------------
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = isProduction
  ? process.env.DATABASE_URL
  : process.env.LOCAL_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    `❌ No database URL provided. Make sure ${
      isProduction ? 'DATABASE_URL' : 'LOCAL_DATABASE_URL'
    } is set in your .env`
  );
}

// --------------------------------------
// 2️⃣ יצירת Pool של חיבורים
// --------------------------------------
// Allow opting into SSL in dev if DB requires it (e.g., Render/local proxy)
const shouldUseSsl = isProduction || process.env.DB_SSL === 'true' || /sslmode=require/i.test(databaseUrl || '');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

console.log(
  `🔗 Connected to ${isProduction ? 'Render (CLOUD)' : 'Local (DEV)'} database (SSL: ${shouldUseSsl ? 'on' : 'off'})`
);

// --------------------------------------
// 3️⃣ בדיקה פשוטה של חיבור למסד
// --------------------------------------
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// --------------------------------------
// 4️⃣ פונקציה להרצת שאילתות
// --------------------------------------
export const query = async (text: string, params: any[] = []): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// --------------------------------------
// 5️⃣ קבלת client מה-Pool (לטרנזקציות)
// --------------------------------------
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

// --------------------------------------
// 6️⃣ אתחול מסד נתונים (יצירת טבלאות אם לא קיימות)
// --------------------------------------
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('Initializing database...');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');

    const schema = fs.readFileSync(schemaPath, 'utf8');
    await query(schema);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// --------------------------------------
// 7️⃣ סגירת Pool בצורה נקייה
// --------------------------------------
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
};

// --------------------------------------
// 8️⃣ export ברירת מחדל
// --------------------------------------
export default pool;
