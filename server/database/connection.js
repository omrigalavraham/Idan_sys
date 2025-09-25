import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// --------------------------------------
// 1️⃣ הגדרת חיבור למסד נתונים
// --------------------------------------
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = isProduction
    ? process.env.DATABASE_URL
    : 'postgresql://idan_db_user:mh0krwitmNICFu41ugy7MZjclrmnwp3M@dpg-d3antq7fte5s73dgjgl0-a.frankfurt-postgres.render.com/idan_db';

if (!databaseUrl) {
    throw new Error(`❌ No database URL provided. Make sure ${isProduction ? 'DATABASE_URL' : 'LOCAL_DATABASE_URL'} is set in your .env`);
}

// --------------------------------------
// 2️⃣ יצירת Pool של חיבורים
// --------------------------------------
const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

console.log(`🔗 Connected to ${isProduction ? 'Render (CLOUD)' : 'Local (DEV)'} database`);

// --------------------------------------
// 3️⃣ בדיקה פשוטה של חיבור למסד
// --------------------------------------
export const testConnection = async () => {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connection successful');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
};

// --------------------------------------
// 4️⃣ פונקציה להרצת שאילתות
// --------------------------------------
export const query = async (text, params = []) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    }
    catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// --------------------------------------
// 5️⃣ קבלת client מה-Pool (לטרנזקציות)
// --------------------------------------
export const getClient = async () => {
    return await pool.connect();
};

// --------------------------------------
// 6️⃣ אתחול מסד נתונים (יצירת טבלאות אם לא קיימות)
// --------------------------------------
export const initializeDatabase = async () => {
    try {
        console.log('Initializing database...');
        
        const schema = `
            -- Create tables for lead management system
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                phone VARCHAR(20),
                address TEXT,
                notes TEXT,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
                title VARCHAR(255),
                description TEXT,
                status VARCHAR(100) DEFAULT 'new',
                source VARCHAR(100),
                priority VARCHAR(50) DEFAULT 'medium',
                assigned_to INTEGER,
                value DECIMAL(10,2),
                expected_close_date DATE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS reminders (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                reminder_time TIMESTAMP NOT NULL,
                is_completed BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                priority VARCHAR(50) DEFAULT 'medium',
                assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
                due_date TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS unified_events (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
                customer_name VARCHAR(255),
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'active',
                priority VARCHAR(50) DEFAULT 'medium',
                is_active BOOLEAN DEFAULT true,
                notified BOOLEAN DEFAULT false,
                advance_notice INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
            CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);
            CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
            CREATE INDEX IF NOT EXISTS idx_reminders_customer_id ON reminders(customer_id);
            CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(reminder_time);
            CREATE INDEX IF NOT EXISTS idx_unified_events_start_time ON unified_events(start_time);
            CREATE INDEX IF NOT EXISTS idx_unified_events_customer_id ON unified_events(customer_id);
            CREATE INDEX IF NOT EXISTS idx_unified_events_type ON unified_events(event_type);
        `;
        
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
export const closePool = async () => {
    try {
        await pool.end();
        console.log('Database pool closed');
    }
    catch (error) {
        console.error('Error closing database pool:', error);
    }
};

// --------------------------------------
// 8️⃣ export ברירת מחדל
// --------------------------------------
export default pool;