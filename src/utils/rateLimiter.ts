// Rate limiter implementation
export class RateLimiter {
  private attempts: Map<string, { count: number; timestamp: number }>;
  private maxAttempts: number;
  private timeWindow: number;

  constructor(maxAttempts = 5, timeWindow = 300000) { // 5 minutes window by default
    this.attempts = new Map();
    this.maxAttempts = maxAttempts;
    this.timeWindow = timeWindow;
  }

  isAllowed(key: string): boolean {
    this.cleanup(key);
    const record = this.attempts.get(key);
    
    if (!record) return true;
    
    return record.count < this.maxAttempts;
  }

  increment(key: string): void {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, { count: 1, timestamp: now });
      return;
    }

    if (now - record.timestamp > this.timeWindow) {
      this.attempts.set(key, { count: 1, timestamp: now });
      return;
    }

    record.count += 1;
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

  private cleanup(key: string): void {
    const record = this.attempts.get(key);
    if (record && Date.now() - record.timestamp > this.timeWindow) {
      this.attempts.delete(key);
    }
  }
}