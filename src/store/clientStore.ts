import { API_BASE_URL } from '../config/api.js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ClientConfiguration, LeadStatus, TaskStatus, CustomField, CustomerStatus, PaymentStatus } from '../types/client';
import toast from 'react-hot-toast';

interface ClientStore {
  clients: ClientConfiguration[];
  currentClient: ClientConfiguration | null;
  isLoading: boolean;
  error: string | null;
  
  // API functions
  fetchClients: () => Promise<void>;
  addClient: (client: Omit<ClientConfiguration, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<ClientConfiguration>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  setCurrentClient: (clientId: string) => void;
  getClientById: (id: string) => ClientConfiguration | null;
  getClientStatuses: (clientId: string) => LeadStatus[];
  getClientTaskStatuses: (clientId: string) => TaskStatus[];
  getClientCustomerStatuses: (clientId: string) => CustomerStatus[];
  getClientPaymentStatuses: (clientId: string) => PaymentStatus[];
  getClientCustomFields: (clientId: string) => CustomField[];
  updateClientStatuses: (clientId: string, type: 'lead' | 'task' | 'customer' | 'payment', statuses: any[]) => void;
  addCustomStatus: (clientId: string, type: 'lead' | 'task' | 'customer' | 'payment', status: any) => void;
  removeCustomStatus: (clientId: string, type: 'lead' | 'task' | 'customer' | 'payment', statusId: string) => void;
  clearClients: () => void;
}

// Default comprehensive client configuration
export const createDefaultClientConfig = (): Omit<ClientConfiguration, 'id' | 'name' | 'createdAt' | 'updatedAt'> => ({
  logo: '',
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  leadStatuses: [
    { id: '1', name: 'חדש', color: '#3b82f6', order: 1, isDefault: true, isFinal: false, allowedTransitions: ['2', '4', '5'] },
    { id: '2', name: 'בטיפול', color: '#f59e0b', order: 2, isDefault: false, isFinal: false, allowedTransitions: ['3', '5', '6'] },
    { id: '3', name: 'נשלחה הצעת מחיר', color: '#8b5cf6', order: 3, isDefault: false, isFinal: false, allowedTransitions: ['7', '8', '9'] },
    { id: '4', name: 'אין מענה', color: '#ef4444', order: 4, isDefault: false, isFinal: false, allowedTransitions: ['5', '10'] },
    { id: '5', name: 'אין מענה 2', color: '#dc2626', order: 5, isDefault: false, isFinal: false, allowedTransitions: ['10', '11'] },
    { id: '6', name: 'רוצה לחשוב', color: '#6b7280', order: 6, isDefault: false, isFinal: false, allowedTransitions: ['3', '9'] },
    { id: '7', name: 'ממתין לחתימה', color: '#10b981', order: 7, isDefault: false, isFinal: false, allowedTransitions: ['8', '9'] },
    { id: '8', name: 'עסקה נסגרה', color: '#059669', order: 8, isDefault: false, isFinal: true },
    { id: '9', name: 'לא מעוניין', color: '#6b7280', order: 9, isDefault: false, isFinal: true },
    { id: '10', name: 'הסרה מהמאגר', color: '#374151', order: 10, isDefault: false, isFinal: true },
    { id: '11', name: 'מספר שגוי', color: '#9ca3af', order: 11, isDefault: false, isFinal: true },
    { id: '12', name: 'לקוח קיים', color: '#10b981', order: 12, isDefault: false, isFinal: true }
  ],
  taskStatuses: [
    { id: '1', name: 'ממתין', color: '#6b7280', order: 1, isDefault: true, isFinal: false },
    { id: '2', name: 'בביצוע', color: '#f59e0b', order: 2, isDefault: false, isFinal: false },
    { id: '3', name: 'הושלם', color: '#10b981', order: 3, isDefault: false, isFinal: true },
    { id: '4', name: 'בוטל', color: '#ef4444', order: 4, isDefault: false, isFinal: true }
  ],
  customerStatuses: [
    { id: '1', name: 'פעיל', color: '#10b981', order: 1, isDefault: true, icon: '✅' },
    { id: '2', name: 'ממתין להתחלה', color: '#f59e0b', order: 2, isDefault: false, icon: '⏳' },
    { id: '3', name: 'לקוח VIP', color: '#8b5cf6', order: 3, isDefault: false, icon: '⭐' },
    { id: '4', name: 'מושעה', color: '#ef4444', order: 4, isDefault: false, icon: '⏸️' },
    { id: '5', name: 'לא פעיל', color: '#6b7280', order: 5, isDefault: false, icon: '❌' }
  ],
  paymentStatuses: [
    { id: '1', name: 'ממתין לתשלום', color: '#f59e0b', order: 1, isDefault: true, icon: '⏳', requiresAction: true },
    { id: '2', name: 'שולם', color: '#10b981', order: 2, isDefault: false, icon: '✅' },
    { id: '3', name: 'תשלום חלקי', color: '#8b5cf6', order: 3, isDefault: false, icon: '📊', requiresAction: true },
    { id: '4', name: 'בוטל', color: '#ef4444', order: 4, isDefault: false, icon: '❌' },
    { id: '5', name: 'החזר', color: '#dc2626', order: 5, isDefault: false, icon: '↩️' },
    { id: '6', name: 'חוב', color: '#b91c1c', order: 6, isDefault: false, icon: '⚠️', requiresAction: true }
  ],
  leadSources: ['פייסבוק', 'גוגל', 'המלצות', 'אתר', 'טלפון', 'אחר', 'LinkedIn', 'Instagram', 'TikTok', 'יריד', 'כנס'],
  customFields: [],
  permissions: [],
  branding: {
    companyName: 'חברה חדשה',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    accentColor: '#10b981'
  },
  features: {
    enableTasks: true,
    enableReports: true,
    enableCalendar: true,
    enableCustomers: true,
    enableAI: true,
    enableNotifications: true,
    enableExport: true,
    enableCustomFields: true,
    enableAdvancedFilters: true,
    enableBulkActions: true
  },
  settings: {
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    currency: 'ILS',
    language: 'he',
    timezone: 'Asia/Jerusalem',
    defaultLeadStatus: '1',
    defaultCustomerStatus: '1',
    defaultPaymentStatus: '1',
    autoAssignLeads: false,
    requireCallbackDate: false,
    enableLeadScoring: true
  },
  workflows: {
    leadToCustomerStatuses: ['8'], // Only 'עסקה נסגרה' by default
    autoStatusChanges: [],
    notifications: [],
    messageTemplates: [
      {
        id: '1',
        type: 'whatsapp',
        name: 'no-answer',
        title: 'אין מענה',
        message: 'שלום {name},\nניסינו ליצור איתך קשר אך לא הצלחנו להשיגך.\nנשמח לשוחח ולספק את כל המידע הרלוונטי.\nמוזמן לחזור אלינו בשעות הנוחות לך או להשיב להודעה זו.',
        icon: '📞',
        isDefault: true,
        variables: ['name', 'phone', 'company']
      },
      {
        id: '2',
        type: 'whatsapp',
        name: 'no-answer-2',
        title: 'אין מענה 2',
        message: 'שלום {name},\nזו פנייה נוספת לאחר שניסינו ליצור איתך קשר בעבר.\nנשמח לדעת אם עדיין רלוונטי עבורך שנמשיך בתהליך.\nאם כן – נוכל לקבוע זמן שנוח לך לשיחה קצרה.',
        icon: '📞',
        isDefault: true,
        variables: ['name', 'phone', 'company']
      },
      {
        id: '3',
        type: 'whatsapp',
        name: 'new',
        title: 'חדש',
        message: 'שלום {name},\nתודה שפנית אלינו! שמחנו לקבל את פנייתך ונשמח לעמוד לשירותך.\nנציג מצוות המכירות שלנו יחזור אליך בהקדם עם כל המידע הרלוונטי.\nבינתיים, אם יש לך שאלות – אנחנו כאן בשבילך.',
        icon: '✅',
        isDefault: true,
        variables: ['name', 'phone', 'company']
      },
      {
        id: '4',
        type: 'email',
        name: 'no-answer',
        title: 'אין מענה',
        subject: 'ניסינו ליצור איתך קשר',
        message: 'שלום {name},\nניסינו ליצור איתך קשר אך לא הצלחנו להשיגך.\nנשמח לשוחח ולספק את כל המידע הרלוונטי.\nמוזמן לחזור אלינו בשעות הנוחות לך או להשיב להודעה זו.',
        icon: '📞',
        isDefault: true,
        variables: ['name', 'email', 'company']
      },
      {
        id: '5',
        type: 'email',
        name: 'price-sent',
        title: 'נשלחה הצעת מחיר',
        subject: 'הצעת מחיר עבורך',
        message: 'שלום {name},\nשלחנו אליך הצעת מחיר מסודרת בהתאם לשיחתנו.\nנשמח לדעת אם קיבלת את ההצעה ואם יש שאלות או הבהרות שנוכל לעזור בהן.\nאנחנו זמינים עבורך בכל שלב.',
        icon: '📤',
        isDefault: true,
        variables: ['name', 'email', 'company']
      }
    ]
  },
  isActive: true
});

export const useClientStore = create<ClientStore>()(
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
            console.warn('No authentication tokens found, skipping client fetch');
            set({ isLoading: false, error: null });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/clients`, {
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
          
          // Transform server data to match our ClientConfiguration interface
          const clients = data.clients?.map((client: any) => ({
            id: client.id.toString(),
            name: client.name,
            ...createDefaultClientConfig(),
            ...client.configuration,
            createdAt: client.created_at,
            updatedAt: client.updated_at,
            isActive: client.is_active
          })) || [];

          set({ clients, isLoading: false });

          // Set first client as current if none is set
          if (clients.length > 0 && !get().currentClient) {
            get().setCurrentClient(clients[0].id);
          }
        } catch (error) {
          console.error('Error fetching clients:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה בטעינת לקוחות המערכת',
            isLoading: false 
          });
          toast.error('שגיאה בטעינת לקוחות המערכת');
        }
      },

      addClient: async (clientData) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/clients`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              name: clientData.name,
              configuration: {
                ...createDefaultClientConfig(),
                ...clientData
              }
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה ביצירת הלקוח');
          }

