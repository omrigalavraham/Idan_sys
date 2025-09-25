import { API_BASE_URL } from '../config/api.js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

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

interface DialerState {
  // Call History
  callHistory: CallHistory[];
  addCallToHistory: (call: Omit<CallHistory, 'id'>) => void;
  updateCallDuration: (callId: string, duration: number) => void;
  deleteCallFromHistory: (callId: string) => void;
  clearCallHistory: () => void;
  
  // Contacts
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  getContactByPhone: (phoneNumber: string) => Contact | undefined;
  
  // Favorites
  favoriteNumbers: string[];
  addToFavorites: (phoneNumber: string) => void;
  removeFromFavorites: (phoneNumber: string) => void;
  isFavorite: (phoneNumber: string) => boolean;
  
  // Recent Calls
  recentNumbers: string[];
  addToRecent: (phoneNumber: string) => void;
  clearRecent: () => void;
  
  // Call Settings
  callSettings: {
    autoRecord: boolean;
    showCallerId: boolean;
    blockUnknownNumbers: boolean;
    defaultCallDuration: number;
  };
  updateCallSettings: (settings: Partial<DialerState['callSettings']>) => void;
  
  // User-specific data management
  loadUserData: (userId: string) => void;
  saveUserData: (userId: string) => void;
}

export const useDialerStore = create<DialerState>()(
  persist(
    (set, get) => ({
      // Call History
      callHistory: [],
      addCallToHistory: (call) => {
        const newCall: CallHistory = {
          ...call,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        };
        set((state) => ({
          callHistory: [newCall, ...state.callHistory],
        }));
      },
      updateCallDuration: (callId, duration) => {
        set((state) => ({
          callHistory: state.callHistory.map((call) =>
            call.id === callId ? { ...call, duration } : call
          ),
        }));
      },
      deleteCallFromHistory: (callId) => {
        set((state) => ({
          callHistory: state.callHistory.filter((call) => call.id !== callId),
        }));
      },
      clearCallHistory: () => {
        set({ callHistory: [] });
      },

      // Contacts
      contacts: [],
      addContact: (contact) => {
        const newContact: Contact = {
          ...contact,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          contacts: [...state.contacts, newContact],
        }));
      },
      updateContact: (id, updates) => {
        set((state) => ({
          contacts: state.contacts.map((contact) =>
            contact.id === id
              ? { ...contact, ...updates, updatedAt: new Date() }
              : contact
          ),
        }));
      },
      deleteContact: (id) => {
        set((state) => ({
          contacts: state.contacts.filter((contact) => contact.id !== id),
        }));
      },
      getContactByPhone: (phoneNumber) => {
        const { contacts } = get();
        return contacts.find((contact) => contact.phoneNumber === phoneNumber);
      },

      // Favorites
      favoriteNumbers: [],
      addToFavorites: (phoneNumber) => {
        set((state) => ({
          favoriteNumbers: [...state.favoriteNumbers, phoneNumber],
        }));
      },
      removeFromFavorites: (phoneNumber) => {
        set((state) => ({
          favoriteNumbers: state.favoriteNumbers.filter((num) => num !== phoneNumber),
        }));
      },
      isFavorite: (phoneNumber) => {
        const { favoriteNumbers } = get();
        return favoriteNumbers.includes(phoneNumber);
      },

      // Recent Calls
      recentNumbers: [],
      addToRecent: (phoneNumber) => {
        set((state) => {
          const filtered = state.recentNumbers.filter((num) => num !== phoneNumber);
          return {
            recentNumbers: [phoneNumber, ...filtered].slice(0, 10), // Keep only 10 recent
          };
        });
      },
      clearRecent: () => {
        set({ recentNumbers: [] });
      },

      // Call Settings
      callSettings: {
        autoRecord: false,
        showCallerId: true,
        blockUnknownNumbers: false,
        defaultCallDuration: 0,
      },
      updateCallSettings: (settings) => {
        set((state) => ({
          callSettings: { ...state.callSettings, ...settings },
        }));
      },

      // User-specific data management
      loadUserData: async (userId: string) => {
        try {
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.error('No session token found');
            return;
          }

          const response = await fetch(`${API_BASE_URL}/users/${userId}/call-history`, {
            method: 'GET',
            headers: {
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Loaded call history from server:', data.callHistory?.length || 0, 'calls');
            
            // Convert timestamp strings back to Date objects
            const callHistory = (data.callHistory || []).map((call: any) => ({
              ...call,
              timestamp: new Date(call.timestamp)
            }));
            
            set({
              callHistory,
              contacts: data.contacts || [],
              favoriteNumbers: data.favoriteNumbers || [],
              recentNumbers: data.recentNumbers || [],
              callSettings: data.callSettings || {
                autoRecord: false,
                showCallerId: true,
                blockUnknownNumbers: false,
                defaultCallDuration: 0,
              }
            });
          } else {
            console.error('Failed to load user call history:', response.statusText);
          }
        } catch (error) {
          console.error('Error loading user dialer data:', error);
        }
      },

      saveUserData: async (userId: string) => {
        try {
          const state = get();
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.error('No session token found');
            return;
          }

          const dataToSave = {
            callHistory: state.callHistory,
            contacts: state.contacts,
            favoriteNumbers: state.favoriteNumbers,
            recentNumbers: state.recentNumbers,
            callSettings: state.callSettings,
          };

          const response = await fetch(`${API_BASE_URL}/users/${userId}/call-history`, {
            method: 'PUT',
            headers: {
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSave)
          });

          if (!response.ok) {
            console.error('Failed to save user call history:', response.statusText);
          }
        } catch (error) {
          console.error('Error saving user dialer data:', error);
        }
      },
    }),
    {
      name: 'dialer-storage',
      partialize: (state) => ({
        callHistory: state.callHistory,
        contacts: state.contacts,
        favoriteNumbers: state.favoriteNumbers,
        recentNumbers: state.recentNumbers,
        callSettings: state.callSettings,
      }),
    }
  )
);

// Helper functions for call management
export const dialerUtils = {
  formatPhoneNumber: (phoneNumber: string): string => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format Israeli phone numbers
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    
    // Format international numbers
    if (cleaned.startsWith('972') && cleaned.length === 12) {
      const localNumber = '0' + cleaned.slice(3);
      return localNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    
    return phoneNumber;
  },

  validatePhoneNumber: (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15;
  },

  initiateCall: (phoneNumber: string): void => {
    if (typeof window !== 'undefined') {
      // Format phone number for dialer (remove non-digits)
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      const phoneUrl = `tel:${formattedPhone}`;
      
      // Create clickable link for all devices (mobile and desktop)
      const link = document.createElement('a');
      link.href = phoneUrl;
      link.setAttribute('class', 'phone-link');
      link.click();
    }
  },

  getCallTypeIcon: (type: CallHistory['type']): string => {
    switch (type) {
      case 'incoming':
        return '📞';
      case 'outgoing':
        return '📱';
      case 'missed':
        return '❌';
      default:
        return '📞';
    }
  },

  getCallTypeColor: (type: CallHistory['type']): string => {
    switch (type) {
      case 'incoming':
        return 'text-green-600';
      case 'outgoing':
        return 'text-blue-600';
      case 'missed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  },
};
