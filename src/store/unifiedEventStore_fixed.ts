import { API_BASE_URL } from '../config/api.js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

export interface UnifiedEvent {
  id: string;
  title: string;
  description?: string;
  eventType: 'reminder' | 'meeting' | 'task' | 'no-reminder';
  startTime: string;
  endTime: string;
  advanceNotice: number; // minutes before event
  isActive?: boolean; // for reminders
  notified?: boolean; // for reminders
  customerId?: string;
  customerName?: string; // for reminders without customer_id
  leadId?: string;
  taskId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedEventFormData {
  title: string;
  description?: string;
  eventType: 'reminder' | 'meeting' | 'task' | 'no-reminder';
  startTime: string;
  endTime: string;
  advanceNotice?: number;
  isActive?: boolean;
  notified?: boolean;
  customerId?: string;
  customerName?: string;
  leadId?: string;
  taskId?: string;
}

interface UnifiedEventStore {
  events: UnifiedEvent[];
  isLoading: boolean;
  error: string | null;
  
  // API functions
  fetchEvents: () => Promise<void>;
  fetchEventsByType: (eventType: string) => Promise<void>;
  fetchEventsByDateRange: (startDate: string, endDate: string) => Promise<void>;
  addEvent: (eventData: UnifiedEventFormData) => Promise<void>;
  updateEvent: (id: string, updates: Partial<UnifiedEventFormData>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  markAsNotified: (id: string) => Promise<void>;
  
  // Helper functions
  getEventsByType: (eventType: string) => UnifiedEvent[];
  getEventsByLead: (leadId: string) => UnifiedEvent[];
  getEventsByCustomer: (customerId: string) => UnifiedEvent[];
  getTodayEvents: () => UnifiedEvent[];
  getUpcomingEvents: () => UnifiedEvent[];
  getRemindersForNotification: () => UnifiedEvent[];
  clearEvents: () => void;
}

// Helper function for safe JSON parsing
const safeJsonParse = async (response: Response, url: string) => {
  const contentType = response.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`Non-JSON response from ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      contentType,
      body: text.substring(0, 200) + (text.length > 200 ? '...' : '')
    });
    throw new Error(`Server returned ${response.status} ${response.statusText} - Expected JSON but got ${contentType}`);
  }
  
  try {
    return await response.json();
  } catch (error) {
    console.error(`Failed to parse JSON from ${url}:`, error);
    throw new Error(`Invalid JSON response from server: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const useUnifiedEventStore = create<UnifiedEventStore>()(
  persist(
    (set, get) => ({
      events: [],
      isLoading: false,
      error: null,

      fetchEvents: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const url = `${API_BASE_URL}/unified-events`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await safeJsonParse(response, url);
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await safeJsonParse(response, url);
          
          // Transform server data to match our UnifiedEvent interface
          const events = data.events?.map((event: any) => ({
            id: event.id?.toString() || '',
            title: event.title || '',
            description: event.description || '',
            eventType: event.eventType || 'reminder',
            startTime: event.startTime ? (typeof event.startTime === 'string' ? event.startTime : event.startTime.toString()) : new Date().toISOString(),
            endTime: event.endTime ? (typeof event.endTime === 'string' ? event.endTime : event.endTime.toString()) : new Date().toISOString(),
            advanceNotice: event.advanceNotice || 0,
            isActive: event.isActive !== undefined ? event.isActive : true,
            notified: event.notified || false,
            customerId: event.customerId?.toString() || '',
            customerName: event.customerName || '',
            leadId: event.leadId?.toString() || '',
            taskId: event.taskId?.toString() || '',
            createdBy: event.createdBy?.toString() || '',
            createdAt: event.createdAt ? (typeof event.createdAt === 'string' ? event.createdAt : new Date(event.createdAt).toISOString()) : new Date().toISOString(),
            updatedAt: event.updatedAt ? (typeof event.updatedAt === 'string' ? event.updatedAt : new Date(event.updatedAt).toISOString()) : new Date().toISOString()
          })) || [];

          set({ events, isLoading: false });
        } catch (error) {
          console.error('Error fetching events:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה בטעינת האירועים',
            isLoading: false 
          });
          toast.error('שגיאה בטעינת האירועים');
        }
      },

      fetchEventsByType: async (eventType: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const url = `${API_BASE_URL}/unified-events?type=${eventType}`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await safeJsonParse(response, url);
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await safeJsonParse(response, url);
          
          // Transform server data to match our UnifiedEvent interface
          const events = data.events?.map((event: any) => ({
            id: event.id.toString(),
            title: event.title,
            description: event.description,
            eventType: event.eventType,
            startTime: event.startTime,
            endTime: event.endTime,
            advanceNotice: event.advanceNotice || 0,
            isActive: event.isActive !== undefined ? event.isActive : true,
            notified: event.notified || false,
            customerId: event.customerId?.toString(),
            customerName: event.customerName,
            leadId: event.leadId?.toString(),
            taskId: event.taskId?.toString(),
            createdBy: event.createdBy?.toString(),
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
          })) || [];

          set({ events, isLoading: false });
        } catch (error) {
          console.error('Error fetching events by type:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה בטעינת האירועים',
            isLoading: false 
          });
          toast.error('שגיאה בטעינת האירועים');
        }
      },

