import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useAuthStore from './authStore';
import { useLeadStore } from './leadStore';
import { useSyncStore } from './syncStore';
import toast from 'react-hot-toast';
import { createLocalDateTime } from '../utils/dateUtils';

export type NotificationType = 'lead' | 'task' | 'callback' | 'system' | 'reminder';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  createdAt: string;
  read: boolean;
  userId: string; // Add userId to track which user the notification belongs to
  link?: string;
  metadata?: Record<string, any>;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'userId'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  checkCallbackNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        // Check for duplicate notifications
        const { notifications } = get();
        const isDuplicate = notifications.some(n => 
          n.type === notification.type &&
          n.title === notification.title &&
          n.message === notification.message &&
          n.userId === user.id &&
          n.metadata?.reminderId === notification.metadata?.reminderId &&
          !n.read
        );
        
        if (isDuplicate) return; // Don't add duplicate notifications

        const newNotification: Notification = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          read: false,
          userId: user.id,
          ...notification,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));

        // Add sync event
        useSyncStore.getState().addSyncEvent({
          type: 'notification',
          action: 'create',
          entityId: newNotification.id,
          data: newNotification
        });
        
        // Only show browser notification for new notifications
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/vite.svg',
          });
        }

        // Only play sound for new notifications
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {
          // Ignore playback errors
        });
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: state.unreadCount - 1,
        }));
      },

      markAllAsRead: () => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        set((state) => ({
          notifications: state.notifications.map((n) => 
            n.userId === user.id ? { ...n, read: true } : n
          ),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: notification && !notification.read
              ? state.unreadCount - 1
              : state.unreadCount,
          };
        });
      },

      clearAll: () => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        set((state) => ({
          notifications: state.notifications.filter(n => n.userId !== user.id),
          unreadCount: 0,
        }));
      },

      checkCallbackNotifications: () => {
        // Only check if user is authenticated
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated || !authState.user) return;
        
        const user = authState.user;

        const { leads } = useLeadStore.getState();
        const { notifications, addNotification } = get();
        const now = new Date();
        
        // Filter leads for current user
        const userLeads = leads.filter(lead => lead.assignedTo === user.id);
        
        userLeads.forEach((lead) => {
          if (lead.callbackDate && lead.callbackTime) {
            // Create date in local timezone to avoid timezone offset issues
            const callbackDateTime = createLocalDateTime(lead.callbackDate, lead.callbackTime);
            
            // Check if callback is due and hasn't been notified
            // Show notification if the callback time has passed (even if overdue)
            // Only show once per day to avoid spam
            const today = now.toDateString();
            if (
              now >= callbackDateTime && 
              !notifications.some(n => 
                n.type === 'callback' && 
                n.metadata?.leadId === lead.id &&
                n.metadata?.callbackDate === lead.callbackDate &&
                n.metadata?.callbackTime === lead.callbackTime &&
                n.userId === user.id &&
                new Date(n.createdAt).toDateString() === today
              )
            ) {
              addNotification({
                type: 'callback',
                title: 'תזכורת לשיחה חוזרת',
                message: `הגיע הזמן לשיחה חוזרת עם ${lead.name}`,
                priority: 'high',
                metadata: {
                  leadId: lead.id,
                  name: lead.name,
                  phone: lead.phone,
                  callbackDate: lead.callbackDate,
                  callbackTime: lead.callbackTime,
                }
              });
            }
          }
        });
      },
    }),
    {
      name: 'notification-storage',
      version: 1,
      migrate: (persistedState: any) => {
        return {
          notifications: persistedState.notifications || [],
          unreadCount: persistedState.unreadCount || 0
        };
      }
    }
  )
);

// Start checking for notifications every minute - defer to next tick
setTimeout(() => {
  // Only start checking if user is authenticated
  const checkIfAuthenticated = () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      useNotificationStore.getState().checkCallbackNotifications();
      
      // Start interval checking
      setInterval(() => {
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          useNotificationStore.getState().checkCallbackNotifications();
        }
      }, 60000); // Check every minute
    } else {
      // Check again in 1 second if not authenticated yet
      setTimeout(checkIfAuthenticated, 1000);
    }
  };
  
  checkIfAuthenticated();
}, 2000);

setTimeout(() => {
  // Initial check for notifications
  const { isAuthenticated } = useAuthStore.getState();
  if (isAuthenticated) {
    useNotificationStore.getState().checkCallbackNotifications();
  }
}, 0);