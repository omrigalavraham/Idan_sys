-- Lead Management System Database Schema
-- מערכת ניהול לידים - סכמת מסד נתונים מלאה

-- Users table - טבלת משתמשים
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'agent', -- 'admin', 'manager', 'agent'
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    department TEXT,
    phone_number TEXT,
    notes TEXT,
    client_id INTEGER, -- שיוך ללקוח מערכת (יוגדר כ-FK לאחר יצירת system_clients)
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- מנהל האחראי על הנציג
    call_history JSONB DEFAULT '[]'::jsonb, -- היסטוריית שיחות אישית של המשתמש
    contacts JSONB DEFAULT '[]'::jsonb, -- אנשי קשר אישיים של המשתמש
    favorite_numbers TEXT[] DEFAULT '{}', -- מספרים מועדפים
    recent_numbers TEXT[] DEFAULT '{}', -- מספרים אחרונים
    call_settings JSONB DEFAULT '{
      "autoRecord": false,
      "showCallerId": true,
      "blockUnknownNumbers": false,
      "defaultCallDuration": 0
    }'::jsonb, -- הגדרות שיחה אישיות
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL -- תאריך מחיקה רכה (לא בשימוש - משתמשים נמחקים אמיתית)
);
ALTER TABLE users
ADD COLUMN IF NOT EXISTS call_history JSONB DEFAULT '[]'::jsonb, -- היסטוריית שיחות אישית של המשתמש
ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb, -- אנשי קשר אישיים של המשתמש
ADD COLUMN IF NOT EXISTS favorite_numbers TEXT[] DEFAULT '{}', -- מספרים מועדפים
ADD COLUMN IF NOT EXISTS recent_numbers TEXT[] DEFAULT '{}', -- מספרים אחרונים
ADD COLUMN IF NOT EXISTS call_settings JSONB DEFAULT '{
  "autoRecord": false,
  "showCallerId": true,
  "blockUnknownNumbers": false,
  "defaultCallDuration": 0
}'::jsonb, -- הגדרות שיחה אישיות
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL; -- מי יצר את המשתמש

-- Add missing vat_type column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS vat_type TEXT DEFAULT 'plus';

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_fingerprint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table - טבלת לקוחות עסקיים
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER, -- קישור לליד המקורי
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    client_id INTEGER, -- שיוך ללקוח מערכת
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'פעיל',
    address TEXT,
    company_name TEXT,
    company_id TEXT,
    vat_number TEXT,
    assigned_rep TEXT,
    payment_status TEXT DEFAULT 'ממתין לתשלום',
    billing_frequency TEXT DEFAULT 'חודשי',
    total_amount DECIMAL(10,2) DEFAULT 0,
    start_date DATE,
    payment_plan JSONB,
    payment_type TEXT DEFAULT 'amount', -- 'amount' or 'percentage'
    payment_value DECIMAL(10,2), -- סכום או אחוז
    payment_vat_included BOOLEAN DEFAULT false, -- האם כולל מע"מ (רק לאחוזים)
    vat_type TEXT DEFAULT 'plus', -- 'plus' or 'included'
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer services table
CREATE TABLE IF NOT EXISTS customer_services (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    amount DECIMAL(10,2),
    tax_type TEXT,
    total DECIMAL(10,2),
    billing_frequency TEXT
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2),
    payment_status TEXT,
    start_date DATE,
    installments INT,
    installment_amount DECIMAL(10,2),
    payment_type TEXT DEFAULT 'amount', -- 'amount' or 'percentage'
    payment_value DECIMAL(10,2), -- סכום או אחוז
    vat_included BOOLEAN DEFAULT false, -- האם כולל מע"מ (רק לאחוזים)
    notes TEXT
);

