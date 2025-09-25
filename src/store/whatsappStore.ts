import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

/**
 * WhatsApp Store - ניהול חיבור ווטסאפ ושליחת הודעות
 */
interface WhatsAppConnection {
  id: number;
  phone_number_id: string;
  business_account_id?: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
}

interface WhatsAppMessage {
  phone_number: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  message_id?: string;
  error?: string;
  sent_at?: string;
}

interface WhatsAppStore {
  // State
  connection: WhatsAppConnection | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  messages: WhatsAppMessage[];
  
  // Actions
  checkConnectionStatus: () => Promise<void>;
  connectWhatsApp: (apiData: {
    access_token: string;
    phone_number_id: string;
    business_account_id?: string;
    app_id?: string;
    webhook_verify_token?: string;
  }) => Promise<void>;
  updateWhatsAppConnection: (apiData: {
    access_token: string;
    phone_number_id: string;
    business_account_id?: string;
    app_id?: string;
    webhook_verify_token?: string;
  }) => Promise<void>;
  disconnectWhatsApp: () => Promise<void>;
  sendMessages: (phoneNumbers: string[], message: string) => Promise<void>;
  clearError: () => void;
  clearMessages: () => void;
}

export const useWhatsAppStore = create<WhatsAppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      connection: null,
      isConnected: false,
      isLoading: false,
      error: null,
      messages: [],

      /**
       * בדיקת סטטוס החיבור
       */
      checkConnectionStatus: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            throw new Error('No authentication token found');
          }

          const response = await fetch('/api/whatsapp/status', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          set({
            connection: data.connected ? data.connection : null,
            isConnected: data.connected,
            isLoading: false,
          });

        } catch (error) {
          console.error('Error checking WhatsApp connection status:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to check connection status',
            isLoading: false,
            isConnected: false,
            connection: null,
          });
        }
      },

      /**
       * חיבור לווטסאפ עם API credentials
       */
      connectWhatsApp: async (apiData: {
        access_token: string;
        phone_number_id: string;
        business_account_id?: string;
        app_id?: string;
        webhook_verify_token?: string;
      }) => {
        set({ isLoading: true, error: null });
        
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            throw new Error('No authentication token found');
          }

          const response = await fetch('/api/whatsapp/connect', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          if (data.success) {
            set({
              connection: data.connection,
              isConnected: data.connection.is_active,
              isLoading: false,
            });
          } else {
            throw new Error(data.error || 'Failed to connect WhatsApp');
          }

        } catch (error) {
          console.error('Error connecting WhatsApp:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to connect WhatsApp',
            isLoading: false,
          });
        }
      },

      /**
       * עדכון חיבור ווטסאפ
       */
      updateWhatsAppConnection: async (apiData: {
        access_token: string;
        phone_number_id: string;
        business_account_id?: string;
        app_id?: string;
        webhook_verify_token?: string;
      }) => {
        set({ isLoading: true, error: null });
        
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            throw new Error('No authentication token found');
          }

          const response = await fetch('/api/whatsapp/update', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          if (data.success) {
            set({
              connection: data.connection,
              isConnected: data.connection.is_active,
              isLoading: false,
            });
          } else {
            throw new Error(data.error || 'Failed to update WhatsApp connection');
          }

        } catch (error) {
          console.error('Error updating WhatsApp connection:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to update WhatsApp connection',
            isLoading: false,
          });
        }
      },

      /**
       * ניתוק חיבור ווטסאפ
       */
      disconnectWhatsApp: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            throw new Error('No authentication token found');
          }

          const response = await fetch('/api/whatsapp/disconnect', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          set({
            connection: null,
            isConnected: false,
            isLoading: false,
            messages: [],
          });

        } catch (error) {
          console.error('Error disconnecting WhatsApp:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to disconnect WhatsApp',
            isLoading: false,
          });
        }
      },

      /**
       * שליחת הודעות ווטסאפ
       */
      sendMessages: async (phoneNumbers: string[], message: string) => {
        set({ isLoading: true, error: null });
        
        // הוספת הודעות למצב pending
        const pendingMessages: WhatsAppMessage[] = phoneNumbers.map(phone => ({
          phone_number: phone,
          message,
          status: 'pending',
        }));

        set(state => ({
          messages: [...state.messages, ...pendingMessages],
        }));

        try {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            throw new Error('No authentication token found');
          }

          const response = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phone_numbers: phoneNumbers,
              message: message,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          // עדכון סטטוס ההודעות
          set(state => {
            const updatedMessages = [...state.messages];
            
            // עדכון הודעות שנשלחו בהצלחה
            data.results?.forEach((result: any) => {
              const messageIndex = updatedMessages.findIndex(
                msg => msg.phone_number === result.phone_number && msg.status === 'pending'
              );
              if (messageIndex !== -1) {
                updatedMessages[messageIndex] = {
                  ...updatedMessages[messageIndex],
                  status: 'sent',
                  message_id: result.message_id,
                  sent_at: new Date().toISOString(),
                };
              }
            });

            // עדכון הודעות שנכשלו
            data.errors?.forEach((error: any) => {
              const messageIndex = updatedMessages.findIndex(
                msg => msg.phone_number === error.phone_number && msg.status === 'pending'
              );
              if (messageIndex !== -1) {
                updatedMessages[messageIndex] = {
                  ...updatedMessages[messageIndex],
                  status: 'failed',
                  error: error.error,
                };
              }
            });

            return {
              messages: updatedMessages,
              isLoading: false,
            };
          });

          // עדכון סטטוס החיבור
          await get().checkConnectionStatus();

        } catch (error) {
          console.error('Error sending WhatsApp messages:', error);
          
          // עדכון כל ההודעות שנכשלו
          set(state => {
            const updatedMessages = state.messages.map(msg => 
              msg.status === 'pending' 
                ? { ...msg, status: 'failed' as const, error: error instanceof Error ? error.message : 'Failed to send message' }
                : msg
            );

            return {
              messages: updatedMessages,
              error: error instanceof Error ? error.message : 'Failed to send messages',
              isLoading: false,
            };
          });
        }
      },

      /**
       * ניקוי שגיאות
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * ניקוי הודעות
       */
      clearMessages: () => {
        set({ messages: [] });
      },
    }),
    {
      name: 'whatsapp-store',
      partialize: (state) => ({
        connection: state.connection,
        isConnected: state.isConnected,
        messages: state.messages,
      }),
    }
  )
);

