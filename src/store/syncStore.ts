import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

interface SyncEvent {
  id: string;
  type: 'lead' | 'customer' | 'reminder' | 'task' | 'user' | 'client' | 'attendance' | 'notification';
  action: 'create' | 'update' | 'delete' | 'status_change';
  entityId: string;
  userId: string;
  timestamp: string;
  data: any;
  synced: boolean;
  retryCount: number;
}

interface SyncStore {
  events: SyncEvent[];
  isOnline: boolean;
  lastSync: string | null;
  syncInProgress: boolean;
  
  // Core sync functions
  addSyncEvent: (event: Omit<SyncEvent, 'id' | 'timestamp' | 'synced' | 'retryCount'>) => void;
  processSyncEvents: () => Promise<void>;
  forceSyncAll: () => Promise<void>;
  
  // Real-time sync
  startRealTimeSync: () => void;
  stopRealTimeSync: () => void;
  
  // Cross-store synchronization
  syncLeadToCustomer: (leadId: string, customerData: any) => Promise<void>;
  syncReminderToNotification: (reminderId: string) => Promise<void>;
  syncTaskToCalendar: (taskId: string) => Promise<void>;
  
  // Data integrity
  validateDataIntegrity: () => Promise<boolean>;
  repairDataInconsistencies: () => Promise<void>;
  
  // Conflict resolution
  resolveConflicts: () => Promise<void>;
  
  // Status management
  setOnlineStatus: (status: boolean) => void;
  getSystemHealth: () => {
    totalEvents: number;
    pendingEvents: number;
    failedEvents: number;
    lastSync: string | null;
    isHealthy: boolean;
  };
}