-- Leads table - טבלת לידים
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'חדש',
    source TEXT,
    callback_date DATE,
    callback_time TIME,
    potential_value DECIMAL(10,2),
    last_contact TIMESTAMP,
    product TEXT,
    amount DECIMAL(10,2),
    closing_date DATE,
    history JSONB DEFAULT '[]',
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    client_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- טבלאות חדשות שנדרשות למערכת
-- ========================================

-- Tasks table - טבלת משימות
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ממתין', -- 'ממתין', 'בביצוע', 'הושלם'
    priority TEXT NOT NULL DEFAULT 'בינוני', -- 'נמוך', 'בינוני', 'גבוה'
    due_date TIMESTAMP NOT NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified BOOLEAN DEFAULT FALSE
);

-- Unified Events table - טבלה מאוחדת לכל האירועים (תזכורות, פגישות, לידים, משימות)
CREATE TABLE IF NOT EXISTS unified_events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('reminder', 'meeting', 'task')),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    
    -- שדות ספציפיים לתזכורות
    advance_notice INTEGER DEFAULT 0, -- 0 = no reminder, >0 = minutes before
    is_active BOOLEAN DEFAULT TRUE,
    notified BOOLEAN DEFAULT FALSE,
    
    -- שדות לקישור לישויות אחרות
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    customer_name TEXT, -- שמור עבור תזכורות ללא customer_id
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- מטא-דאטה
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Attendance Records table - טבלת נוכחות עובדים
CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP,
    total_hours DECIMAL(4,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Settings table - טבלת הגדרות מערכת
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key)
);

-- User Profiles table - טבלת פרופיל משתמשים מורחב
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    phone TEXT,
    company TEXT,
    position TEXT,
    location TEXT,
    timezone TEXT DEFAULT 'Asia/Jerusalem',
    bio TEXT,
    avatar_url TEXT,
    join_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Clients table - טבלת לקוחות מערכת
CREATE TABLE IF NOT EXISTS system_clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    primary_color TEXT DEFAULT '#3b82f6',
    secondary_color TEXT DEFAULT '#1e40af',
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    lead_statuses JSONB DEFAULT '[]', -- סטטוסי לידים
    customer_statuses JSONB DEFAULT '[]', -- סטטוסי לקוחות
    payment_statuses JSONB DEFAULT '[]', -- סטטוסי תשלום
    features JSONB DEFAULT '{}', -- תכונות (איזה דפים יופיעו במערכת)
    message_templates JSONB DEFAULT '[]', -- תבניות הודעות (ווצאפ/אמייל/סמס)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE system_clients
ADD COLUMN IF NOT EXISTS lead_statuses JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS customer_statuses JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS payment_statuses JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS message_templates JSONB DEFAULT '[]';

-- כל המידע נשמר בטבלת system_clients עצמה בשדות JSONB
-- אין צורך בטבלאות נפרדות

-- Persistent Notifications table - טבלת התראות קבועות
CREATE TABLE IF NOT EXISTS persistent_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'lead', 'task', 'callback', 'system'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    metadata JSONB,
    expires_at TIMESTAMP, -- התראות עם תפוגה
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs table - טבלת היסטוריית פעולות
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'lead', 'customer', 'task', 'user', etc.
    entity_id TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved Reports table - טבלת דוחות שמורים
CREATE TABLE IF NOT EXISTS saved_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    filters JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- אינדקסים לביצועים טובים יותר
-- ========================================
-- הסרת עמודות שלא נחוצות יותר
ALTER TABLE system_clients 
DROP COLUMN IF EXISTS task_statuses,
DROP COLUMN IF EXISTS workflow_settings;

-- אינדקסים לטבלאות קיימות
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);

-- אינדקסים לטבלאות עם שדות חדשים (לאחר יצירת הטבלאות החדשות)
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_client_id ON customers(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);

-- אינדקסים לטבלאות חדשות
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);

