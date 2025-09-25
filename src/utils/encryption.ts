import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss';

// אימות סיסמאות חזק יותר
export const validatePassword = (password: string): boolean => {
  // לפחות 8 תווים
  if (password.length < 8) return false;

  // חייב להכיל אות גדולה
  if (!/[A-Z]/.test(password)) return false;

  // חייב להכיל אות קטנה
  if (!/[a-z]/.test(password)) return false;

  // חייב להכיל מספר
  if (!/[0-9]/.test(password)) return false;

  // חייב להכיל תו מיוחד
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

  // בדיקת סיסמאות נפוצות
  const commonPasswords = ['Password123!', 'Admin123!', 'Welcome123!'];
  if (commonPasswords.includes(password)) return false;

  return true;
};

// Rate Limiter משופר
export class RateLimiter {
  private attempts: Map<string, { count: number; timestamp: number; ips: Set<string> }>;
  private maxAttempts: number;
  private timeWindow: number;
  private blacklist: Set<string>;

  constructor(maxAttempts = 5, timeWindow = 300000) {
    this.attempts = new Map();
    this.maxAttempts = maxAttempts;
    this.timeWindow = timeWindow;
    this.blacklist = new Set();
  }

  isAllowed(key: string, ip: string): boolean {
    // בדיקת IP ברשימה השחורה
    if (this.blacklist.has(ip)) {
      return false;
    }

    this.cleanup(key);
    const record = this.attempts.get(key);
    
    if (!record) {
      this.attempts.set(key, { 
        count: 0,
        timestamp: Date.now(),
        ips: new Set([ip])
      });
      return true;
    }

    // זיהוי ניסיונות חשודים מ-IP שונים
    if (!record.ips.has(ip) && record.ips.size >= 3) {
      this.blacklist.add(ip);
      return false;
    }

    record.ips.add(ip);
    return record.count < this.maxAttempts;
  }

  increment(key: string, ip: string): void {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, { 
        count: 1,
        timestamp: now,
        ips: new Set([ip])
      });
      return;
    }

    if (now - record.timestamp > this.timeWindow) {
      this.attempts.set(key, { 
        count: 1,
        timestamp: now,
        ips: new Set([ip])
      });
      return;
    }

    record.count += 1;
    record.ips.add(ip);
    
    // הוספה לרשימה שחורה אחרי יותר מדי ניסיונות
    if (record.count >= this.maxAttempts * 2) {
      this.blacklist.add(ip);
    }
    
    this.attempts.set(key, record);
  }

  getRemainingAttempts(key: string): number {
    this.cleanup(key);
    const record = this.attempts.get(key);
    if (!record) return this.maxAttempts;
    return Math.max(0, this.maxAttempts - record.count);
  }

  getTimeRemaining(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    const remaining = this.timeWindow - (Date.now() - record.timestamp);
    return Math.max(0, remaining);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  isBlacklisted(ip: string): boolean {
    return this.blacklist.has(ip);
  }

  private cleanup(key: string): void {
    const record = this.attempts.get(key);
    if (record && Date.now() - record.timestamp > this.timeWindow) {
      this.attempts.delete(key);
    }
  }
}

// פונקציות עזר לאבטחה
export const sanitizeInput = (input: string): string => {
  // ניקוי קלט מ-XSS
  return xss(input.trim());
};

export const generateSecureToken = (): string => {
  return uuidv4() + CryptoJS.lib.WordArray.random(32).toString();
};

export const hashData = (data: string): string => {
  return CryptoJS.SHA3(data).toString();
};

export const getSecretKey = (): string => {
  return process.env.REACT_APP_SECRET_KEY || 'default-secret-key-change-in-production';
};

export const encryptData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, getSecretKey()).toString();
};

export const decryptData = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, getSecretKey());
  return bytes.toString(CryptoJS.enc.Utf8);
};

// בדיקת תוקף הטוקן
export const validateToken = (token: string): boolean => {
  try {
    // בדיקת מבנה הטוקן
    if (!token || token.length < 32) return false;
    
    // בדיקת חתימה
    const [payload, signature] = token.split('.');
    const expectedSignature = hashData(payload + getSecretKey());
    
    return signature === expectedSignature;
  } catch {
    return false;
  }
};