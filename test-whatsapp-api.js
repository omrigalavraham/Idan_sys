/**
 * סקריפט בדיקה ל-WhatsApp API
 * 
 * הסקריפט בודק את כל ה-endpoints של WhatsApp API
 * ודורש JWT token תקין
 */

const axios = require('axios');

// הגדרות
const BASE_URL = 'http://localhost:8080';
const JWT_TOKEN = 'your-jwt-token-here'; // החלף בטוקן תקין

// יצירת instance של axios עם headers ברירת מחדל
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * בדיקת סטטוס החיבור
 */
async function testStatus() {
  console.log('\n🔍 בודק סטטוס חיבור ווטסאפ...');
  
  try {
    const response = await api.get('/api/whatsapp/status');
    console.log('✅ סטטוס:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ שגיאה בבדיקת סטטוס:', error.response?.data || error.message);
    return null;
  }
}

/**
 * בדיקת חיבור ווטסאפ
 */
async function testConnect() {
  console.log('\n🔗 בודק חיבור ווטסאפ...');
  
  try {
    const response = await api.get('/api/whatsapp/connect');
    console.log('✅ חיבור:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ שגיאה בחיבור:', error.response?.data || error.message);
    return null;
  }
}

/**
 * בדיקת שליחת הודעות
 */
async function testSendMessages() {
  console.log('\n📤 בודק שליחת הודעות...');
  
  const testData = {
    phone_numbers: ['0501234567', '0507654321'],
    message: 'זהו טסט שליחת הודעות ווטסאפ מהמערכת'
  };
  
  try {
    const response = await api.post('/api/whatsapp/send', testData);
    console.log('✅ שליחה:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ שגיאה בשליחה:', error.response?.data || error.message);
    return null;
  }
}

/**
 * בדיקת ניתוק חיבור
 */
async function testDisconnect() {
  console.log('\n🔌 בודק ניתוק חיבור...');
  
  try {
    const response = await api.delete('/api/whatsapp/disconnect');
    console.log('✅ ניתוק:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ שגיאה בניתוק:', error.response?.data || error.message);
    return null;
  }
}

/**
 * בדיקת callback (simulation)
 */
async function testCallback() {
  console.log('\n🔄 בודק callback...');
  
  const testData = {
    code: 'test-authorization-code',
    state: '1' // user ID
  };
  
  try {
    const response = await api.post('/api/whatsapp/callback', testData);
    console.log('✅ callback:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ שגיאה ב-callback:', error.response?.data || error.message);
    return null;
  }
}

/**
 * בדיקת תקינות השרת
 */
async function testServerHealth() {
  console.log('\n🏥 בודק תקינות השרת...');
  
  try {
    const response = await api.get('/healthz');
    console.log('✅ שרת תקין:', response.data);
    return true;
  } catch (error) {
    console.error('❌ שרת לא תקין:', error.message);
    return false;
  }
}

/**
 * פונקציה ראשית
 */
async function runTests() {
  console.log('🚀 מתחיל בדיקות WhatsApp API...');
  console.log(`📍 שרת: ${BASE_URL}`);
  console.log(`🔑 טוקן: ${JWT_TOKEN.substring(0, 20)}...`);
  
  // בדיקת תקינות השרת
  const serverHealthy = await testServerHealth();
  if (!serverHealthy) {
    console.log('\n❌ השרת לא תקין, מסיים בדיקות');
    return;
  }
  
  // בדיקת סטטוס
  const status = await testStatus();
  
  // בדיקת חיבור (רק אם לא מחובר)
  if (!status?.connected) {
    await testConnect();
  }
  
  // בדיקת שליחת הודעות (רק אם מחובר)
  if (status?.connected) {
    await testSendMessages();
  } else {
    console.log('\n⚠️  דילוג על בדיקת שליחת הודעות - ווטסאפ לא מחובר');
  }
  
  // בדיקת callback (simulation)
  await testCallback();
  
  // בדיקת ניתוק (אופציונלי)
  // await testDisconnect();
  
  console.log('\n✅ סיום בדיקות WhatsApp API');
}

/**
 * בדיקת פרמטרים
 */
function validateConfig() {
  if (JWT_TOKEN === 'your-jwt-token-here') {
    console.error('❌ אנא החלף את JWT_TOKEN בטוקן תקין');
    process.exit(1);
  }
  
  if (!BASE_URL) {
    console.error('❌ אנא הגדר BASE_URL');
    process.exit(1);
  }
}

// הרצת הבדיקות
if (require.main === module) {
  validateConfig();
  runTests().catch(console.error);
}

module.exports = {
  testStatus,
  testConnect,
  testSendMessages,
  testDisconnect,
  testCallback,
  testServerHealth,
  runTests
};
