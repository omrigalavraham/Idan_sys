import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// חיבור ל-DB המקומי
const localPool = new Pool({
  connectionString: process.env.LOCAL_DATABASE_URL,
  ssl: false,
});

// חיבור ל-DB בענן Render
const renderPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// רשימת הטבלאות שתרצה לסנכרן
const tables = [
  'users',
  'user_sessions',
  'customers',
  'customer_services',
  'payments',
  'leads',
  'tasks',
  'unified_events',
  'attendance_records',
  'system_settings',
  'user_profiles',
  'system_clients',
  'persistent_notifications',
  'activity_logs',
  'saved_reports',
];

async function syncTable(tableName) {
  console.log(`Syncing table: ${tableName}...`);

  const localData = await localPool.query(`SELECT * FROM ${tableName}`);

  if (localData.rows.length === 0) {
    console.log(`No rows to sync in table ${tableName}`);
    return;
  }

  await renderPool.query(`DELETE FROM ${tableName}`);

  for (const row of localData.rows) {
    const columns = Object.keys(row).map(col => `"${col}"`).join(', ');
    const values = Object.values(row)
      .map(val => (val === null ? 'NULL' : `'${JSON.stringify(val).replace(/'/g, "''")}'`))
      .join(', ');

    const insertQuery = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;
    await renderPool.query(insertQuery);
  }

  console.log(`✅ Table ${tableName} synced successfully (${localData.rows.length} rows)`);
}

async function syncAll() {
  try {
    for (const table of tables) {
      await syncTable(table);
    }
    console.log('🎉 All tables synced successfully!');
  } catch (error) {
    console.error('❌ Error syncing tables:', error);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

syncAll();
