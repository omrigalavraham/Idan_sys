import { API_BASE_URL } from '../config/api.js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { normalizeTimeString } from '../utils/dateUtils';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: 'lead' | 'task' | 'meeting' | 'reminder';
  startTime: string;
  endTime: string;
  leadId?: string;
  taskId?: string;
  customerId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventFormData {
  title: string;
  description?: string;
  eventType: 'lead' | 'task' | 'meeting' | 'reminder';
  startTime: string;
  endTime: string;
  leadId?: string | null;
  taskId?: string | null;
  customerId?: string | null;
  advanceNotice?: number;
}

interface CalendarStore {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  
  // API functions
  fetchEvents: () => Promise<void>;
  fetchEventsByDateRange: (startDate: string, endDate: string) => Promise<void>;
  addEvent: (eventData: CalendarEventFormData) => Promise<void>;
  updateEvent: (id: string, updates: Partial<CalendarEventFormData>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByType: (eventType: string) => CalendarEvent[];
  getEventsByLead: (leadId: string) => CalendarEvent[];
  getEventsByCustomer: (customerId: string) => CalendarEvent[];
  getTodayEvents: () => CalendarEvent[];
  getUpcomingEvents: () => CalendarEvent[];
  clearEvents: () => void;
}

export const useCalendarStore = create<CalendarStore>()(
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

          const response = await fetch(`${API_BASE_URL}/calendar`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error('שגיאה בטעינת האירועים');
          }

          const data = await response.json();
          
          // Transform server data to match our CalendarEvent interface
          const events = data.events?.map((event: any) => ({
            id: event.id.toString(),
            title: event.title,
            description: event.description,
            eventType: event.event_type,
            startTime: event.start_time,
            endTime: event.end_time,
            leadId: event.lead_id?.toString(),
            taskId: event.task_id?.toString(),
            customerId: event.customer_id?.toString(),
            createdBy: event.created_by?.toString(),
            createdAt: event.created_at,
            updatedAt: event.updated_at
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

      fetchEventsByDateRange: async (startDate: string, endDate: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/calendar?start_date=${startDate}&end_date=${endDate}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error('שגיאה בטעינת האירועים');
          }

          const data = await response.json();
          
          // Transform server data to match our CalendarEvent interface
          const events = data.events?.map((event: any) => ({
            id: event.id.toString(),
            title: event.title,
            description: event.description,
            eventType: event.event_type,
            startTime: event.start_time,
            endTime: event.end_time,
            leadId: event.lead_id?.toString(),
            taskId: event.task_id?.toString(),
            customerId: event.customer_id?.toString(),
            createdBy: event.created_by?.toString(),
            createdAt: event.created_at,
            updatedAt: event.updated_at
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

      addEvent: async (eventData: CalendarEventFormData) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          // Get user ID from JWT token
          if (!accessToken) {
            throw new Error('לא נמצא טוקן גישה');
          }
          
          // Decode JWT token to get user ID
          let userId;
          try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            userId = payload.userId;
            if (!userId) {
              throw new Error('לא נמצא מזהה משתמש בטוקן');
            }
          } catch (error) {
            throw new Error('שגיאה בפיענוח טוקן המשתמש');
          }

          // Transform data to match server expectations
          const serverData = {
            title: eventData.title,
            description: eventData.description,
            event_type: eventData.eventType,
            start_time: eventData.startTime,
            end_time: eventData.endTime,
            lead_id: (() => {
              if (eventData.leadId === null || eventData.leadId === undefined) {
                return null;
              }
              if (eventData.leadId === '') {
                return null;
              }
              const numValue = Number(eventData.leadId);
              if (isNaN(numValue)) {
                return null;
              }
              return numValue;
            })(),
            task_id: eventData.taskId ? parseInt(eventData.taskId) : null,
            customer_id: eventData.customerId ? parseInt(eventData.customerId) : null,
            created_by: parseInt(userId)
          };
          
          

          const response = await fetch(`${API_BASE_URL}/calendar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(serverData)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה ביצירת האירוע');
          }

          // Refresh events list
          await get().fetchEvents();
          
          // Create reminder for reminder and lead events (only if advanceNotice > 0)
          if ((eventData.eventType === 'reminder' || eventData.eventType === 'lead') && (eventData.advanceNotice || 0) > 0) {
            try {
              // Import reminder store
              const { useReminderStore } = await import('./reminderStore');
              
              // Create customer name from event title or lead info
              let customerName = eventData.title;
              if (eventData.leadId) {
                // Try to get lead name from lead store
                const { useLeadStore } = await import('./leadStore');
                const leads = useLeadStore.getState().leads;
                const lead = leads.find(l => l.id === eventData.leadId);
                if (lead) {
                  customerName = lead.name;
                }
              }
              
              const reminderData = {
                customerId: eventData.customerId || '', // Let backend handle customer creation if needed
                customerName: customerName,
                title: eventData.title,
                description: eventData.description || '',
                reminderDate: eventData.startTime.split('T')[0],
                reminderTime: normalizeTimeString(eventData.startTime.split('T')[1]), // Ensure HH:MM format
                advanceNotice: eventData.advanceNotice || 1440, // Use event's advance notice or default to 24 hours
                fromCalendar: true // Flag to prevent infinite loop
              };
              
              // Add reminder to database
              await useReminderStore.getState().addReminder(reminderData);
            } catch (error) {
              console.error('Error creating reminder for calendar event:', error);
              // Don't fail the event creation if reminder creation fails
            }
          }
          
          toast.success('האירוע נוצר בהצלחה');
        } catch (error) {
          console.error('Error creating event:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת האירוע');
          throw error;
        }
      },

      updateEvent: async (id: string, updates: Partial<CalendarEventFormData>) => {
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
          if (updates.eventType !== undefined) serverData.event_type = updates.eventType;
          if (updates.startTime !== undefined) serverData.start_time = updates.startTime;
          if (updates.endTime !== undefined) serverData.end_time = updates.endTime;
          if (updates.leadId !== undefined) {
            serverData.lead_id = (() => {
              if (updates.leadId === null || updates.leadId === undefined) {
                return null;
              }
              if (updates.leadId === '') {
                return null;
              }
              const numValue = Number(updates.leadId);
              if (isNaN(numValue)) {
                return null;
              }
              return numValue;
            })();
          }
          if (updates.taskId !== undefined) serverData.task_id = updates.taskId ? parseInt(updates.taskId) : null;
          if (updates.customerId !== undefined) serverData.customer_id = updates.customerId ? parseInt(updates.customerId) : null;
          

          const response = await fetch(`${API_BASE_URL}/calendar/${id}`, {
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
            throw new Error(errorData.error || 'שגיאה בעדכון האירוע');
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

          const response = await fetch(`${API_BASE_URL}/calendar/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה במחיקת האירוע');
          }

          // Remove from local state
          set(state => ({
            events: state.events.filter(event => event.id !== id),
            isLoading: false
          }));
          
          // Also delete associated reminder if it exists
          try {
            const { useReminderStore } = await import('./reminderStore');
            const reminders = useReminderStore.getState().reminders;
            
            // Find reminder with matching title and time (this is a simple approach)
            const eventToDelete = get().events.find(event => event.id === id);
            if (eventToDelete) {
              const eventTime = normalizeTimeString(eventToDelete.startTime.split('T')[1]);
              const matchingReminder = reminders.find(reminder => 
                reminder.title === eventToDelete.title &&
                reminder.reminderDate === eventToDelete.startTime.split('T')[0] &&
                reminder.reminderTime === eventTime
              );
              
              if (matchingReminder) {
                await useReminderStore.getState().deleteReminder(matchingReminder.id);
              }
            }
          } catch (error) {
            console.error('Error deleting associated reminder:', error);
            // Don't fail the event deletion if reminder deletion fails
          }
          
          toast.success('האירוע נמחק בהצלחה');
        } catch (error) {
          console.error('Error deleting event:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת האירוע');
          throw error;
        }
      },

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

      clearEvents: () => {
        set({ events: [], error: null });
      }
    }),
    {
      name: 'calendar-storage',
      version: 1,
      partialize: (state) => ({
        // Only persist events, not loading states
        events: state.events
      })
    }
  )
);