-- אינדקסים לטבלה המאוחדת החדשה
CREATE INDEX IF NOT EXISTS idx_unified_events_type ON unified_events(event_type);
CREATE INDEX IF NOT EXISTS idx_unified_events_start_time ON unified_events(start_time);
CREATE INDEX IF NOT EXISTS idx_unified_events_customer_id ON unified_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_unified_events_lead_id ON unified_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_unified_events_task_id ON unified_events(task_id);
CREATE INDEX IF NOT EXISTS idx_unified_events_created_by ON unified_events(created_by);
CREATE INDEX IF NOT EXISTS idx_unified_events_active ON unified_events(is_active);
CREATE INDEX IF NOT EXISTS idx_unified_events_notified ON unified_events(notified);
CREATE INDEX IF NOT EXISTS idx_unified_events_advance_notice ON unified_events(advance_notice);


CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON persistent_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON persistent_notifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- אינדקסים לטבלת system_clients
CREATE INDEX IF NOT EXISTS idx_system_clients_name ON system_clients(name);
CREATE INDEX IF NOT EXISTS idx_system_clients_company_name ON system_clients(company_name);
CREATE INDEX IF NOT EXISTS idx_system_clients_is_active ON system_clients(is_active);

-- אינדקסים להיסטוריית שיחות ואנשי קשר
CREATE INDEX IF NOT EXISTS idx_users_call_history ON users USING GIN (call_history);
CREATE INDEX IF NOT EXISTS idx_users_contacts ON users USING GIN (contacts);
CREATE INDEX IF NOT EXISTS idx_users_favorite_numbers ON users USING GIN (favorite_numbers);

-- ========================================
-- טריגרים לעדכון אוטומטי של updated_at ומחיקה רכה
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- פונקציה למחיקה רכה של משתמש
CREATE OR REPLACE FUNCTION soft_delete_user()
RETURNS TRIGGER AS $$
BEGIN
    -- במקום למחוק, עדכן את deleted_at
    UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    RETURN NULL; -- מונע את המחיקה האמיתית
END;
$$ language 'plpgsql';

-- פונקציה למחיקה אוטומטית של משתמשים שנמחקו לפני יותר מחודש
CREATE OR REPLACE FUNCTION cleanup_deleted_users()
RETURNS void AS $$
BEGIN
    DELETE FROM users 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < CURRENT_TIMESTAMP - INTERVAL '1 month';
END;
$$ language 'plpgsql';

-- טריגרים לטבלאות עם שדה updated_at
DO $$
BEGIN
    -- טריגר לטבלת users
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- טריגר למחיקה רכה של משתמשים - הוסר לטובת מחיקה אמיתית
    -- IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'soft_delete_users_trigger') THEN
    --     CREATE TRIGGER soft_delete_users_trigger BEFORE DELETE ON users 
    --         FOR EACH ROW EXECUTE FUNCTION soft_delete_user();
    -- END IF;

    -- טריגר לטבלת customers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at') THEN
        CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- טריגר לטבלת leads
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_leads_updated_at') THEN
        CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- טריגר לטבלת tasks
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at') THEN
        CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- טריגר לטבלה המאוחדת החדשה
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_unified_events_updated_at') THEN
        CREATE TRIGGER update_unified_events_updated_at BEFORE UPDATE ON unified_events 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;


    -- טריגר לטבלת system_settings
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_settings_updated_at') THEN
        CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- טריגר לטבלת user_profiles
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at') THEN
        CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- טריגר לטבלת system_clients
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_clients_updated_at') THEN
        CREATE TRIGGER update_system_clients_updated_at BEFORE UPDATE ON system_clients 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- טריגר לטבלת saved_reports
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_saved_reports_updated_at') THEN
        CREATE TRIGGER update_saved_reports_updated_at BEFORE UPDATE ON saved_reports 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- טריגר לטבלת system_clients כבר מוגדר למעלה
END $$;

-- ========================================
-- עדכון קשרים לאחר יצירת כל הטבלאות
-- ========================================