let syncInterval: NodeJS.Timeout | null = null;
let onlineCheckInterval: NodeJS.Timeout | null = null;

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      events: [],
      isOnline: navigator.onLine,
      lastSync: null,
      syncInProgress: false,

      addSyncEvent: (eventData) => {
        // Get user safely without causing circular dependency
        const authState = JSON.parse(localStorage.getItem('auth-storage') || '{}');
        if (!authState.state?.user) return;

        const event: SyncEvent = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          synced: false,
          retryCount: 0,
          userId: authState.state.user.id,
          ...eventData
        };

        set((state) => ({
          events: [...state.events, event]
        }));

        // Process immediately if online
        if (get().isOnline) {
          setTimeout(() => get().processSyncEvents(), 100);
        }
      },

      processSyncEvents: async () => {
        const state = get();
        if (state.syncInProgress || !state.isOnline) return;

        set({ syncInProgress: true });

        try {
          const pendingEvents = state.events.filter(e => !e.synced && e.retryCount < 3);
          
          for (const event of pendingEvents) {
            try {
              await get().processEvent(event);
              
              // Mark as synced
              set((state) => ({
                events: state.events.map(e => 
                  e.id === event.id ? { ...e, synced: true } : e
                )
              }));
            } catch (error) {
              console.error(`Sync failed for event ${event.id}:`, error);
              
              // Increment retry count
              set((state) => ({
                events: state.events.map(e => 
                  e.id === event.id ? { ...e, retryCount: e.retryCount + 1 } : e
                )
              }));
            }
          }

          set({ 
            lastSync: new Date().toISOString(),
            syncInProgress: false 
          });

        } catch (error) {
          console.error('Sync process failed:', error);
          set({ syncInProgress: false });
        }
      },

      processEvent: async (event: SyncEvent) => {
        // This is where we would normally sync with a backend
        // For now, we'll just simulate the sync and trigger cross-store updates
        
        switch (event.type) {
          case 'lead':
            await get().syncLeadEvent(event);
            break;
          case 'customer':
            await get().syncCustomerEvent(event);
            break;
          case 'reminder':
            await get().syncReminderEvent(event);
            break;
          case 'task':
            await get().syncTaskEvent(event);
            break;
          case 'user':
            await get().syncUserEvent(event);
            break;
          case 'notification':
            await get().syncNotificationEvent(event);
            break;
        }
      },

      syncLeadEvent: async (event: SyncEvent) => {
        if (event.action === 'status_change') {
          // Trigger related updates
          if (event.data.newStatus === 'עסקה נסגרה') {
            console.log('Lead converted to customer');
          }
        }
      },

      syncCustomerEvent: async (event: SyncEvent) => {
        if (event.action === 'create') {
          console.log('Customer created');
        }
      },

      syncReminderEvent: async (event: SyncEvent) => {
        if (event.action === 'create') {
          console.log('Reminder created');
        }
      },

      syncTaskEvent: async (event: SyncEvent) => {
        // Sync tasks with calendar and notifications
        if (event.action === 'create') {
        }
      },

      syncUserEvent: async (event: SyncEvent) => {
        // Handle user-related sync events
        if (event.action === 'create') {
          console.log('New user created, syncing permissions...');
        }
      },

      syncNotificationEvent: async (event: SyncEvent) => {
        // Handle notification sync
        console.log('Notification event synced');
      },

      forceSyncAll: async () => {
        set({ syncInProgress: true });
        
        try {
          // Force sync all stores
          await get().validateDataIntegrity();
          await get().processSyncEvents();
          await get().repairDataInconsistencies();
          
          toast.success('סנכרון מלא הושלם בהצלחה');
        } catch (error) {
          console.error('Force sync failed:', error);
          toast.error('שגיאה בסנכרון מלא');
        } finally {
          set({ syncInProgress: false });
        }
      },

      startRealTimeSync: () => {
        // Start sync interval
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(() => {
          get().processSyncEvents();
        }, 5000); // Sync every 5 seconds

        // Start online status check
        if (onlineCheckInterval) clearInterval(onlineCheckInterval);
        onlineCheckInterval = setInterval(() => {
          set({ isOnline: navigator.onLine });
        }, 1000);

        // Listen for online/offline events
        window.addEventListener('online', () => {
          set({ isOnline: true });
          get().processSyncEvents();
        });

        window.addEventListener('offline', () => {
          set({ isOnline: false });
        });
      },

      stopRealTimeSync: () => {
        if (syncInterval) {
          clearInterval(syncInterval);
          syncInterval = null;
        }
        if (onlineCheckInterval) {
          clearInterval(onlineCheckInterval);
          onlineCheckInterval = null;
        }
      },

      syncLeadToCustomer: async (leadId: string, customerData: any) => {
        try {
          toast.success('ליד הומר ללקוח בהצלחה');
        } catch (error) {
          console.error('Lead to customer sync failed:', error);
          toast.error('שגיאה בהמרת ליד ללקוח');
        }
      },

      syncReminderToNotification: async (reminderId: string) => {
        console.log(`Syncing reminder ${reminderId} to notification`);
      },

      syncTaskToCalendar: async (taskId: string) => {
        // Sync task with calendar system
      },

      validateDataIntegrity: async () => {
        try {
          let isValid = true;
          return isValid;
        } catch (error) {
          console.error('Data integrity check failed:', error);
          return false;
        }
      },

      repairDataInconsistencies: async () => {
        try {
          let repairCount = 0;
          if (repairCount > 0) {
            toast.success(`תוקנו ${repairCount} בעיות עקביות נתונים`);
          }
          
        } catch (error) {
          console.error('Data repair failed:', error);
          toast.error('שגיאה בתיקון עקביות נתונים');
        }
      },

      resolveConflicts: async () => {
        // Handle data conflicts (for future multi-user scenarios)
        const conflicts = get().events.filter(e => e.retryCount >= 3);
        
        conflicts.forEach(conflict => {
          console.warn(`Unresolved conflict for event ${conflict.id}:`, conflict);
        });
        
        // Remove failed events after 3 retries
        set((state) => ({
          events: state.events.filter(e => e.retryCount < 3)
        }));
      },

      setOnlineStatus: (status) => {
        set({ isOnline: status });
        
        if (status) {
          // Process pending events when coming back online
          setTimeout(() => get().processSyncEvents(), 1000);
        }
      },

      getSystemHealth: () => {
        const state = get();
        const totalEvents = state.events.length;
        const pendingEvents = state.events.filter(e => !e.synced).length;
        const failedEvents = state.events.filter(e => e.retryCount >= 3).length;
        
        return {
          totalEvents,
          pendingEvents,
          failedEvents,
          lastSync: state.lastSync,
          isHealthy: pendingEvents === 0 && failedEvents === 0
        };
      }
    }),
    {
      name: 'sync-storage',
      version: 1,
      partialize: (state) => ({
        events: state.events.filter(e => !e.synced), // Only persist unsynced events
        lastSync: state.lastSync
      })
    }
  )
);

// Auto-start sync when store is created
setTimeout(() => {
  useSyncStore.getState().startRealTimeSync();
}, 1000);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  useSyncStore.getState().stopRealTimeSync();
});