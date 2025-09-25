export type Permission =
  // Leads
  | 'leads.view'
  | 'leads.create' 
  | 'leads.edit'
  | 'leads.delete'
  | 'leads.export'
  | 'leads.import'
  
  // Customers
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit' 
  | 'customers.delete'
  
  // Reports
  | 'reports.view'
  | 'reports.create'
  | 'reports.export'
  
  // Settings
  | 'settings.view'
  | 'settings.edit'
  
  // Users
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  
  // Calendar
  | 'calendar.view'
  | 'calendar.create'
  | 'calendar.edit'
  | 'calendar.delete'
  
  // Analytics
  | 'analytics.view'
  | 'analytics.export';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  description?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'import';
  entityType: 'lead' | 'customer' | 'user' | 'report' | 'setting';
  entityId: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  dateFormat: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    sound: boolean;
  };
  dashboard: {
    layout: 'grid' | 'list';
    widgets: string[];
    filters: Record<string, any>;
  };
}