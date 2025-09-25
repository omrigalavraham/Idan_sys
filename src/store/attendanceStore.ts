import { API_BASE_URL } from '../config/api.js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import useAuthStore from './authStore';

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  totalHours?: number;
  notes?: string;
  createdAt: string;
}

export interface ClockInData {
  notes?: string;
}

export interface ClockOutData {
  notes?: string;
}

export interface MonthlySummary {
  userId: string;
  year: number;
  month: number;
  totalDays: number;
  totalHours: number;
  averageHoursPerDay: number;
  records: AttendanceRecord[];
}

interface AttendanceStore {
  records: AttendanceRecord[];
  currentSession: AttendanceRecord | null;
  isLoading: boolean;
  error: string | null;
  
  // API functions
  fetchRecords: () => Promise<void>;
  fetchUserRecords: (userId: string) => Promise<void>;
  fetchMonthlySummary: (userId: string, year: number, month: number) => Promise<MonthlySummary | null>;
  clockIn: (data?: ClockInData) => Promise<void>;
  clockOut: (data?: ClockOutData) => Promise<void>;
  updateRecord: (id: string, updates: Partial<AttendanceRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  getCurrentSession: () => AttendanceRecord | null;
  fetchCurrentSession: () => Promise<void>;
  getTodayRecord: (userId: string) => AttendanceRecord | null;
  exportToExcel: () => void;
  clearRecords: () => void;
  
  // Legacy functions for backward compatibility
  addRecord: (userId: string) => void;
  endRecord: (userId: string) => void;
  getRecordsForUser: (userId: string) => AttendanceRecord[];
  getTotalHoursForPeriod: (userId: string, startDate: Date, endDate: Date) => number;
}

export const useAttendanceStore = create<AttendanceStore>()(
  persist(
    (set, get) => ({
      records: [],
      currentSession: null,
      isLoading: false,
      error: null,

      fetchRecords: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.warn('No authentication tokens found, skipping attendance records fetch');
            set({ isLoading: false, error: null });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/attendance`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error('שגיאה בטעינת רשומות הנוכחות');
          }

          const data = await response.json();
          
          const records = data.records?.map((record: any) => ({
            id: record.id.toString(),
            userId: record.user_id.toString(),
            date: record.date,
            clockIn: record.clock_in ? (typeof record.clock_in === 'string' ? record.clock_in : new Date(record.clock_in).toISOString()) : undefined,
            clockOut: record.clock_out ? (typeof record.clock_out === 'string' ? record.clock_out : new Date(record.clock_out).toISOString()) : undefined,
            totalHours: record.total_hours ? Number(record.total_hours) : 0,
            notes: record.notes,
            createdAt: record.created_at ? (typeof record.created_at === 'string' ? record.created_at : new Date(record.created_at).toISOString()) : undefined
          })) || [];

          set({ records, isLoading: false });
        } catch (error) {
          console.error('Error fetching attendance records:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה בטעינת רשומות הנוכחות',
            isLoading: false 
          });
          toast.error('שגיאה בטעינת רשומות הנוכחות');
        }
      },

      fetchUserRecords: async (userId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.warn('No authentication tokens found, skipping user attendance records fetch');
            set({ isLoading: false, error: null });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/attendance?user_id=${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error('שגיאה בטעינת רשומות הנוכחות');
          }

          const data = await response.json();
          
          const records = data.records?.map((record: any) => ({
            id: record.id.toString(),
            userId: record.user_id.toString(),
            date: record.date,
            clockIn: record.clock_in ? (typeof record.clock_in === 'string' ? record.clock_in : new Date(record.clock_in).toISOString()) : undefined,
            clockOut: record.clock_out ? (typeof record.clock_out === 'string' ? record.clock_out : new Date(record.clock_out).toISOString()) : undefined,
            totalHours: record.total_hours ? Number(record.total_hours) : 0,
            notes: record.notes,
            createdAt: record.created_at ? (typeof record.created_at === 'string' ? record.created_at : new Date(record.created_at).toISOString()) : undefined
          })) || [];

          set({ records, isLoading: false });
        } catch (error) {
          console.error('Error fetching user attendance records:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה בטעינת רשומות הנוכחות',
            isLoading: false 
          });
          toast.error('שגיאה בטעינת רשומות הנוכחות');
        }
      },

      fetchMonthlySummary: async (userId: string, year: number, month: number) => {
        try {
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.warn('No authentication tokens found, skipping monthly summary fetch');
            return null;
          }

          const response = await fetch(`${API_BASE_URL}/attendance/summary/${userId}/${year}/${month}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error('שגיאה בטעינת סיכום חודשי');
          }

          const data = await response.json();

          return {
            userId: data.summary.user_id.toString(),
            year: data.summary.year,
            month: data.summary.month,
            totalDays: data.summary.total_days,
            totalHours: data.summary.total_hours,
            averageHoursPerDay: data.summary.average_hours_per_day,
            records: data.summary.records.map((record: any) => ({
              id: record.id.toString(),
              userId: record.user_id.toString(),
              date: record.date,
              clockIn: record.clock_in,
              clockOut: record.clock_out,
              totalHours: record.total_hours ? Number(record.total_hours) : 0,
              notes: record.notes,
              createdAt: record.created_at
            }))
          };
        } catch (error) {
          console.error('Error fetching monthly summary:', error);
          toast.error('שגיאה בטעינת סיכום חודשי');
          return null;
        }
      },

      clockIn: async (data?: ClockInData) => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            const error = 'לא נמצא טוקן התחברות - אנא התחבר מחדש';
            set({ error, isLoading: false });
            toast.error(error);
            throw new Error(error);
          }

