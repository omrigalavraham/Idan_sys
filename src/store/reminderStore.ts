import { API_BASE_URL } from '../config/api.js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CustomerReminder } from '../types';
import useAuthStore from './authStore';
import { useNotificationStore } from './notificationStore';
import { createLocalDateTime, normalizeTimeString } from '../utils/dateUtils';
import toast from 'react-hot-toast';

export interface ReminderFormData {
  customerId: string;
  customerName: string;
  title: string;
  description?: string;
  reminderDate: string;
  reminderTime: string;
  advanceNotice?: number;
  fromCalendar?: boolean; // Flag to prevent infinite loop
}

interface ReminderStore {
  reminders: CustomerReminder[];
  isLoading: boolean;
  error: string | null;
  
  // API functions
  fetchReminders: () => Promise<void>;
  addReminder: (reminderData: ReminderFormData) => Promise<void>;
  updateReminder: (id: string, updates: Partial<ReminderFormData>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  checkReminders: () => void;
  getActiveReminders: () => CustomerReminder[];
  getUserReminders: () => CustomerReminder[];
  getCustomerReminders: (customerId: string) => CustomerReminder[];
  getDueReminders: () => CustomerReminder[];
  markAsNotified: (id: string) => Promise<void>;
  deactivateReminder: (id: string) => Promise<void>;
  clearReminders: () => void;
}

export const useReminderStore = create<ReminderStore>()(
  persist(
    (set, get) => ({
      reminders: [],
      isLoading: false,
      error: null,

      fetchReminders: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/reminders`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error('שגיאה בטעינת התזכורות');
          }

          const data = await response.json();
          
          // Transform server data to match our CustomerReminder interface
          const reminders = data.reminders?.map((reminder: any) => ({
            id: reminder.id.toString(),
            customerId: reminder.customer_id ? reminder.customer_id.toString() : '',
            customerName: reminder.customer_name,
            title: reminder.title,
            description: reminder.description,
            reminderDate: reminder.reminder_date,
            reminderTime: reminder.reminder_time, // Ensure HH:MM format
            advanceNotice: reminder.advance_notice,
            isActive: reminder.is_active,
            notified: reminder.notified,
            createdBy: reminder.created_by.toString(),
            createdAt: reminder.created_at
          })) || [];

          set({ reminders, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'שגיאה בטעינת התזכורות';
          set({ 
            error: errorMessage,
            isLoading: false 
          });
          
          // Only show toast if it's not an authentication error
          if (!errorMessage.includes('טוקן התחברות')) {
            toast.error('שגיאה בטעינת התזכורות');
          }
        }
      },

      addReminder: async (reminderData: ReminderFormData) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות - נא להתחבר לאפליקציה');
          }

          // For calendar events, we don't need to create customers automatically
          // Just use the customerId if provided and valid, otherwise leave it null
          let customerId = null;
          if (reminderData.customerId && reminderData.customerId.trim() !== '') {
            const parsedId = parseInt(reminderData.customerId);
            if (!isNaN(parsedId) && parsedId > 0) {
              customerId = parsedId;
            }
          }

          // Transform data to match server expectations
          const serverData = {
            customer_id: customerId,
            customer_name: reminderData.customerName,
            title: reminderData.title,
            description: reminderData.description,
            reminder_date: reminderData.reminderDate,
            reminder_time: reminderData.reminderTime,
            advance_notice: reminderData.advanceNotice || 1440
          };
          
          const response = await fetch(`${API_BASE_URL}/reminders`, {
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
            throw new Error(errorData.error || 'שגיאה ביצירת התזכורת');
          }
          
          // Refresh reminders list
          await get().fetchReminders();
          
          // Also create a calendar event for the reminder (only if not from calendar)
          if (!reminderData.fromCalendar) {
            try {
              const { useCalendarStore } = await import('./calendarStore');
              const calendarData = {
                title: reminderData.title,
                description: reminderData.description || '',
                eventType: 'reminder' as const,
                startTime: `${reminderData.reminderDate}T${reminderData.reminderTime}:00`,
                endTime: `${reminderData.reminderDate}T${reminderData.reminderTime}:00`,
                leadId: null,
                customerId: customerId ? customerId.toString() : null,
                advanceNotice: 0 // Don't create reminder for calendar event to prevent infinite loop
              };
              
              await useCalendarStore.getState().addEvent(calendarData);
            } catch (calendarError) {
              console.error('Error creating calendar event for reminder:', calendarError);
              // Don't fail the reminder creation if calendar event creation fails
            }
          }
          
          toast.success('התזכורת נוצרה בהצלחה');
        } catch (error) {
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת התזכורת');
          throw error;
        }
      },

      updateReminder: async (id: string, updates: Partial<ReminderFormData>) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          // Transform data to match server expectations
          const serverData: any = {};
          if (updates.customerId !== undefined) serverData.customer_id = parseInt(updates.customerId);
          if (updates.customerName !== undefined) serverData.customer_name = updates.customerName;
          if (updates.title !== undefined) serverData.title = updates.title;
          if (updates.description !== undefined) serverData.description = updates.description;
          if (updates.reminderDate !== undefined) serverData.reminder_date = updates.reminderDate;
          if (updates.reminderTime !== undefined) serverData.reminder_time = updates.reminderTime;
          if (updates.advanceNotice !== undefined) serverData.advance_notice = updates.advanceNotice;

          const response = await fetch(`${API_BASE_URL}/reminders/${id}`, {
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
            throw new Error(errorData.error || 'שגיאה בעדכון התזכורת');
          }

          // Refresh reminders list
          await get().fetchReminders();
          
          // Also update associated calendar event if it exists
          try {
            const { useCalendarStore } = await import('./calendarStore');
            const events = useCalendarStore.getState().events;
            
            // Find event with matching title and time
            const reminderToUpdate = get().reminders.find(reminder => reminder.id === id);
            if (reminderToUpdate) {
              const matchingEvent = events.find(event => 
                event.title === reminderToUpdate.title &&
                event.startTime.split('T')[0] === reminderToUpdate.reminderDate &&
                event.startTime.split('T')[1].substring(0, 5) === reminderToUpdate.reminderTime.substring(0, 5)
              );
              
              if (matchingEvent) {
                // Update the calendar event with new data
                const updatedStartTime = `${updates.reminderDate || reminderToUpdate.reminderDate}T${updates.reminderTime || reminderToUpdate.reminderTime}:00`;
                const updatedEndTime = updatedStartTime; // Same as start time for reminders
                
                await useCalendarStore.getState().updateEvent(matchingEvent.id, {
                  title: updates.title || reminderToUpdate.title,
                  description: updates.description !== undefined ? updates.description : reminderToUpdate.description || '',
                  startTime: updatedStartTime,
                  endTime: updatedEndTime,
                  advanceNotice: updates.advanceNotice || reminderToUpdate.advanceNotice
                });
              }
            }
          } catch (error) {
            console.error('Error updating associated calendar event:', error);
            // Don't fail the reminder update if event update fails
          }
          
          toast.success('התזכורת עודכנה בהצלחה');
        } catch (error) {
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון התזכורת');
          throw error;
        }
      },

      deleteReminder: async (id: string) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/reminders/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה במחיקת התזכורת');
          }

          // Remove from local state
          set(state => ({
            reminders: state.reminders.filter(reminder => reminder.id !== id),
            isLoading: false
          }));
          
          // Also delete associated calendar event if it exists
          try {
            const { useCalendarStore } = await import('./calendarStore');
            const events = useCalendarStore.getState().events;
            
            // Find event with matching title and time
            const reminderToDelete = get().reminders.find(reminder => reminder.id === id);
            if (reminderToDelete) {
              const eventTime = normalizeTimeString(events.find(event => 
                event.title === reminderToDelete.title &&
                event.startTime.split('T')[0] === reminderToDelete.reminderDate
              )?.startTime.split('T')[1] || '00:00');
              
              const matchingEvent = events.find(event => 
                event.title === reminderToDelete.title &&
                event.startTime.split('T')[0] === reminderToDelete.reminderDate &&
                eventTime === reminderToDelete.reminderTime
              );
              
              if (matchingEvent) {
                await useCalendarStore.getState().deleteEvent(matchingEvent.id);
              }
            }
          } catch (error) {
            console.error('Error deleting associated calendar event:', error);
            // Don't fail the reminder deletion if event deletion fails
          }
          
          toast.success('התזכורת נמחקה בהצלחה');
        } catch (error) {
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת התזכורת');
          throw error;
        }
      },

      getActiveReminders: () => {
        return get().reminders.filter(reminder => reminder.isActive);
      },

      getUserReminders: () => {
        return get().reminders;
      },

      getCustomerReminders: (customerId: string) => {
        return get().reminders.filter(reminder => reminder.customerId === customerId);
      },

      getDueReminders: () => {
        const now = new Date();
        return get().reminders.filter(reminder => {
          if (!reminder.isActive || reminder.notified) return false;
          
          const reminderDateTime = new Date(`${reminder.reminderDate}T${reminder.reminderTime}`);
          const timeDiff = reminderDateTime.getTime() - now.getTime();
          const minutesDiff = timeDiff / (1000 * 60);
          
          return minutesDiff <= reminder.advanceNotice;
        });
      },

      markAsNotified: async (id: string) => {
        try {
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/reminders/${id}/notified`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error('שגיאה בעדכון התזכורת');
          }

          // Update local state
          set(state => ({
            reminders: state.reminders.map(reminder =>
              reminder.id === id ? { ...reminder, notified: true } : reminder
            )
          }));
        } catch (error) {
          toast.error('שגיאה בעדכון התזכורת');
        }
      },

      deactivateReminder: async (id: string) => {
        try {
          await get().updateReminder(id, { isActive: false } as any);
        } catch (error) {
          throw error;
        }
      },

      clearReminders: () => {
        set({ reminders: [], error: null });
      },

      checkReminders: () => {
        // Get current user safely
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated || !authState.user) return;
        
        const now = new Date();
        const userReminders = get().getUserReminders();

        userReminders.forEach(reminder => {
          if (!reminder.isActive) return;

          try {
          // Create date in local timezone to avoid timezone offset issues
          const reminderDateTime = createLocalDateTime(reminder.reminderDate, reminder.reminderTime);
            
            // Check if reminder is overdue (past its time)
            if (now > reminderDateTime) {
              // Mark as overdue by deactivating it
              if (reminder.isActive) {
                // Update local state directly for overdue reminders
                set(state => ({
                  reminders: state.reminders.map(r =>
                    r.id === reminder.id ? { ...r, isActive: false } : r
                  )
                }));
              }
              return;
            }

            // Only process notifications for future reminders
            if (reminder.notified) return;

          const advanceNoticeTime = new Date(reminderDateTime.getTime() - (reminder.advanceNotice * 60 * 1000));

          // Check if it's time for advance notice
          if (now >= advanceNoticeTime) {
            // Add notification to notification store
            const notificationStore = useNotificationStore.getState();
            
            // Check if notification already exists for this reminder
            const existingNotification = notificationStore.notifications.find(n => 
              n.metadata?.reminderId === reminder.id && n.type === 'system'
            );
            
            if (existingNotification) return; // Don't create duplicate notification
            
            notificationStore.addNotification({
              type: 'system',
              title: 'תזכורת מוקדמת',
              message: `${reminder.title} - ${reminder.customerName}`,
              priority: 'medium',
              metadata: {
                reminderId: reminder.id,
                customerId: reminder.customerId,
                customerName: reminder.customerName,
                reminderDate: reminder.reminderDate,
                reminderTime: reminder.reminderTime,
                description: reminder.description
              }
            });

            // Mark as notified for advance notice
              set(state => ({
                reminders: state.reminders.map(r =>
                  r.id === reminder.id ? { ...r, notified: true } : r
                )
              }));
          }
          } catch (error) {
            // Skip reminders with invalid dates
            return;
          }
        });
      }
    }),
    {
      name: 'reminder-storage',
      version: 1,
      partialize: (state) => ({
        // Only persist reminders, not loading states
        reminders: state.reminders
      })
    }
  )
);

// Check reminders every minute
setInterval(() => {
  const { user } = useAuthStore.getState();
  if (user) {
    useReminderStore.getState().checkReminders();
  }
}, 30000); // Check every 30 seconds

// Initial check when store loads
setTimeout(() => {
  // Only start checking if user is authenticated
  const checkIfAuthenticated = () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      useReminderStore.getState().checkReminders();
      
      // Start interval checking
      setInterval(() => {
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          useReminderStore.getState().checkReminders();
        }
      }, 30000); // Check every 30 seconds
    } else {
      // Check again in 1 second if not authenticated yet
      setTimeout(checkIfAuthenticated, 1000);
    }
  };
  
  checkIfAuthenticated();
}, 2000);