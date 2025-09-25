import { AuditLog } from '../types/permissions';

class AuditService {
  private static instance: AuditService;
  private logs: AuditLog[] = [];

  private constructor() {}

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async log(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const newLog: AuditLog = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    this.logs.push(newLog);
    await this.persistLogs();
  }

  async getLogs(filters?: {
    userId?: string;
    entityType?: AuditLog['entityType'];
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLog[]> {
    let filteredLogs = [...this.logs];

    if (filters?.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }

    if (filters?.entityType) {
      filteredLogs = filteredLogs.filter(log => log.entityType === filters.entityType);
    }

    if (filters?.startDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= filters.startDate!);
    }

    if (filters?.endDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= filters.endDate!);
    }

    return filteredLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private async persistLogs(): Promise<void> {
    try {
      localStorage.setItem('audit_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Error persisting audit logs:', error);
    }
  }

  async loadLogs(): Promise<void> {
    try {
      const storedLogs = localStorage.getItem('audit_logs');
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  }

  async exportLogs(format: 'csv' | 'json' = 'json'): Promise<string> {
    if (format === 'csv') {
      const headers = ['id', 'userId', 'action', 'entityType', 'entityId', 'timestamp', 'ipAddress', 'userAgent'];
      const rows = this.logs.map(log => headers.map(key => log[key as keyof AuditLog]));
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    return JSON.stringify(this.logs, null, 2);
  }
}

export const auditService = AuditService.getInstance();