          const response = await fetch(`${API_BASE_URL}/attendance/clock-in`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(data || {})
          });

          if (!response.ok) {
            let errorMessage = 'שגיאה בכניסה למשמרת';
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch {
              // If we can't parse the error, use the default message
            }
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }

          const responseData = await response.json();
          const record = {
            id: responseData.record.id.toString(),
            userId: responseData.record.user_id.toString(),
            date: responseData.record.date,
            clockIn: responseData.record.clock_in,
            clockOut: responseData.record.clock_out,
            totalHours: responseData.record.total_hours ? Number(responseData.record.total_hours) : 0,
            notes: responseData.record.notes,
            createdAt: responseData.record.created_at
          };

          set({ 
            currentSession: record,
            isLoading: false,
            error: null
          });

          await get().fetchRecords();
          toast.success('נכנסת למשמרת בהצלחה');
        } catch (error) {
          console.error('Error clocking in:', error);
          if (error instanceof Error && !get().error) {
            set({ error: error.message, isLoading: false });
          }
          throw error;
        }
      },

      clockOut: async (data?: ClockOutData) => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            const error = 'לא נמצא טוקן התחברות - אנא התחבר מחדש';
            set({ error, isLoading: false });
            toast.error(error);
            throw new Error(error);
          }

          const response = await fetch(`${API_BASE_URL}/attendance/clock-out`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(data || {})
          });

          if (!response.ok) {
            let errorMessage = 'שגיאה ביציאה מהמשמרת';
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch {
              // If we can't parse the error, use the default message
            }
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }

          const responseData = await response.json();
          const updatedRecord = {
            id: responseData.record.id.toString(),
            userId: responseData.record.user_id.toString(),
            date: responseData.record.date,
            clockIn: responseData.record.clock_in,
            clockOut: responseData.record.clock_out,
            totalHours: responseData.record.total_hours ? Number(responseData.record.total_hours) : 0,
            notes: responseData.record.notes,
            createdAt: responseData.record.created_at
          };

          set({ 
            currentSession: null,
            isLoading: false,
            error: null
          });

          // Update the records with the completed record
          set(state => {
            const existingIndex = state.records.findIndex(record => record.id === updatedRecord.id);
            if (existingIndex >= 0) {
              // Update existing record
              const newRecords = [...state.records];
              newRecords[existingIndex] = updatedRecord;
              return { records: newRecords };
            } else {
              // Add new record
              return { records: [...state.records, updatedRecord] };
            }
          });

          toast.success('יצאת מהמשמרת בהצלחה');
        } catch (error) {
          console.error('Error clocking out:', error);
          if (error instanceof Error && !get().error) {
            set({ error: error.message, isLoading: false });
          }
          throw error;
        }
      },

      updateRecord: async (id: string, updates: Partial<AttendanceRecord>) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const serverData: any = {};
          if (updates.date !== undefined) serverData.date = updates.date;
          if (updates.clockIn !== undefined) serverData.clock_in = updates.clockIn;
          if (updates.clockOut !== undefined) serverData.clock_out = updates.clockOut;
          if (updates.totalHours !== undefined) serverData.total_hours = updates.totalHours;
          if (updates.notes !== undefined) serverData.notes = updates.notes;

          const response = await fetch(`${API_BASE_URL}/attendance/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(serverData)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בעדכון רשומת הנוכחות');
          }

          // Update the local record immediately
          const { records } = get();
          const updatedRecords = records.map(record => 
            record.id === id ? { ...record, ...updates } : record
          );
          set({ records: updatedRecords });

          // Refresh the records for the current user to ensure consistency
          const { user } = useAuthStore.getState();
          if (user?.id) {
            await get().fetchUserRecords(user.id);
          }
          toast.success('רשומת הנוכחות עודכנה בהצלחה');
        } catch (error) {
          console.error('Error updating attendance record:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון רשומת הנוכחות');
          throw error;
        }
      },

      deleteRecord: async (id: string) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/attendance/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה במחיקת רשומת הנוכחות');
          }

          set(state => ({
            records: state.records.filter(record => record.id !== id),
            isLoading: false
          }));
          
          toast.success('רשומת הנוכחות נמחקה בהצלחה');
        } catch (error) {
          console.error('Error deleting attendance record:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת רשומת הנוכחות');
          throw error;
        }
      },

      getCurrentSession: () => {
        return get().currentSession;
      },

      fetchCurrentSession: async () => {
        try {
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            return;
          }

          const response = await fetch(`${API_BASE_URL}/attendance/today/current`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.record && !data.record.clock_out) {
              const record = {
                id: data.record.id.toString(),
                userId: data.record.user_id.toString(),
                date: data.record.date,
                clockIn: data.record.clock_in,
                clockOut: data.record.clock_out,
                totalHours: data.record.total_hours ? Number(data.record.total_hours) : 0,
                notes: data.record.notes,
                createdAt: data.record.created_at
              };
              set({ currentSession: record });
            } else {
              set({ currentSession: null });
            }
          }
        } catch (error) {
          console.error('Error fetching current session:', error);
        }
      },

      getTodayRecord: (userId: string) => {
        const today = new Date().toISOString().split('T')[0];
        return get().records.find(record => 
          record.userId === userId && record.date === today
        ) || null;
      },

      exportToExcel: () => {
        try {
          const records = get().records;
          if (records.length === 0) {
            toast.error('אין נתונים לייצוא');
            return;
          }
          
          import('xlsx').then((module) => {
            const XLSX = module.default || module;
            
            const data = records.map(record => ({
              'תאריך כניסה': new Date(record.date).toLocaleDateString('he-IL'),
              'שעת כניסה': new Date(record.clockIn).toLocaleTimeString('he-IL'),
              'תאריך יציאה': record.clockOut ? new Date(record.clockOut).toLocaleDateString('he-IL') : '-',
              'שעת יציאה': record.clockOut ? new Date(record.clockOut).toLocaleTimeString('he-IL') : '-',
              'סה"כ שעות': record.totalHours?.toFixed(2) || '-',
              'הערות': record.notes || '-'
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'נוכחות');
            
            ws['!cols'] = [
              { wch: 15 }, // תאריך כניסה
              { wch: 15 }, // שעת כניסה
              { wch: 15 }, // תאריך יציאה
              { wch: 15 }, // שעת יציאה
              { wch: 12 }, // סה"כ שעות
              { wch: 30 }  // הערות
            ];

            const currentDate = new Date().toLocaleDateString('he-IL').replace(/\//g, '_');
            const filename = `נוכחות_${currentDate}.xlsx`;
            
            XLSX.writeFile(wb, filename);
            toast.success('הנתונים יוצאו בהצלחה');
          }).catch((error) => {
            console.error('Error loading XLSX:', error);
            toast.error('אירעה שגיאה בייצוא הנתונים');
          });
        } catch (error) {
          console.error('Error exporting attendance:', error);
          toast.error('אירעה שגיאה בייצוא הנתונים');
        }
      },

      clearRecords: () => {
        set({ records: [], currentSession: null, error: null });
      },

      // Legacy functions for backward compatibility
      addRecord: () => {
        get().clockIn();
      },

      endRecord: () => {
        get().clockOut();
      },

      getRecordsForUser: (userId: string) => {
        const { records } = get();
        return records.filter((record) => record.userId === userId);
      },

      getTotalHoursForPeriod: (userId: string, startDate: Date, endDate: Date) => {
        const { records } = get();
        return records
          .filter(
            (record) =>
              record.userId === userId &&
              new Date(record.date) >= startDate &&
              new Date(record.date) <= endDate &&
              record.totalHours !== null
          )
          .reduce((total, record) => total + (record.totalHours || 0), 0);
      }
    }),
    {
      name: 'attendance-storage',
      version: 2,
      migrate: (persistedState: any) => {
        return {
          records: persistedState.records || [],
          currentSession: persistedState.currentSession || null,
          isLoading: false,
          error: null
        };
      }
    }
  )
);