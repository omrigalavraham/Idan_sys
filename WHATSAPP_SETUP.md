# הגדרת פיצ'ר חיבור ווטסאפ

## סקירה כללית

פיצ'ר זה מאפשר למנהלים לחבר את חשבון הווטסאפ העסקי שלהם למערכת ולשלוח הודעות ישירות דרך WhatsApp Cloud API של Meta.

## תכונות

- **חיבור ווטסאפ למנהלים**: כל מנהל מגדיר את ה-API שלו ישירות במערכת
- **שליחת הודעות**: נציגים ומנהלים יכולים לשלוח הודעות ווטסאפ ללידים
- **ניהול חיבורים**: בדיקת סטטוס, ניתוק ועדכון הגדרות
- **היסטוריית הודעות**: מעקב אחר הודעות שנשלחו
- **אבטחה**: כל ה-API credentials נשמרים בצורה מאובטחת במסד הנתונים

## הגדרה ראשונית

### 1. יצירת אפליקציה ב-Meta for Developers

1. היכנס ל-[Meta for Developers](https://developers.facebook.com/)
2. צור אפליקציה חדשה מסוג "Business"
3. הוסף את המוצר "WhatsApp Business API"
4. קבל את ה-Access Token וה-Phone Number ID

### 2. הגדרת משתני סביבה

אין צורך בהגדרות מיוחדות - כל מנהל מגדיר את ה-API שלו ישירות במערכת:

```env
# WhatsApp Integration - Meta WhatsApp Business API
# כל מנהל מגדיר את ה-API שלו ישירות במערכת
# אין צורך בהגדרות גלובליות
FRONTEND_URL=http://localhost:1573
```

### 3. הגדרת מסד הנתונים

הרץ את קובץ ה-schema הראשי:

```bash
psql -d your_database_name -f database/schema.sql
```

או אם אתה משתמש ב-PGAdmin או כלי אחר, הרץ את התוכן של `database/schema.sql`.

**הערה**: הטבלה `whatsapp_connections` כבר כלולה בקובץ ה-schema הראשי עם כל האינדקסים והטריגרים הנדרשים. אין צורך במיגרציות נפרדות.

## שימוש במערכת

### למנהלים

1. **חיבור ווטסאפ**:
   - היכנס לדף "ניהול משתמשים"
   - לחץ על "חבר ווטסאפ עסקי"
   - הכנס את ה-Access Token וה-Phone Number ID שלך
   - לחץ על "חבר ווטסאפ"

2. **ניהול החיבור**:
   - בדיקת סטטוס החיבור
   - עדכון הגדרות API
   - ניתוק החיבור

### לנציגים

1. **שליחת הודעות**:
   - בחר לידים בדף הלידים
   - לחץ על "שלח הודעות"
   - בחר "WhatsApp"
   - כתוב את ההודעה
   - שלח

## API Endpoints

### POST /api/whatsapp/connect
חיבור ווטסאפ עם API credentials ישירים

**Body:**
```json
{
  "access_token": "your-access-token",
  "phone_number_id": "your-phone-number-id",
  "business_account_id": "your-business-account-id",
  "app_id": "your-app-id",
  "webhook_verify_token": "your-webhook-token"
}
```

**Response:**
```json
{
  "success": true,
  "connection": {
    "id": 1,
    "phone_number_id": "phone-number-id",
    "business_account_id": "business-account-id",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /api/whatsapp/update
עדכון חיבור ווטסאפ קיים

**Body:**
```json
{
  "access_token": "new-access-token",
  "phone_number_id": "new-phone-number-id",
  "business_account_id": "new-business-account-id",
  "app_id": "new-app-id",
  "webhook_verify_token": "new-webhook-token"
}
```

**Response:**
```json
{
  "success": true,
  "connection": {
    "id": 1,
    "phone_number_id": "phone-number-id",
    "business_account_id": "business-account-id",
    "is_active": true,
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/whatsapp/send
שליחת הודעות ווטסאפ

**Body:**
```json
{
  "phone_numbers": ["0501234567", "0507654321"],
  "message": "שלום, זו הודעה מווטסאפ"
}
```

**Response:**
```json
{
  "success": true,
  "sent_count": 2,
  "error_count": 0,
  "results": [
    {
      "phone_number": "0501234567",
      "status": "sent",
      "message_id": "message-id"
    }
  ],
  "errors": []
}
```

### GET /api/whatsapp/status
בדיקת סטטוס החיבור

**Response:**
```json
{
  "connected": true,
  "connection": {
    "id": 1,
    "phone_number_id": "phone-number-id",
    "business_account_id": "business-account-id",
    "is_active": true,
    "last_used_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### DELETE /api/whatsapp/disconnect
ניתוק חיבור ווטסאפ

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp connection disconnected successfully"
}
```

## הרשאות

- **מנהלים**: יכולים לחבר, לנתק ולבדוק את החיבור שלהם
- **נציגים**: יכולים לשלוח הודעות דרך החיבור של המנהל שלהם
- **מנהלי מערכת**: גישה מלאה לכל החיבורים

## פתרון בעיות

### שגיאות נפוצות

1. **"WhatsApp app ID not configured"**
   - ודא שה-WHATSAPP_APP_ID מוגדר בקובץ .env

2. **"No business account found"**
   - ודא שהמשתמש מחובר לחשבון עסקי ב-Meta

3. **"No phone numbers found"**
   - ודא שיש מספר טלפון מוגדר בחשבון העסקי

4. **"Manager has not connected WhatsApp"**
   - נציגים יכולים לשלוח הודעות רק אם המנהל שלהם חיבר ווטסאפ

### לוגים

השגיאות נרשמות בקונסול של השרת. בדוק את הלוגים לפרטים נוספים.

## אבטחה

- כל הטוקנים מוצפנים במסד הנתונים
- בדיקת הרשאות בכל בקשה
- Rate limiting על שליחת הודעות
- Validation של מספרי טלפון

## תמיכה

לשאלות או בעיות, פנה לתמיכה הטכנית.
