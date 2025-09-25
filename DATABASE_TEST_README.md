# בדיקת חיבור למסד נתונים

## קבצי בדיקה

יצרתי קובץ לבדיקת החיבור למסד הנתונים:

- **`test-db-connection.ts`** - קובץ TypeScript לבדיקת החיבור

## איך להריץ

### עם npm script (מומלץ)
```bash
npm run test:db
```

### הרצה ישירה
```bash
npx tsx test-db-connection.ts
```

## מה הקובץ עושה

1. **טוען הגדרות סביבה** מהקובץ `env.`
2. **מציג את הגדרות החיבור** למסד הנתונים
3. **בודק חיבור** למסד הנתונים
4. **מאתחל את הסכמה** (טבלאות) אם החיבור הצליח
5. **מציג הודעות ברורות** על מצב החיבור

## דוגמת פלט

```
🔍 Testing database connection...
📊 Database config:
   Host: localhost
   Port: 5432
   Database: crm_db
   User: idan

✅ Database is online and connected!
🔧 Initializing database schema...
✅ Database schema initialized successfully!
```

## הגדרות מסד נתונים

הפרויקט מוגדר לעבוד עם מסד נתונים מקומי. הקובץ `.env` מכיל את ההגדרות:

```env
LOCAL_DATABASE_URL=postgresql://idan:0526689225@localhost:5432/crm_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_db
DB_USER=idan
DB_PASSWORD=0526689225
```

### מעבר למסד נתונים בענן

כדי לעבור למסד נתונים בענן (Render), פשוט הוסף את ה-`DATABASE_URL` לקובץ `.env`:

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

## פתרון בעיות

- **שגיאת חיבור**: בדוק את פרטי החיבור ב-`env.`
- **שגיאת הרשאות**: וודא שהמשתמש יש לו הרשאות למסד הנתונים
- **שגיאת רשת**: בדוק שהשרת של Render זמין
