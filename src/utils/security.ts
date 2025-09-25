import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

// קונפיגורציית אבטחה
const SECURITY_CONFIG = {
  JWT_EXPIRY: '12h',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
  PASSWORD_HISTORY_SIZE: 5,
  MIN_PASSWORD_AGE: 24 * 60 * 60 * 1000, // 24 hours
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  ENCRYPTION_ITERATIONS: 10000,
  KEY_SIZE: 256,
  SALT_SIZE: 128,
  IV_SIZE: 128
};

// רשימה שחורה של טוקנים שפג תוקפם
const invalidatedTokens = new Set<string>();

// מחלקה לניהול מפתחות הצפנה
class KeyManager {
  private static instance: KeyManager;
  private keys: Map<string, {
    key: string;
    created: number;
    expires: number;
  }>;

  private constructor() {
    this.keys = new Map();
  }

  static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  generateKey(userId: string): string {
    const key = CryptoJS.lib.WordArray.random(SECURITY_CONFIG.KEY_SIZE / 8).toString();
    const now = Date.now();
    
    this.keys.set(userId, {
      key,
      created: now,
      expires: now + (24 * 60 * 60 * 1000) // 24 hours
    });

    return key;
  }

  getKey(userId: string): string {
    const keyData = this.keys.get(userId);
    if (!keyData || Date.now() > keyData.expires) {
      return this.generateKey(userId);
    }
    return keyData.key;
  }

  rotateKey(userId: string): string {
    return this.generateKey(userId);
  }

  invalidateKey(userId: string): void {
    this.keys.delete(userId);
  }
}

// ניהול סשן מאובטח
export class SecureSession {
  private static instance: SecureSession;
  private sessions: Map<string, {
    userId: string;
    expires: number;
    lastActivity: number;
    deviceId: string;
    fingerprint: string;
    ipAddress: string;
    userAgent: string;
  }>;

  private constructor() {
    this.sessions = new Map();
    this.startCleanupInterval();
  }

  static getInstance(): SecureSession {
    if (!SecureSession.instance) {
      SecureSession.instance = new SecureSession();
    }
    return SecureSession.instance;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now > session.expires || now - session.lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT) {
          this.sessions.delete(sessionId);
          SecurityLogger.log('SESSION_EXPIRED', { sessionId, userId: session.userId }, 'low');
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  createSession(userId: string, deviceId: string, fingerprint: string, ipAddress: string, userAgent: string): string {
    // בדיקת מספר סשנים פעילים למשתמש
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId).length;
    
    if (activeSessions >= 5) {
      throw new Error('Maximum number of active sessions reached');
    }

    const sessionId = uuidv4();
    const now = Date.now();
    
    this.sessions.set(sessionId, {
      userId,
      expires: now + SECURITY_CONFIG.SESSION_TIMEOUT,
      lastActivity: now,
      deviceId,
      fingerprint,
      ipAddress,
      userAgent
    });

    return sessionId;
  }

  validateSession(sessionId: string, fingerprint: string, ipAddress: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const now = Date.now();
    
    // בדיקות אבטחה מורחבות
    if (
      now > session.expires || 
      now - session.lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT ||
      session.fingerprint !== fingerprint ||
      session.ipAddress !== ipAddress
    ) {
      this.sessions.delete(sessionId);
      SecurityLogger.log('SESSION_VALIDATION_FAILED', {
        sessionId,
        reason: 'Security check failed',
        fingerprint: fingerprint !== session.fingerprint,
        ipChanged: ipAddress !== session.ipAddress
      }, 'medium');
      return false;
    }

    session.lastActivity = now;
    session.expires = now + SECURITY_CONFIG.SESSION_TIMEOUT;
    this.sessions.set(sessionId, session);

    return true;
  }