          const newClientData = await response.json();
          
          // Add the new client directly to the store instead of refetching all clients
          const newClient = {
            id: newClientData.client.id.toString(),
            name: newClientData.client.name,
            ...createDefaultClientConfig(),
            ...newClientData.client.configuration,
            createdAt: newClientData.client.created_at,
            updatedAt: newClientData.client.updated_at,
            isActive: newClientData.client.is_active
          };

          // Update the store with the new client
          set(state => ({
            clients: [...state.clients, newClient]
          }));

          toast.success('הלקוח נוצר בהצלחה');
        } catch (error) {
          console.error('Error adding client:', error);
          toast.error('אירעה שגיאה ביצירת הלקוח');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateClient: async (id, updates) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              configuration: updates
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בעדכון הלקוח');
          }

          // Refresh clients list
          await get().fetchClients();

          toast.success('הגדרות הלקוח עודכנו בהצלחה');
        } catch (error) {
          console.error('Error updating client:', error);
          toast.error('אירעה שגיאה בעדכון הלקוח');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteClient: async (id) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה במחיקת הלקוח');
          }

          // Refresh clients list
          await get().fetchClients();

          toast.success('הלקוח נמחק בהצלחה');
        } catch (error) {
          console.error('Error deleting client:', error);
          toast.error('אירעה שגיאה במחיקת הלקוח');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      setCurrentClient: (clientId) => {
        const client = get().clients.find(c => c.id === clientId);
        if (client) {
          set({ currentClient: client });
          localStorage.setItem('currentClientId', clientId);
          
          // Update user status when client is activated
          import('./userStore').then(({ useUserStore }) => {
            const userStore = useUserStore.getState();
            const clientUsers = userStore.users.filter(user => user.clientId === clientId);
            
            clientUsers.forEach(user => {
              if (user.status === 'inactive') {
                userStore.updateUser(user.id, { status: 'active' } as any);
              }
            });
            
            if (clientUsers.length > 0) {
              console.log(`הופעלו ${clientUsers.length} משתמשים עבור הלקוח ${client.name}`);
            }
          }).catch(error => {
            console.error('Error updating user statuses:', error);
          });
        }
      },

      getClientById: (id) => {
        return get().clients.find(client => client.id === id) || null;
      },

      getClientStatuses: (clientId) => {
        const client = get().getClientById(clientId);
        return client?.leadStatuses || createDefaultClientConfig().leadStatuses;
      },

      getClientTaskStatuses: (clientId) => {
        const client = get().getClientById(clientId);
        return client?.taskStatuses || createDefaultClientConfig().taskStatuses;
      },

      getClientCustomerStatuses: (clientId) => {
        const client = get().getClientById(clientId);
        return client?.customerStatuses || createDefaultClientConfig().customerStatuses;
      },

      getClientPaymentStatuses: (clientId) => {
        const client = get().getClientById(clientId);
        return client?.paymentStatuses || createDefaultClientConfig().paymentStatuses;
      },

      getClientCustomFields: (clientId) => {
        const client = get().getClientById(clientId);
        return client?.customFields || [];
      },

      updateClientStatuses: (clientId, type, statuses) => {
        const client = get().getClientById(clientId);
        if (!client) return;

        const updates: Partial<ClientConfiguration> = {};
        
        switch (type) {
          case 'lead':
            updates.leadStatuses = statuses;
            break;
          case 'task':
            updates.taskStatuses = statuses;
            break;
          case 'customer':
            updates.customerStatuses = statuses;
            break;
          case 'payment':
            updates.paymentStatuses = statuses;
            break;
        }

        get().updateClient(clientId, updates);
      },

      addCustomStatus: (clientId, type, status) => {
        const client = get().getClientById(clientId);
        if (!client) return;

        const newStatus = {
          ...status,
          id: crypto.randomUUID(),
          order: (client[`${type}Statuses` as keyof ClientConfiguration] as any[])?.length + 1 || 1
        };

        const updates: Partial<ClientConfiguration> = {};
        
        switch (type) {
          case 'lead':
            updates.leadStatuses = [...(client.leadStatuses || []), newStatus];
            break;
          case 'task':
            updates.taskStatuses = [...(client.taskStatuses || []), newStatus];
            break;
          case 'customer':
            updates.customerStatuses = [...(client.customerStatuses || []), newStatus];
            break;
          case 'payment':
            updates.paymentStatuses = [...(client.paymentStatuses || []), newStatus];
            break;
        }

        get().updateClient(clientId, updates);
      },

      removeCustomStatus: (clientId, type, statusId) => {
        const client = get().getClientById(clientId);
        if (!client) return;

        const updates: Partial<ClientConfiguration> = {};
        
        switch (type) {
          case 'lead':
            updates.leadStatuses = client.leadStatuses?.filter(s => s.id !== statusId);
            break;
          case 'task':
            updates.taskStatuses = client.taskStatuses?.filter(s => s.id !== statusId);
            break;
          case 'customer':
            updates.customerStatuses = client.customerStatuses?.filter(s => s.id !== statusId);
            break;
          case 'payment':
            updates.paymentStatuses = client.paymentStatuses?.filter(s => s.id !== statusId);
            break;
        }

        get().updateClient(clientId, updates);
      },

      clearClients: () => {
        set({ clients: [], currentClient: null, error: null });
      }
    }),
    {
      name: 'client-storage',
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Initialize current client from localStorage
          const currentClientId = localStorage.getItem('currentClientId');
          const currentClient = persistedState.clients?.find((c: any) => c.id === currentClientId) || 
                               persistedState.clients?.[0] || null;
          
          return {
            ...persistedState,
            currentClient,
            clients: persistedState.clients?.map((client: any) => ({
              ...createDefaultClientConfig(),
              ...client,
              customerStatuses: client.customerStatuses || createDefaultClientConfig().customerStatuses,
              paymentStatuses: client.paymentStatuses || createDefaultClientConfig().paymentStatuses,
              workflows: client.workflows || createDefaultClientConfig().workflows
            })) || []
          };
        }
        return persistedState;
      }
    }
  )
);

// Initialize current client on store creation
const initializeCurrentClient = async () => {
  const store = useClientStore.getState();
  
  // First fetch clients from server
  if (store.clients.length === 0) {
    try {
      await store.fetchClients();
    } catch (error) {
      console.error('Failed to fetch clients during initialization:', error);
      return;
    }
  }
  
  const currentClientId = localStorage.getItem('currentClientId');
  if (currentClientId) {
    const client = store.clients.find(c => c.id === currentClientId);
    if (client) {
      useClientStore.setState({ currentClient: client });
    }
  } else {
    // Set first client as current if none is set
    if (store.clients.length > 0 && !store.currentClient) {
      useClientStore.setState({ currentClient: store.clients[0] });
      localStorage.setItem('currentClientId', store.clients[0].id);
    }
  }
};

// Initialize on module load - but only if we have authentication
setTimeout(() => {
  const sessionToken = localStorage.getItem('session_token');
  const accessToken = localStorage.getItem('access_token');
  if (sessionToken && accessToken) {
    initializeCurrentClient();
  }
}, 500);
