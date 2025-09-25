# דוגמאות שימוש ב-WhatsApp API

## דוגמאות JavaScript/TypeScript

### 1. בדיקת סטטוס החיבור

```javascript
const checkWhatsAppStatus = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/whatsapp/status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.connected) {
      console.log('WhatsApp מחובר:', data.connection);
    } else {
      console.log('WhatsApp לא מחובר');
    }
  } catch (error) {
    console.error('שגיאה בבדיקת סטטוס:', error);
  }
};
```

### 2. חיבור ווטסאפ

```javascript
const connectWhatsApp = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/whatsapp/connect', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.auth_url) {
      // redirect למסך חיבור Meta
      window.location.href = data.auth_url;
    } else if (data.connection) {
      console.log('כבר מחובר:', data.connection);
    }
  } catch (error) {
    console.error('שגיאה בחיבור:', error);
  }
};
```

### 3. שליחת הודעות

```javascript
const sendWhatsAppMessages = async (phoneNumbers, message) => {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_numbers: phoneNumbers,
        message: message,
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`נשלחו ${data.sent_count} הודעות`);
      console.log('תוצאות:', data.results);
      
      if (data.errors.length > 0) {
        console.log('שגיאות:', data.errors);
      }
    }
  } catch (error) {
    console.error('שגיאה בשליחה:', error);
  }
};

// דוגמה לשימוש
sendWhatsAppMessages(
  ['0501234567', '0507654321'],
  'שלום! זו הודעה מווטסאפ מהמערכת שלנו.'
);
```

### 4. ניתוק חיבור

```javascript
const disconnectWhatsApp = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/whatsapp/disconnect', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('ווטסאפ נותק בהצלחה');
    }
  } catch (error) {
    console.error('שגיאה בניתוק:', error);
  }
};
```

## דוגמאות React Hooks

### 1. Hook לבדיקת סטטוס

```typescript
import { useState, useEffect } from 'react';
import { useWhatsAppStore } from '../store/whatsappStore';

export const useWhatsAppStatus = () => {
  const { isConnected, connection, checkConnectionStatus } = useWhatsAppStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      setIsLoading(true);
      await checkConnectionStatus();
      setIsLoading(false);
    };

    checkStatus();
  }, [checkConnectionStatus]);

  return {
    isConnected,
    connection,
    isLoading,
    refresh: checkConnectionStatus,
  };
};
```

### 2. Hook לשליחת הודעות

```typescript
import { useWhatsAppMessaging } from '../store/whatsappStore';

export const useSendWhatsApp = () => {
  const { sendWhatsAppMessage, isLoading, error } = useWhatsAppMessaging();

  const sendMessage = async (phoneNumbers: string[], message: string) => {
    try {
      await sendWhatsAppMessage(phoneNumbers, message);
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  };

  return {
    sendMessage,
    isLoading,
    error,
  };
};
```

## דוגמאות cURL

### 1. בדיקת סטטוס

```bash
curl -X GET "http://localhost:8080/api/whatsapp/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. חיבור ווטסאפ

```bash
curl -X GET "http://localhost:8080/api/whatsapp/connect" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. שליחת הודעות

```bash
curl -X POST "http://localhost:8080/api/whatsapp/send" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_numbers": ["0501234567", "0507654321"],
    "message": "שלום! זו הודעה מווטסאפ."
  }'
```

### 4. ניתוק חיבור

```bash
curl -X DELETE "http://localhost:8080/api/whatsapp/disconnect" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## דוגמאות Python

### 1. בדיקת סטטוס

```python
import requests

def check_whatsapp_status(token):
    url = "http://localhost:8080/api/whatsapp/status"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    return response.json()

# שימוש
token = "your_jwt_token"
status = check_whatsapp_status(token)
print(f"מחובר: {status['connected']}")
```

### 2. שליחת הודעות

```python
import requests

def send_whatsapp_messages(token, phone_numbers, message):
    url = "http://localhost:8080/api/whatsapp/send"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "phone_numbers": phone_numbers,
        "message": message
    }
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()

# שימוש
token = "your_jwt_token"
result = send_whatsapp_messages(
    token,
    ["0501234567", "0507654321"],
    "שלום! זו הודעה מווטסאפ."
)
print(f"נשלחו {result['sent_count']} הודעות")
```

## דוגמאות Node.js

### 1. שליחת הודעות

```javascript
const axios = require('axios');

const sendWhatsAppMessages = async (token, phoneNumbers, message) => {
  try {
    const response = await axios.post('http://localhost:8080/api/whatsapp/send', {
      phone_numbers: phoneNumbers,
      message: message
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('שגיאה בשליחה:', error.response?.data || error.message);
    throw error;
  }
};

// שימוש
const token = 'your_jwt_token';
sendWhatsAppMessages(token, ['0501234567'], 'שלום!')
  .then(result => console.log('תוצאה:', result))
  .catch(error => console.error('שגיאה:', error));
```

## טיפים וטריקים

### 1. עיבוד מספרי טלפון

```javascript
const formatPhoneNumber = (phone) => {
  // הסרת תווים מיוחדים
  let cleanPhone = phone.replace(/[^\d]/g, '');
  
  // הוספת קידומת ישראל אם חסרה
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '972' + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith('972')) {
    cleanPhone = '972' + cleanPhone;
  }
  
  return cleanPhone;
};
```

### 2. בדיקת תקינות מספר טלפון

```javascript
const isValidPhoneNumber = (phone) => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  return cleanPhone.length >= 9 && cleanPhone.length <= 15;
};
```

### 3. עיבוד שגיאות

```javascript
const handleWhatsAppError = (error) => {
  if (error.response?.status === 400) {
    console.error('בקשה לא תקינה:', error.response.data.error);
  } else if (error.response?.status === 401) {
    console.error('לא מורשה - בדוק את הטוקן');
  } else if (error.response?.status === 403) {
    console.error('אין הרשאה - בדוק את התפקיד');
  } else {
    console.error('שגיאה כללית:', error.message);
  }
};
```