  updateSession(sessionId: string, ipAddress: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // בדיקת שינוי IP
      if (session.ipAddress !== ipAddress) {
        SecurityLogger.log('IP_CHANGE_DETECTED', {
          sessionId,
          oldIp: session.ipAddress,
          newIp: ipAddress
        }, 'medium');
      }

      session.lastActivity = Date.now();
      session.expires = Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT;
      session.ipAddress = ipAddress;
      this.sessions.set(sessionId, session);
    }
  }

  terminateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      SecurityLogger.log('SESSION_TERMINATED', {
        sessionId,
        userId: session.userId
      }, 'low');
      this.sessions.delete(sessionId);
    }
  }

  terminateAllUserSessions(userId: string): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        SecurityLogger.log('USER_SESSIONS_TERMINATED', { userId }, 'medium');
      }
    }
  }

  getActiveSessions(userId: string): Array<{
    deviceId: string;
    lastActivity: number;
    userAgent: string;
    ipAddress: string;
  }> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .map(({ deviceId, lastActivity, userAgent, ipAddress }) => ({
        deviceId,
        lastActivity,
        userAgent,
        ipAddress
      }));
  }
}

// ניהול טוקנים מאובטח עם תמיכה ברוטציה
export class TokenManager {
  private static instance: TokenManager | null = null;
  private readonly keyManager: KeyManager;
  private currentKey: string;
  private keyRotationInterval!: NodeJS.Timeout;

  private constructor() {
    this.keyManager = KeyManager.getInstance();
    this.currentKey = CryptoJS.lib.WordArray.random(32).toString();
    this.startKeyRotation();
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  private startKeyRotation(): void {
    this.keyRotationInterval = setInterval(() => {
      const newKey = CryptoJS.lib.WordArray.random(32).toString();
      SecurityLogger.log('KEY_ROTATION', {
        timestamp: new Date().toISOString()
      }, 'low');
      this.currentKey = newKey;
    }, 12 * 60 * 60 * 1000); // רוטציה כל 12 שעות
  }

  generateToken(payload: any, userId: string): string {
    const key = this.keyManager.getKey(userId);
    
    try {
      return jwt.sign(
        {
          ...payload,
          jti: uuidv4(),
          iat: Math.floor(Date.now() / 1000)
        },
        key,
        { 
          expiresIn: SECURITY_CONFIG.JWT_EXPIRY
        } as any
      );
    } catch (error) {
      console.error('JWT signing error:', error);
      throw new Error('Failed to generate token');
    }
  }

  verifyToken(token: string, userId: string): any {
    try {
      if (invalidatedTokens.has(token)) {
        throw new Error('Token has been invalidated');
      }

      const key = this.keyManager.getKey(userId);
      const decoded = jwt.verify(token, key) as any;
      
      // בדיקות נוספות
      if (!decoded.jti || !decoded.iat) {
        throw new Error('Invalid token structure');
      }

      // בדיקת גיל הטוקן
      const tokenAge = Date.now() / 1000 - decoded.iat;
      if (tokenAge > 12 * 60 * 60) { // 12 שעות
        throw new Error('Token too old');
      }

      return decoded;
    } catch (error) {
      SecurityLogger.log('TOKEN_VERIFICATION_FAILED', {
        error: (error as Error).message,
        userId
      }, 'medium');
      throw error;
    }
  }

  invalidateToken(token: string): void {
    invalidatedTokens.add(token);
    
    // ניקוי אוטומטי אחרי פרק זמן
    setTimeout(() => {
      invalidatedTokens.delete(token);
    }, 60 * 60 * 1000);
  }

  rotateUserKey(userId: string): void {
    this.keyManager.rotateKey(userId);
    SecurityLogger.log('USER_KEY_ROTATED', { userId }, 'low');
  }
}

// מחלקה לניהול הצפנה מתקדמת
export class EncryptionManager {
  private static instance: EncryptionManager | null = null;
  private readonly keyManager: KeyManager;