-- הוספת קשרים שהיו חסרים בגלל סדר יצירת הטבלאות
DO $$
BEGIN
    -- הוספת קשר בין users ל-system_clients
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_client_id_fkey' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES system_clients(id) ON DELETE SET NULL;
    END IF;

    -- הוספת קשר בין customers ל-system_clients
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'customers_client_id_fkey' 
        AND table_name = 'customers'
    ) THEN
        ALTER TABLE customers 
        ADD CONSTRAINT customers_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES system_clients(id) ON DELETE SET NULL;
    END IF;

    -- הוספת קשר בין leads ל-system_clients
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leads_client_id_fkey' 
        AND table_name = 'leads'
    ) THEN
        ALTER TABLE leads 
        ADD CONSTRAINT leads_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES system_clients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ========================================
-- תיקונים ומיגרציות
-- ========================================

-- תיקון טבלת tasks - אפשרות ל-assigned_to להיות NULL
DO $$
BEGIN
    -- עדכון משימות קיימות עם assigned_to לא תקין
    UPDATE tasks SET assigned_to = NULL WHERE assigned_to NOT IN (SELECT id FROM users);
    
    -- שינוי הטבלה לאפשר NULL ב-assigned_to
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'assigned_to' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE tasks ALTER COLUMN assigned_to DROP NOT NULL;
    END IF;
    
    -- הוספת הערה לתיעוד השינוי
    COMMENT ON COLUMN tasks.assigned_to IS 'User ID who the task is assigned to. Can be NULL if not assigned to anyone.';
END $$;


-- הערה על הטבלה החדשה
COMMENT ON TABLE unified_events IS 'Unified table for all events: reminders, meetings, leads, tasks. Replaces customer_reminders and calendar_events tables.';
COMMENT ON COLUMN unified_events.event_type IS 'Type of event: reminder, meeting, lead, task';
COMMENT ON COLUMN unified_events.advance_notice IS 'Minutes before event to show notification. 0 = no notification';
COMMENT ON COLUMN unified_events.is_active IS 'Whether the event is active (for reminders)';
COMMENT ON COLUMN unified_events.notified IS 'Whether notification was already sent (for reminders)';

-- ========================================
-- מיגרציה וניקוי טבלאות ישנות
-- Migration and cleanup of legacy tables
-- ========================================

-- שלב 1: מיגרציה של נתונים מהטבלאות הישנות (אם קיימות)
DO $$
BEGIN
    -- מיגרציה מטבלת customer_reminders
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_reminders') THEN
        -- בדיקה אם יש נתונים בטבלת customer_reminders
        IF EXISTS (SELECT 1 FROM customer_reminders LIMIT 1) THEN
            -- העברת נתונים לטבלה המאוחדת
            INSERT INTO unified_events (
                title, description, event_type, start_time, end_time,
                advance_notice, is_active, notified, customer_id, customer_name,
                created_by, created_at
            )
            SELECT 
                title,
                description,
                'reminder' as event_type,
                (reminder_date + reminder_time) as start_time,
                (reminder_date + reminder_time) as end_time,
                advance_notice,
                is_active,
                notified,
                customer_id,
                customer_name,
                created_by,
                created_at
            FROM customer_reminders
            WHERE NOT EXISTS (
                SELECT 1 FROM unified_events 
                WHERE unified_events.title = customer_reminders.title 
                AND unified_events.customer_name = customer_reminders.customer_name
                AND unified_events.created_by = customer_reminders.created_by
            );
            
            RAISE NOTICE 'Migrated % reminders from customer_reminders to unified_events', 
                (SELECT COUNT(*) FROM customer_reminders);
        END IF;
    END IF;
    
    -- מיגרציה מטבלת calendar_events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        -- בדיקה אם יש נתונים בטבלת calendar_events
        IF EXISTS (SELECT 1 FROM calendar_events LIMIT 1) THEN
            -- העברת נתונים לטבלה המאוחדת
            INSERT INTO unified_events (
                title, description, event_type, start_time, end_time,
                advance_notice, customer_id, lead_id, task_id,
                created_by, created_at, updated_at
            )
            SELECT 
                title,
                description,
                event_type,
                start_time,
                end_time,
                CASE 
                    WHEN event_type IN ('reminder', 'lead') THEN 1440 -- 24 hours default
                    ELSE 0
                END as advance_notice,
                customer_id,
                lead_id,
                task_id,
                created_by,
                created_at,
                updated_at
            FROM calendar_events
            WHERE NOT EXISTS (
                SELECT 1 FROM unified_events 
                WHERE unified_events.title = calendar_events.title 
                AND unified_events.event_type = calendar_events.event_type
                AND unified_events.created_by = calendar_events.created_by
            );
            
            RAISE NOTICE 'Migrated % calendar events to unified_events', 
                (SELECT COUNT(*) FROM calendar_events);
        END IF;
    END IF;
