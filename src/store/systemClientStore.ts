import { API_BASE_URL } from '../config/api.js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { useAuthStore } from './authStore';

export interface LeadStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isFinal: boolean;
}

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface CustomerStatus {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface PaymentStatus {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface ClientFeature {
  id: number;
  client_id: number;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRule {
  id: number;
  client_id: number;
  rule_type: string;
  source_status?: string;
  target_status?: string;
  conditions: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: number;
  client_id: number;
  template_name: string;
  template_type: 'whatsapp' | 'email' | 'sms';
  subject?: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemClient {
  id: string;
  name: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  isActive: boolean;
  leadStatuses?: LeadStatus[];
  taskStatuses?: TaskStatus[];
  customerStatuses?: CustomerStatus[];
  paymentStatuses?: PaymentStatus[];
  features?: Record<string, any>;
  workflowSettings?: Record<string, any>;
  messageTemplates?: MessageTemplate[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemClientFormData {
  name: string;
  companyName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  leadStatuses?: LeadStatus[];
  customerStatuses?: CustomerStatus[];
  paymentStatuses?: PaymentStatus[];
  features?: Record<string, any>;
  messageTemplates?: any[];
}

interface SystemClientStore {
  clients: SystemClient[];
  currentClient: SystemClient | null;
  isLoading: boolean;
  error: string | null;
  
  // API functions
  fetchClients: () => Promise<void>;
  addClient: (clientData: SystemClientFormData) => Promise<void>;
  updateClient: (id: string, updates: Partial<SystemClientFormData>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  activateClient: (id: string) => Promise<void>;
  deactivateClient: (id: string) => Promise<void>;
  setCurrentClient: (clientId: string) => void;
  getClientByName: (name: string) => SystemClient | null;
  getCurrentClientConfig: () => {
    leadStatuses: LeadStatus[];
    customerStatuses: CustomerStatus[];
    paymentStatuses: PaymentStatus[];
    features: Record<string, any>;
    messageTemplates: any[];
  } | null;
  updateClientConfiguration: (clientId: string, config: {
    leadStatuses?: LeadStatus[];
    customerStatuses?: CustomerStatus[];
    paymentStatuses?: PaymentStatus[];
    features?: Record<string, any>;
    messageTemplates?: any[];
  }) => Promise<void>;
  
  // כל המידע נשמר בטבלת system_clients עצמה בשדות JSONB
  // אין צורך בפונקציות נפרדות
  
  clearClients: () => void;
}

export const useSystemClientStore = create<SystemClientStore>()(
  persist(
    (set, get) => ({
      clients: [],
      currentClient: null,
      isLoading: false,
      error: null,

      fetchClients: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.warn('No authentication tokens found, skipping system clients fetch');
            set({ isLoading: false, error: null });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/system-clients`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error('שגיאה בטעינת לקוחות המערכת');
          }

          const data = await response.json();
          
          console.log('Raw server data:', data);
          console.log('Clients from server:', data.clients);
          
          // Transform server data to match our SystemClient interface
          const clients = data.clients?.map((client: any) => ({
            id: client.id.toString(),
            name: client.name || '',
            companyName: client.company_name || '',
            primaryColor: client.primary_color || '#3b82f6',
            secondaryColor: client.secondary_color || '#1e40af',
            logoUrl: client.logo_url || '',
            isActive: client.is_active !== undefined ? client.is_active : true,
            leadStatuses: client.lead_statuses || [],
            taskStatuses: client.task_statuses || [],
            customerStatuses: client.customer_statuses || [],
            paymentStatuses: client.payment_statuses || [],
            features: client.features || {},
            workflowSettings: client.workflow_settings || {},
            messageTemplates: client.message_templates || [],
            createdAt: client.created_at || new Date().toISOString(),
            updatedAt: client.updated_at || new Date().toISOString()
          })) || [];

          console.log('Transformed clients:', clients);

          set({ clients, isLoading: false });
        } catch (error) {
          console.error('Error fetching system clients:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה בטעינת לקוחות המערכת',
            isLoading: false 
          });
          toast.error('שגיאה בטעינת לקוחות המערכת');
        }
      },

      addClient: async (clientData: SystemClientFormData) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          // Transform data to match server expectations
          const serverData = {
            name: clientData.name,
            company_name: clientData.companyName,
            primary_color: clientData.primaryColor || '#3b82f6',
            secondary_color: clientData.secondaryColor || '#1e40af',
            logo_url: clientData.logoUrl,
            lead_statuses: clientData.leadStatuses || [],
            customer_statuses: clientData.customerStatuses || [],
            payment_statuses: clientData.paymentStatuses || [],
            features: clientData.features || {},
            message_templates: clientData.messageTemplates || []
          };

          const response = await fetch(`${API_BASE_URL}/system-clients`, {
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
            throw new Error(errorData.error || 'שגיאה ביצירת לקוח המערכת');
          }

          const newClientData = await response.json();
          
          // Add the new client directly to the store instead of refetching all clients
          const newClient: SystemClient = {
            id: newClientData.client.id.toString(),
            name: newClientData.client.name || '',
            companyName: newClientData.client.company_name || '',
            primaryColor: newClientData.client.primary_color || '#3b82f6',
            secondaryColor: newClientData.client.secondary_color || '#1e40af',
            logoUrl: newClientData.client.logo_url || '',
            isActive: newClientData.client.is_active !== undefined ? newClientData.client.is_active : true,
            leadStatuses: newClientData.client.lead_statuses || [],
            taskStatuses: newClientData.client.task_statuses || [],
            customerStatuses: newClientData.client.customer_statuses || [],
            paymentStatuses: newClientData.client.payment_statuses || [],
            features: newClientData.client.features || {},
            workflowSettings: newClientData.client.workflow_settings || {},
            messageTemplates: newClientData.client.message_templates || [],
            createdAt: newClientData.client.created_at || new Date().toISOString(),
            updatedAt: newClientData.client.updated_at || new Date().toISOString()
          };

          // Update the store with the new client
          set(state => ({
            clients: [...state.clients, newClient]
          }));
          
          // Refresh client configuration for current user if this is their client
          try {
            const authStore = useAuthStore.getState();
            await authStore.refreshClientConfig();
            
            // Trigger a local storage event to notify other components
            localStorage.setItem('client-config-updated', Date.now().toString());
            localStorage.removeItem('client-config-updated');
          } catch (error) {
            console.error('Error refreshing client config after creation:', error);
          }
          
          toast.success('לקוח המערכת נוצר בהצלחה');
        } catch (error) {
          console.error('Error creating system client:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת לקוח המערכת');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateClient: async (id: string, updates: Partial<SystemClientFormData>) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          // Transform data to match server expectations
          const serverData: any = {};
          if (updates.name !== undefined) serverData.name = updates.name;
          if (updates.companyName !== undefined) serverData.company_name = updates.companyName;
          if (updates.primaryColor !== undefined) serverData.primary_color = updates.primaryColor;
          if (updates.secondaryColor !== undefined) serverData.secondary_color = updates.secondaryColor;
          if (updates.logoUrl !== undefined) serverData.logo_url = updates.logoUrl;
          if (updates.leadStatuses !== undefined) serverData.lead_statuses = updates.leadStatuses;
          if (updates.customerStatuses !== undefined) serverData.customer_statuses = updates.customerStatuses;
          if (updates.paymentStatuses !== undefined) serverData.payment_statuses = updates.paymentStatuses;
          if (updates.features !== undefined) serverData.features = updates.features;
          if (updates.messageTemplates !== undefined) serverData.message_templates = updates.messageTemplates;

          console.log('Sending update data to server:', serverData);

          const response = await fetch(`${API_BASE_URL}/system-clients/${id}`, {
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
            throw new Error(errorData.error || 'שגיאה בעדכון לקוח המערכת');
          }

          // Refresh clients list
          await get().fetchClients();
          
          // Update current client if it's the one being updated
          const currentClient = get().currentClient;
          if (currentClient && currentClient.id === id) {
            const updatedClient = get().clients.find(c => c.id === id);
            if (updatedClient) {
              set({ currentClient: updatedClient });
            }
          }
          
          // Refresh client configuration for current user if this is their client
          try {
            const authStore = useAuthStore.getState();
            await authStore.refreshClientConfig();
            
            // Trigger a local storage event to notify other components
            localStorage.setItem('client-config-updated', Date.now().toString());
            localStorage.removeItem('client-config-updated');
          } catch (error) {
            console.error('Error refreshing client config:', error);
          }
          
          toast.success('לקוח המערכת עודכן בהצלחה');
        } catch (error) {
          console.error('Error updating system client:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון לקוח המערכת');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteClient: async (id: string) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/system-clients/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה במחיקת לקוח המערכת');
          }

          // Refresh clients list to reflect the soft delete
          await get().fetchClients();
          
          // Clear current client if it was the one being deleted
          const currentClient = get().currentClient;
          if (currentClient && currentClient.id === id) {
            set({ currentClient: null });
          }
          
          toast.success('לקוח המערכת נמחק בהצלחה');
        } catch (error) {
          console.error('Error deleting system client:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת לקוח המערכת');
          throw error;
        }
      },

      activateClient: async (id: string) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/system-clients/${id}/activate`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בהפעלת לקוח המערכת');
          }

          // Refresh clients list
          await get().fetchClients();
          
          toast.success('לקוח המערכת הופעל בהצלחה');
        } catch (error) {
          console.error('Error activating system client:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה בהפעלת לקוח המערכת');
          throw error;
        }
      },

      deactivateClient: async (id: string) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/system-clients/${id}/deactivate`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בהשבתת לקוח המערכת');
          }

          // Refresh clients list
          await get().fetchClients();
          
          toast.success('לקוח המערכת הושבת בהצלחה');
        } catch (error) {
          console.error('Error deactivating system client:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה בהשבתת לקוח המערכת');
          throw error;
        }
      },

      setCurrentClient: (clientId: string) => {
        const client = get().clients.find(c => c.id === clientId);
        if (client) {
          set({ currentClient: client });
          // Store in localStorage for persistence across sessions
          localStorage.setItem('current_client_id', clientId);
          toast.success(`עבר ללקוח: ${client.companyName}`);
        }
      },

      getClientByName: (name: string) => {
        console.log('getClientByName called with name:', name);
        console.log('Available clients:', get().clients);
        console.log('Client names:', get().clients.map(c => c.name));
        const found = get().clients.find(c => c.name === name) || null;
        console.log('Found client:', found);
        return found;
      },

      getCurrentClientConfig: () => {
        const currentClient = get().currentClient;
        if (!currentClient) return null;
        
        return {
          leadStatuses: currentClient.leadStatuses || [],
          customerStatuses: currentClient.customerStatuses || [],
          paymentStatuses: currentClient.paymentStatuses || [],
          features: currentClient.features || {},
          messageTemplates: currentClient.messageTemplates || []
        };
      },

      updateClientConfiguration: async (clientId: string, config: {
        leadStatuses?: LeadStatus[];
        customerStatuses?: CustomerStatus[];
        paymentStatuses?: PaymentStatus[];
        features?: Record<string, any>;
        messageTemplates?: any[];
      }) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/system-clients/${clientId}/config`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              lead_statuses: config.leadStatuses,
              customer_statuses: config.customerStatuses,
              payment_statuses: config.paymentStatuses,
              features: config.features,
              message_templates: config.messageTemplates
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בעדכון קונפיגורציית לקוח המערכת');
          }

          // Refresh clients list
          await get().fetchClients();
          
          // Update current client if it's the one being updated
          const currentClient = get().currentClient;
          if (currentClient && currentClient.id === clientId) {
            const updatedClient = get().clients.find(c => c.id === clientId);
            if (updatedClient) {
              set({ currentClient: updatedClient });
            }
          }
          
          toast.success('קונפיגורציית לקוח המערכת עודכנה בהצלחה');
        } catch (error) {
          console.error('Error updating system client configuration:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון קונפיגורציית לקוח המערכת');
          throw error;
        }
      },

      // כל המידע נשמר בטבלת system_clients עצמה בשדות JSONB
      // אין צורך בפונקציות נפרדות

      clearClients: () => {
        set({ clients: [], currentClient: null, error: null });
      }
    }),
    {
      name: 'system-client-storage',
      version: 1,
      partialize: (state) => ({
        // Persist clients and current client
        clients: state.clients,
        currentClient: state.currentClient
      }),
      onRehydrateStorage: () => (state) => {
        // Restore current client from localStorage if available
        const savedClientId = localStorage.getItem('current_client_id');
        if (savedClientId && state) {
          const client = state.clients.find(c => c.id === savedClientId);
          if (client) {
            state.currentClient = client;
          }
        }
      }
    }
  )
);
