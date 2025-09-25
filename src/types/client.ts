export interface ClientConfiguration {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  leadStatuses: LeadStatus[];
  taskStatuses: TaskStatus[];
  customerStatuses: CustomerStatus[];
  paymentStatuses: PaymentStatus[];
  leadSources: string[];
  customFields: CustomField[];
  permissions: ClientPermission[];
  branding: {
    companyName: string;
    logoUrl?: string;
    favicon?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily?: string;
    customCSS?: string;
  };
  features: {
    enableTasks: boolean;
    enableReports: boolean;
    enableCalendar: boolean;
    enableCustomers: boolean;
    enableAI: boolean;
    enableNotifications: boolean;
    enableExport: boolean;
    enableCustomFields: boolean;
    enableAdvancedFilters: boolean;
    enableBulkActions: boolean;
  };
  settings: {
    dateFormat: string;
    timeFormat: string;
    currency: string;
    language: string;
    timezone: string;
    defaultLeadStatus: string;
    defaultCustomerStatus: string;
    defaultPaymentStatus: string;
    autoAssignLeads: boolean;
    requireCallbackDate: boolean;
    enableLeadScoring: boolean;
  };
  workflows: {
    leadToCustomerStatuses: string[];
    autoStatusChanges: AutoStatusChange[];
    notifications: NotificationRule[];
    messageTemplates: MessageTemplate[];
  };
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface MessageTemplate {
  id: string;
  type: 'whatsapp' | 'email';
  name: string;
  title: string;
  subject?: string; // For email templates
  message: string;
  icon: string;
  isDefault: boolean;
  variables: string[]; // Available variables like {name}, {phone}, etc.
}

export interface LeadStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  isFinal: boolean;
  description?: string;
  allowedTransitions?: string[];
  requiresApproval?: boolean;
  autoActions?: string[];
}

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  isFinal: boolean;
  description?: string;
}

export interface CustomerStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  description?: string;
  icon?: string;
}

export interface PaymentStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  description?: string;
  icon?: string;
  requiresAction?: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'email' | 'phone' | 'url';
  required: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  showInList?: boolean;
  showInForm?: boolean;
  category?: string;
}

export interface ClientPermission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface AutoStatusChange {
  id: string;
  name: string;
  fromStatus: string;
  toStatus: string;
  conditions: {
    timeElapsed?: number;
    noActivity?: number;
    fieldValue?: { field: string; value: any };
  };
  enabled: boolean;
}

export interface NotificationRule {
  id: string;
  name: string;
  trigger: 'status_change' | 'time_based' | 'field_change';
  conditions: any;
  actions: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    webhook?: string;
  };
  enabled: boolean;
}