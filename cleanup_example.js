// דוגמה לשימוש במערכת הניקוי האוטומטית
// Example usage of the automatic cleanup system

const API_BASE = 'http://localhost:8080/api';
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN_HERE'; // החלף בטוקן admin אמיתי

// פונקציה עזר לשליחת בקשות
async function apiRequest(endpoint, method = 'GET', body = null) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    },
    body: body ? JSON.stringify(body) : null
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// דוגמאות שימוש
async function examples() {
  try {
    console.log('🧹 דוגמאות למערכת הניקוי האוטומטית');
    console.log('=====================================\n');

    // 1. בדיקת סטטוס המערכת
    console.log('1. בדיקת סטטוס המערכת:');
    const status = await apiRequest('/cleanup/status');
    console.log('סטטוס:', status);
    console.log('');

    // 2. בדיקת משתמשים ממתינים למחיקה
    console.log('2. משתמשים ממתינים למחיקה:');
    const pendingUsers = await apiRequest('/users/pending-deletion-count');
    console.log(`מספר משתמשים ממתינים למחיקה: ${pendingUsers.pendingDeletionCount}`);
    console.log('');

    // 3. בדיקת לקוחות מערכת ממתינים למחיקה
    console.log('3. לקוחות מערכת ממתינים למחיקה:');
    const pendingClients = await apiRequest('/system-clients/pending-deletion-count');
    console.log(`מספר לקוחות מערכת ממתינים למחיקה: ${pendingClients.pendingDeletionCount}`);
    console.log('');

    // 4. הפעלת ניקוי ידני
    console.log('4. הפעלת ניקוי ידני:');
    const cleanupResult = await apiRequest('/cleanup/trigger', 'POST');
    console.log('תוצאות הניקוי:', cleanupResult);
    console.log('');

    // 5. מחיקה רכה של משתמש (דוגמה)
    console.log('5. מחיקה רכה של משתמש (דוגמה - לא מופעל):');
    console.log('// מחיקה רכה של משתמש עם ID 123:');
    console.log('// await apiRequest("/users/123/soft", "DELETE");');
    console.log('');

    // 6. מחיקה רכה של לקוח מערכת (דוגמה)
    console.log('6. מחיקה רכה של לקוח מערכת (דוגמה - לא מופעל):');
    console.log('// מחיקה רכה של לקוח מערכת עם ID 456:');
    console.log('// await apiRequest("/system-clients/456/soft", "DELETE");');
    console.log('');

    console.log('✅ כל הדוגמאות הושלמו בהצלחה!');

  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }
}

// הפעלת הדוגמאות
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  examples();
} else {
  // Browser environment
  examples();
}

// הוראות שימוש:
console.log(`
📋 הוראות שימוש:

1. החלף את ADMIN_TOKEN בטוקן admin אמיתי
2. ודא שהשרת רץ על http://localhost:8080
3. הפעל את הסקריפט: node cleanup_example.js

🔧 API Endpoints זמינים:

ניקוי משתמשים:
- POST /api/users/cleanup-deleted
- GET /api/users/pending-deletion-count  
- DELETE /api/users/:id/soft

ניקוי לקוחות מערכת:
- POST /api/system-clients/cleanup-deleted
- GET /api/system-clients/pending-deletion-count
- DELETE /api/system-clients/:id/soft

ניהול מערכת הניקוי:
- GET /api/cleanup/status
- POST /api/cleanup/trigger
- POST /api/cleanup/start
- POST /api/cleanup/stop

⏰ המערכת רצה אוטומטית כל יום בשעה 2:00 בבוקר
`);
