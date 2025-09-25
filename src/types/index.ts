export type LeadStatus = 
  | 'חדש'
  | 'נשלחה הצעת מחיר'
  | 'עסקה נסגרה'
  | 'אין מענה'
  | 'אין מענה 2'
  | 'לא מעוניין'
  | 'רוצה לחשוב'
  | 'הסרה מהמאגר'
  | 'מספר שגוי'
  | 'לקוח קיים';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'ממתין' | 'בביצוע' | 'הושלם';
  dueDate: string; // Will contain both date and time in ISO format
  createdAt: string;
  assignedTo: string;
  priority: 'נמוך' | 'בינוני' | 'גבוה';
  leadId?: string;
  notified?: boolean; // Added to track notification status
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  source?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  clientId?: string; // שיוך ללקוח
  callbackDate?: string;
  callbackTime?: string;
  history?: HistoryEntry[];
  tasks?: Task[];
  potentialValue?: number;
  lastContact?: string;
  product?: string;
  amount?: number;
  closingDate?: string;
}

export interface LeadFormData {
  name: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  source?: string;
  notes?: string;
  callbackDate?: string;
  callbackTime?: string;
  assigned_to?: number;
}

export interface HistoryEntry {
  id: string;
  type: 'status' | 'note' | 'callback' | 'task' | 'edit';
  description: string;
  createdAt: string;
  metadata?: {
    status?: string;
    before?: string;
    after?: string;
    notes?: string;
    callbackDate?: string;
    callbackTime?: string;
  };
}

export interface Customer {
  id: string;
  leadId?: string;
  createdBy: string; // ID of user who created this customer
  clientId?: string; // ID of client this customer belongs to
  name: string;
  email: string;
  phone: string;
  address?: string;
  company?: string;
  vatNumber?: string;
  assignedTo?: string;
  status: 'פעיל' | 'ממתין להתחלה' | 'לקוח VIP';
  paymentStatus: 'ממתין לתשלום' | 'שולם' | 'בוטל' | 'תשלום חלקי';
  products: string[];
  totalAmount: number;
  billingFrequency: 'חד פעמי' | 'חודשי';
  startDate: string;
  notes?: string;
  vatType: 'plus' | 'included';
  paymentPlan?: {
    numberOfPayments: number;
    monthlyAmount: number;
    firstPaymentDate: string;
  };
  paymentType?: 'amount' | 'percentage';
  paymentValue?: number; // סכום או אחוז
  paymentVatIncluded?: boolean; // האם כולל מע"מ (רק לאחוזים)
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  services?: CustomerService[];
  payments?: CustomerPayment[];
  // Server field names for compatibility
  full_name?: string;
  company_name?: string;
  vat_number?: string;
  assigned_rep?: string;
  billing_frequency?: string;
  start_date?: string;
  payment_status?: string;
  vat_type?: string;
  payment_type?: string;
  payment_value?: number;
  payment_vat_included?: boolean;
}

export interface CustomerService {
  id: number;
  customer_id: number;
  service_name: string;
  amount?: number;
  tax_type?: string;
  total?: number;
  billing_frequency?: string;
}

export interface CustomerPayment {
  id: number;
  customer_id: number;
  total_amount?: number;
  payment_status?: string;
  start_date?: Date;
  installments?: number;
  installment_amount?: number;
  notes?: string;
}

export interface Notification {
  id: string;
  type: 'lead' | 'task' | 'callback' | 'system';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  metadata?: Record<string, any>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'agent';
  permissions: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string | null;
  createdBy: string;
  loginAttempts: number;
  lastPasswordChange: string;
  twoFactorEnabled: boolean;
  password: string;
  clientId?: string; // שיוך ללקוח
  department?: string;
  phoneNumber?: string;
  notes?: string;
  deletedAt?: string; // תאריך מחיקה רכה
  managerId?: string; // מנהל האחראי על הנציג
}

export interface CustomerReminder {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description?: string;
  reminderDate: string;
  reminderTime: string;
  endTime?: string; // End time for calendar events
  advanceNotice: number; // minutes before to notify
  isActive: boolean;
  notified: boolean;
  createdAt: string;
  createdBy: string;
  eventType?: string; // For calendar events
  leadPhone?: string; // Lead phone number
  leadId?: string; // Lead ID for reference
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'manager' | 'agent';
  permissions: string[];
  clientId?: string;
  department?: string;
  phone?: string;
  notes?: string;
  managerId?: string;
}

// Dialer Types
export interface CallHistory {
  id: string;
  phoneNumber: string;
  contactName?: string;
  timestamp: Date;
  duration: number;
  type: 'incoming' | 'outgoing' | 'missed';
  notes?: string;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CallSettings {
  autoRecord: boolean;
  showCallerId: boolean;
  blockUnknownNumbers: boolean;
  defaultCallDuration: number;
}