/**
 * Hook לבדיקת הרשאות ווטסאפ
 */
export const useWhatsAppPermissions = () => {
  const { user } = useAuthStore();
  
  const canConnect = user?.role === 'manager';
  const canSend = user?.role === 'manager' || user?.role === 'agent';
  
  return {
    canConnect,
    canSend,
    isManager: user?.role === 'manager',
    isAgent: user?.role === 'agent',
  };
};

/**
 * Hook לשליחת הודעות ווטסאפ עם validation
 */
export const useWhatsAppMessaging = () => {
  const { sendMessages, isLoading, error } = useWhatsAppStore();
  const { canSend } = useWhatsAppPermissions();

  const sendWhatsAppMessage = async (phoneNumbers: string[], message: string) => {
    if (!canSend) {
      throw new Error('You do not have permission to send WhatsApp messages');
    }

    if (!phoneNumbers || phoneNumbers.length === 0) {
      throw new Error('At least one phone number is required');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('Message content is required');
    }

    // Validation של מספרי טלפון
    const validPhoneNumbers = phoneNumbers.filter(phone => {
      const cleanPhone = phone.replace(/[^\d]/g, '');
      return cleanPhone.length >= 9 && cleanPhone.length <= 15;
    });

    if (validPhoneNumbers.length === 0) {
      throw new Error('No valid phone numbers provided');
    }

    await sendMessages(validPhoneNumbers, message.trim());
  };

  return {
    sendWhatsAppMessage,
    isLoading,
    error,
    canSend,
  };
};