  private constructor() {
    this.keyManager = KeyManager.getInstance();
  }

  static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  encrypt(data: any, userId: string): string {
    const salt = CryptoJS.lib.WordArray.random(SECURITY_CONFIG.SALT_SIZE / 8);
    const iv = CryptoJS.lib.WordArray.random(SECURITY_CONFIG.IV_SIZE / 8);
    const key = this.keyManager.getKey(userId);
    
    const derivedKey = CryptoJS.PBKDF2(key, salt, {
      keySize: SECURITY_CONFIG.KEY_SIZE / 32,
      iterations: SECURITY_CONFIG.ENCRYPTION_ITERATIONS
    });

    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), derivedKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return [
      salt.toString(),
      iv.toString(),
      encrypted.toString()
    ].join('::');
  }

  decrypt(encryptedData: string, userId: string): any {
    try {
      const [salt, iv, data] = encryptedData.split('::');
      const key = this.keyManager.getKey(userId);

      const derivedKey = CryptoJS.PBKDF2(key, CryptoJS.enc.Hex.parse(salt), {
        keySize: SECURITY_CONFIG.KEY_SIZE / 32,
        iterations: SECURITY_CONFIG.ENCRYPTION_ITERATIONS
      });

      const decrypted = CryptoJS.AES.decrypt(data, derivedKey, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      SecurityLogger.log('DECRYPTION_FAILED', {
        error: (error as Error).message,
        userId
      }, 'high');
      throw new Error('Decryption failed');
    }
  }
}

// לוגים אבטחה משופרים
export class SecurityLogger {
  private static readonly logs: Array<{
    id: string;
    timestamp: number;
    type: string;
    details: any;
    severity: 'low' | 'medium' | 'high';
    hash: string;
  }> = [];

  private static calculateLogHash(log: any): string {
    return CryptoJS.SHA3(JSON.stringify(log)).toString();
  }

  static log(type: string, details: any, severity: 'low' | 'medium' | 'high'): void {
    const logEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      details,
      severity
    };

    const hash = this.calculateLogHash(logEntry);
    
    this.logs.push({
      ...logEntry,
      hash
    });

    // שמירת הלוגים למערכת קבצים או שירות לוגים חיצוני
    this.persistLog(logEntry);

    if (severity === 'high') {
      this.notifyAdmin(type, details);
    }
  }

  private static persistLog(log: any): void {
    // כאן יש להוסיף לוגיקה לשמירת הלוגים
    console.log('Security Log:', log);
  }

  private static notifyAdmin(type: string, details: any): void {
    // כאן יש להוסיף לוגיקה לשליחת התראה למנהל המערכת
    console.error('Security Alert:', { type, details });
  }

  static getLogs(options?: {
    severity?: 'low' | 'medium' | 'high';
    startDate?: Date;
    endDate?: Date;
    type?: string;
  }): any[] {
    let filtered = [...this.logs];

    if (options?.severity) {
      filtered = filtered.filter(log => log.severity === options.severity);
    }

    if (options?.startDate) {
      filtered = filtered.filter(log => log.timestamp >= options.startDate!.getTime());
    }

    if (options?.endDate) {
      filtered = filtered.filter(log => log.timestamp <= options.endDate!.getTime());
    }

    if (options?.type) {
      filtered = filtered.filter(log => log.type === options.type);
    }

    return filtered;
  }

  static verifyLogIntegrity(): boolean {
    return this.logs.every(log => {
      const calculatedHash = this.calculateLogHash({
        id: log.id,
        timestamp: log.timestamp,
        type: log.type,
        details: log.details,
        severity: log.severity
      });
      return calculatedHash === log.hash;
    });
  }
}

export function validateInput(input: any): boolean {
  // דוגמה לבדיקה בסיסית
  return input !== null && input !== undefined;
}

export function validateRequest(req: any, res: any, next: Function) {
  if (!validateInput(req.body)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  next();
}
