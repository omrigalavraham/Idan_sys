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
  dueDate: string;
  createdAt: string;
  assignedTo: string;
  priority: 'נמוך' | 'בינוני' | 'גבוה';
  leadId?: string;
  notified?: boolean;
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
  clientId?: string;
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