      fetchEventsByDateRange: async (startDate: string, endDate: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const url = `${API_BASE_URL}/unified-events?start_date=${startDate}&end_date=${endDate}`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await safeJsonParse(response, url);
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await safeJsonParse(response, url);
          
          // Transform server data to match our UnifiedEvent interface
          const events = data.events?.map((event: any) => ({
            id: event.id.toString(),
            title: event.title,
            description: event.description,
            eventType: event.eventType,
            startTime: event.startTime,
            endTime: event.endTime,
            advanceNotice: event.advanceNotice || 0,
            isActive: event.isActive !== undefined ? event.isActive : true,
            notified: event.notified || false,
            customerId: event.customerId?.toString(),
            customerName: event.customerName,
            leadId: event.leadId?.toString(),
            taskId: event.taskId?.toString(),
            createdBy: event.createdBy?.toString(),
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
          })) || [];

          set({ events, isLoading: false });
        } catch (error) {
          console.error('Error fetching events by date range:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה בטעינת האירועים',
            isLoading: false 
          });
          toast.error('שגיאה בטעינת האירועים');
        }
      },

      addEvent: async (eventData: UnifiedEventFormData) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          // Transform data to match server expectations
          const serverData = {
            title: eventData.title,
            description: eventData.description,
            eventType: eventData.eventType,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            advanceNotice: eventData.advanceNotice || 0,
            isActive: eventData.isActive !== undefined ? eventData.isActive : true,
            notified: eventData.notified || false,
            customerId: eventData.customerId ? parseInt(eventData.customerId) : null,
            customerName: eventData.customerName,
            leadId: eventData.leadId ? parseInt(eventData.leadId) : null,
            taskId: eventData.taskId ? parseInt(eventData.taskId) : null
          };

          const url = `${API_BASE_URL}/unified-events`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(serverData)
          });

          if (!response.ok) {
            const errorData = await safeJsonParse(response, url);
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          // Refresh events list
          await get().fetchEvents();
          
          toast.success('האירוע נוצר בהצלחה');
        } catch (error) {
          console.error('Error creating event:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת האירוע');
          throw error;
        }
      },

      updateEvent: async (id: string, updates: Partial<UnifiedEventFormData>) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          // Transform data to match server expectations
          const serverData: any = {};
          if (updates.title !== undefined) serverData.title = updates.title;
          if (updates.description !== undefined) serverData.description = updates.description;
          if (updates.eventType !== undefined) serverData.eventType = updates.eventType;
          if (updates.startTime !== undefined) serverData.startTime = updates.startTime;
          if (updates.endTime !== undefined) serverData.endTime = updates.endTime;
          if (updates.advanceNotice !== undefined) serverData.advanceNotice = updates.advanceNotice;
          if (updates.isActive !== undefined) serverData.isActive = updates.isActive;
          if (updates.notified !== undefined) serverData.notified = updates.notified;
          if (updates.customerId !== undefined) serverData.customerId = updates.customerId ? parseInt(updates.customerId) : null;
          if (updates.customerName !== undefined) serverData.customerName = updates.customerName;
          if (updates.leadId !== undefined) serverData.leadId = updates.leadId ? parseInt(updates.leadId) : null;
          if (updates.taskId !== undefined) serverData.taskId = updates.taskId ? parseInt(updates.taskId) : null;

          const url = `${API_BASE_URL}/unified-events/${id}`;
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(serverData)
          });

          if (!response.ok) {
            const errorData = await safeJsonParse(response, url);
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          // Refresh events list
          await get().fetchEvents();
          
          toast.success('האירוע עודכן בהצלחה');
        } catch (error) {
          console.error('Error updating event:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון האירוע');
          throw error;
        }
      },

      deleteEvent: async (id: string) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const url = `${API_BASE_URL}/unified-events/${id}`;
          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await safeJsonParse(response, url);
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          // Remove from local state
          set(state => ({
            events: state.events.filter(event => event.id !== id),
            isLoading: false
          }));
          
          toast.success('האירוע נמחק בהצלחה');
        } catch (error) {
          console.error('Error deleting event:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת האירוע');
          throw error;
        }
      },

      markAsNotified: async (id: string) => {
        try {
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const url = `${API_BASE_URL}/unified-events/${id}/notified`;
          const response = await fetch(url, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await safeJsonParse(response, url);
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          // Update local state
          set(state => ({
            events: state.events.map(event =>
              event.id === id ? { ...event, notified: true } : event
            )
          }));
        } catch (error) {
          console.error('Error marking as notified:', error);
          toast.error('שגיאה בעדכון התזכורת');
        }
      },

      // Helper functions
      getEventsByType: (eventType: string) => {
        return get().events.filter(event => event.eventType === eventType);
      },

      getEventsByLead: (leadId: string) => {
        return get().events.filter(event => event.leadId === leadId);
      },

      getEventsByCustomer: (customerId: string) => {
        return get().events.filter(event => event.customerId === customerId);
      },

      getTodayEvents: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().events.filter(event => 
          event.startTime.startsWith(today)
        );
      },

      getUpcomingEvents: () => {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        return get().events.filter(event => {
          const eventDate = new Date(event.startTime);
          return eventDate >= now && eventDate <= nextWeek;
        });
      },

      getRemindersForNotification: () => {
        return get().events.filter(event => 
          event.eventType === 'reminder' && 
          event.isActive && 
          !event.notified && 
          event.advanceNotice > 0
        );
      },

      clearEvents: () => {
        set({ events: [], error: null });
      }
    }),
    {
      name: 'unified-event-storage',
      version: 1,
      partialize: (state) => ({
        // Only persist events, not loading states
        events: state.events
      })
    }
  )
);