END $$;

-- שלב 2: מחיקת טבלאות ישנות (רק אחרי המיגרציה)
DO $$
BEGIN
    -- מחיקת טבלת customer_reminders
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_reminders') THEN
        DROP TABLE customer_reminders CASCADE;
        RAISE NOTICE 'Legacy table customer_reminders dropped successfully';
    END IF;
    
    -- מחיקת טבלת calendar_events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        DROP TABLE calendar_events CASCADE;
        RAISE NOTICE 'Legacy table calendar_events dropped successfully';
    END IF;
    
    RAISE NOTICE 'All legacy tables cleaned up successfully!';
END $$;

-- שלב 3: בדיקה סופית
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    -- ספירת טבלאות סופית
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE 'Total tables in database: %', table_count;
    
    -- בדיקה שהטבלה המאוחדת קיימת
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_events') THEN
        RAISE NOTICE 'Unified events table exists successfully';
    ELSE
        RAISE EXCEPTION 'Unified events table missing!';
    END IF;
    
    -- בדיקה שאין טבלאות ישנות
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_reminders') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        RAISE NOTICE 'All legacy tables removed successfully';
    ELSE
        RAISE WARNING 'Some legacy tables still exist';
    END IF;
END $$;

-- ========================================
-- פונקציות וטריגרים להיסטוריית שיחות
-- ========================================

-- פונקציה לאיפוס היסטוריית שיחות של כל המשתמשים
CREATE OR REPLACE FUNCTION reset_daily_call_history()
RETURNS void AS $$
BEGIN
    -- איפוס היסטוריית השיחות של כל המשתמשים
    UPDATE users 
    SET call_history = '[]'::jsonb,
        updated_at = CURRENT_TIMESTAMP
    WHERE is_active = true;
    
    -- לוג של הפעולה
    INSERT INTO system_logs (action, details, created_at) 
    VALUES ('call_history_reset', 'Daily call history reset completed', CURRENT_TIMESTAMP);
    
