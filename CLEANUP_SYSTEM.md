# מערכת ניקוי אוטומטית - Cleanup System

## סקירה כללית

המערכת כוללת מנגנון אוטומטי למחיקת משתמשים ולקוחות מערכת שמסומנים למחיקה (soft delete) לאחר חודש.

## תכונות

### 1. מחיקה רכה (Soft Delete)
- משתמשים ולקוחות מערכת מסומנים למחיקה עם `deleted_at` timestamp
- הנתונים נשארים במסד הנתונים למשך חודש
- אפשר לשחזר את הנתונים במהלך החודש

### 2. ניקוי אוטומטי
- רץ אוטומטית כל יום בשעה 2:00 בבוקר
- מוחק משתמשים ולקוחות מערכת שמסומנים למחיקה יותר מחודש
- מנקה גם sessions שפג תוקפם

### 3. ניהול ידני
- אפשר להפעיל ניקוי ידני דרך API
- אפשר לבדוק כמה רשומות ממתינות למחיקה
- אפשר לעצור ולהפעיל את המערכת

## API Endpoints

### ניקוי משתמשים
```
POST /api/users/cleanup-deleted
GET /api/users/pending-deletion-count
DELETE /api/users/:id/soft
```

### ניקוי לקוחות מערכת
```
POST /api/system-clients/cleanup-deleted
GET /api/system-clients/pending-deletion-count
DELETE /api/system-clients/:id/soft
```

### ניהול מערכת הניקוי
```
GET /api/cleanup/status
POST /api/cleanup/trigger
POST /api/cleanup/start
POST /api/cleanup/stop
```

## דוגמאות שימוש

### מחיקה רכה של משתמש
```bash
curl -X DELETE "http://localhost:8080/api/users/123/soft" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### הפעלת ניקוי ידני
```bash
curl -X POST "http://localhost:8080/api/cleanup/trigger" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### בדיקת סטטוס המערכת
```bash
curl -X GET "http://localhost:8080/api/cleanup/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## הגדרות מסד נתונים

המערכת משתמשת בפונקציה `cleanup_deleted_users()` שכבר קיימת בסכמת המסד נתונים:

```sql
CREATE OR REPLACE FUNCTION cleanup_deleted_users()
RETURNS void AS $$
BEGIN
    DELETE FROM users 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < CURRENT_TIMESTAMP - INTERVAL '1 month';
END;
$$ language 'plpgsql';
```

## לוגים

המערכת כותבת לוגים מפורטים על כל פעולת ניקוי:

```
Starting cleanup process...
Cleaned up 5 deleted users
Cleaned up 2 deleted system clients
Cleaned up 15 expired sessions
Cleanup completed successfully in 250ms
- Deleted users: 5
- Deleted system clients: 2
- Expired sessions: 15
```

## אבטחה

- כל ה-endpoints דורשים הרשאות admin
- המערכת כוללת הגנות מפני הפעלה כפולה
- Graceful shutdown מבטיח שהמערכת נעצרת בצורה בטוחה

## תזמון

- הפעלה ראשונית: מיד בהפעלת השרת
- הפעלה יומית: כל יום בשעה 2:00 בבוקר
- אפשר לשנות את התזמון בקובץ `cleanupJobs.ts`

## פתרון בעיות

### המערכת לא רצה
1. בדוק את הלוגים של השרת
2. ודא שהמסד נתונים מחובר
3. בדוק הרשאות admin

### ניקוי לא עובד
1. בדוק שהפונקציה `cleanup_deleted_users()` קיימת במסד הנתונים
2. ודא שיש רשומות עם `deleted_at` ישן יותר מחודש
3. בדוק את הלוגים לפרטים נוספים

## פיתוח עתידי

- הוספת תזמון מותאם אישית
- התראות על ניקוי
- דוחות מפורטים על פעולות ניקוי
- גיבוי לפני מחיקה