EXCEPTION WHEN OTHERS THEN
    -- במקרה של שגיאה, נשמור לוג
    INSERT INTO system_logs (action, details, error_message, created_at) 
    VALUES ('call_history_reset_error', 'Failed to reset call history', SQLERRM, CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

-- יצירת job לאיפוס יומי ב-2:00 בלילה
-- הערה: זה דורש הרשאות pg_cron או cron job חיצוני
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('reset-call-history', '0 2 * * *', 'SELECT reset_daily_call_history();');

-- ========================================
-- WhatsApp Integration Table - טבלת חיבור ווטסאפ
-- ========================================

-- WhatsApp connections table - טבלת חיבורי ווטסאפ למנהלים
CREATE TABLE IF NOT EXISTS whatsapp_connections (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, -- מנהל אחד יכול להיות מחובר לווטסאפ אחד בלבד
    wa_access_token TEXT NOT NULL, -- טוקן הגישה של Meta WhatsApp
    wa_phone_number_id TEXT NOT NULL, -- מזהה מספר הטלפון של הווטסאפ
    wa_business_account_id TEXT, -- מזהה חשבון העסק (אופציונלי)
    wa_app_id TEXT, -- מזהה האפליקציה של Meta
    wa_webhook_verify_token TEXT, -- טוקן אימות webhook (אופציונלי)
    is_active BOOLEAN DEFAULT TRUE, -- האם החיבור פעיל
    expires_at TIMESTAMP, -- תאריך תפוגת הטוקן (אם רלוונטי)
    last_used_at TIMESTAMP, -- מתי שולחה הודעה אחרונה
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- אינדקסים לטבלת חיבור ווטסאפ
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_manager_id ON whatsapp_connections(manager_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_is_active ON whatsapp_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_expires_at ON whatsapp_connections(expires_at);

-- טריגר לעדכון updated_at בטבלת חיבור ווטסאפ
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_whatsapp_connections_updated_at') THEN
        CREATE TRIGGER update_whatsapp_connections_updated_at BEFORE UPDATE ON whatsapp_connections 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- הערות על טבלת חיבור ווטסאפ
COMMENT ON TABLE whatsapp_connections IS 'WhatsApp connections for managers - stores Meta access tokens and phone number IDs';
COMMENT ON COLUMN whatsapp_connections.manager_id IS 'Manager user ID - each manager can have only one WhatsApp connection';
COMMENT ON COLUMN whatsapp_connections.wa_access_token IS 'Meta WhatsApp access token for sending messages';
COMMENT ON COLUMN whatsapp_connections.wa_phone_number_id IS 'WhatsApp phone number ID from Meta';
COMMENT ON COLUMN whatsapp_connections.wa_business_account_id IS 'Meta business account ID (optional)';
COMMENT ON COLUMN whatsapp_connections.wa_app_id IS 'Meta app ID used for the connection';
COMMENT ON COLUMN whatsapp_connections.is_active IS 'Whether the WhatsApp connection is active and can send messages';
COMMENT ON COLUMN whatsapp_connections.expires_at IS 'Token expiration date (if applicable)';
COMMENT ON COLUMN whatsapp_connections.last_used_at IS 'Last time a message was sent through this connection';

-- ========================================
-- הערות על שדות תשלום
-- ========================================

-- הערות על שדות תשלום בטבלת customers
COMMENT ON COLUMN customers.payment_type IS 'סוג תשלום: amount או percentage';
COMMENT ON COLUMN customers.payment_value IS 'סכום או אחוז תשלום';
COMMENT ON COLUMN customers.payment_vat_included IS 'האם כולל מע"מ (רק לאחוזים)';

-- הערות על שדות תשלום בטבלת payments
COMMENT ON COLUMN payments.payment_type IS 'סוג תשלום: amount או percentage';
COMMENT ON COLUMN payments.payment_value IS 'סכום או אחוז תשלום';
COMMENT ON COLUMN payments.vat_included IS 'האם כולל מע"מ (רק לאחוזים)';

-- ========================================
-- הערות חשובות
-- ========================================

-- 1. כל הטבלאות נוצרות עם IF NOT EXISTS כדי למנוע שגיאות
-- 2. כל האינדקסים נוצרים עם IF NOT EXISTS
-- 3. הטריגרים מעדכנים אוטומטית את שדה updated_at
-- 4. השדות JSONB מאפשרים גמישות בנתונים
-- 5. כל הקשרים מוגדרים עם CASCADE או SET NULL לפי הצורך
-- 6. הטבלאות תומכות בעברית ובנתונים מורכבים
-- 7. הקשרים בין הטבלאות נוצרים בסוף כדי למנוע שגיאות
-- 8. תיקונים ומיגרציות כלולים בקובץ זה
-- 9. הטבלה המאוחדת unified_events מחליפה את customer_reminders ו-calendar_events
-- 10. שדות היסטוריית שיחות ואנשי קשר נוספו לטבלת users (מ-2024-01-15)
