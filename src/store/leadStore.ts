import { API_BASE_URL } from '../config/api.js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Lead, LeadFormData } from '../types/lead';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface LeadStore {
  leads: Lead[];
  selectedLead: Lead | null;
  isLoading: boolean;
  error: string | null;
  totalLeads: number;
  currentPage: number;
  pageSize: number;
  availableStatuses: string[];
  selectedAgentId: string | null;
  isImporting: boolean; // Flag to prevent duplicate notifications during bulk import
  isBulkDeleting: boolean; // Flag to prevent individual notifications during bulk delete
  
  // API functions
  fetchLeads: (page?: number, pageSize?: number, assignedTo?: string) => Promise<void>;
  addLead: (leadData: LeadFormData, userId: string) => Promise<void>;
  updateLead: (id: string, updates: Partial<LeadFormData>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  bulkDeleteLeads: (ids: string[]) => Promise<{ deletedCount: number; failedCount: number }>;
  updateLeadStatus: (id: string, status: string) => Promise<void>;
  bulkAssignLeads: (leadIds: string[], assignedTo: string) => Promise<void>;
  setSelectedLead: (lead: Lead | null) => void;
  getLeadsByUser: (userId: string) => Lead[];
  getLeadsByClient: (clientId: string) => Lead[];
  searchLeads: (query: string) => Lead[];
  importFromExcel: (file: File, userId: string) => Promise<void>;
  clearLeads: () => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  updateAvailableStatuses: () => void;
  setSelectedAgentId: (agentId: string | null) => void;
}

export const useLeadStore = create<LeadStore>()(
  persist(
    (set, get) => ({
      leads: [],
      selectedLead: null,
      isLoading: false,
      error: null,
      totalLeads: 0,
      currentPage: 1,
      pageSize: 50,
      availableStatuses: ['חדש', 'בטיפול', 'נשלחה הצעת מחיר', 'אין מענה', 'אין מענה 2', 'רוצה לחשוב', 'ממתין לחתימה', 'עסקה נסגרה', 'לא מעוניין', 'הסרה מהמאגר', 'מספר שגוי', 'לקוח קיים'],
      selectedAgentId: null,
      isImporting: false,
      isBulkDeleting: false,

      fetchLeads: async (page = 1, pageSize = 50, assignedTo?: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.warn('No authentication tokens found, skipping leads fetch');
            set({ isLoading: false, error: null });
            return;
          }

          const offset = (page - 1) * pageSize;
          let url = `${API_BASE_URL}/leads?limit=${pageSize}&offset=${offset}`;
          
          // Add assigned_to parameter if provided
          if (assignedTo) {
            url += `&assigned_to=${assignedTo}`;
          }
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error('שגיאה בטעינת הלידים');
          }

          const data = await response.json();
          
          // Transform server data to match our Lead interface
          const leads = data.leads?.map((lead: any) => ({
            id: lead.id.toString(),
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            status: lead.status,
            source: lead.source,
            notes: lead.notes,
            createdAt: lead.created_at,
            updatedAt: lead.updated_at,
            assignedTo: lead.assigned_to?.toString(),
            clientId: lead.client_id?.toString(),
            history: lead.history || [],
            company: lead.company,
            position: lead.position,
            budget: lead.budget,
            priority: lead.priority,
            tags: lead.tags || [],
            customFields: lead.custom_fields || {},
            callbackDate: lead.callback_date,
            callbackTime: lead.callback_time,
            lastContactDate: lead.last_contact_date,
            convertedAt: lead.converted_at,
            conversionValue: lead.conversion_value
          })) || [];

          set({ 
            leads, 
            totalLeads: data.total || leads.length,
            currentPage: page,
            pageSize: pageSize,
            isLoading: false 
          });
        } catch (error) {
          console.error('Error fetching leads:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה בטעינת הלידים',
            isLoading: false 
          });
          toast.error('שגיאה בטעינת הלידים');
        }
      },

      addLead: async (leadData: LeadFormData, userId: string) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/leads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              name: leadData.name,
              email: leadData.email || null,
              phone: leadData.phone,
              status: leadData.status,
              source: leadData.source || null,
              notes: leadData.notes || null,
              callback_date: leadData.callbackDate || null,
              callback_time: leadData.callbackTime || null,
              assigned_to: leadData.assigned_to || userId
            })
            
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה ביצירת הליד');
          }

          // Refresh leads list with current filters
          const state = get();
          // For admin users, if no specific agent is selected, show their own leads by default
          // For other users, use selectedAgentId or their own ID
          let agentToShow = state.selectedAgentId;
          if (!agentToShow) {
            const { user } = useAuthStore.getState();
            if (user?.role === 'admin') {
              // Admin should see their own leads by default unless they specifically selected "all leads"
              agentToShow = user.id;
            } else if (user?.role === 'manager') {
              agentToShow = user.id;
            }
          }
          await state.fetchLeads(state.currentPage, state.pageSize, agentToShow || undefined);
          
          // Only show success message if not during bulk import
          if (!state.isImporting) {
            toast.success('הליד נוצר בהצלחה');
          }
          set({ selectedLead: null });
        } catch (error) {
          console.error('Error adding lead:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת הליד');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateLead: async (id: string, updates: Partial<LeadFormData>) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              name: updates.name,
              email: updates.email,
              phone: updates.phone,
              status: updates.status,
              source: updates.source,
              notes: updates.notes,
              callback_date: updates.callbackDate,
              callback_time: updates.callbackTime,
              assigned_to: updates.assigned_to
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בעדכון הליד');
          }

          // Refresh leads list with current filters
          const state = get();
          // For admin users, if no specific agent is selected, show their own leads by default
          // For other users, use selectedAgentId or their own ID
          let agentToShow = state.selectedAgentId;
          if (!agentToShow) {
            const { user } = useAuthStore.getState();
            if (user?.role === 'admin') {
              // Admin should see their own leads by default unless they specifically selected "all leads"
              agentToShow = user.id;
            } else if (user?.role === 'manager') {
              agentToShow = user.id;
            }
          }
          await state.fetchLeads(state.currentPage, state.pageSize, agentToShow || undefined);
          
          toast.success('הליד עודכן בהצלחה');
          set({ selectedLead: null });
        } catch (error) {
          console.error('Error updating lead:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון הליד');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteLead: async (id: string) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה במחיקת הליד');
          }

          // Refresh leads list with current filters
          const state = get();
          // For admin users, if no specific agent is selected, show their own leads by default
          // For other users, use selectedAgentId or their own ID
          let agentToShow = state.selectedAgentId;
          if (!agentToShow) {
            const { user } = useAuthStore.getState();
            if (user?.role === 'admin') {
              // Admin should see their own leads by default unless they specifically selected "all leads"
              agentToShow = user.id;
            } else if (user?.role === 'manager') {
              agentToShow = user.id;
            }
          }
          await state.fetchLeads(state.currentPage, state.pageSize, agentToShow || undefined);
          
          // Only show success message if not during bulk delete
          if (!state.isBulkDeleting) {
            toast.success('הליד נמחק בהצלחה');
          }
          set({ selectedLead: null });
        } catch (error) {
          console.error('Error deleting lead:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת הליד');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      bulkDeleteLeads: async (ids: string[]) => {
        if (ids.length === 0) {
          return { deletedCount: 0, failedCount: 0 };
        }

        try {
          set({ isLoading: true, isBulkDeleting: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          let deletedCount = 0;
          let failedCount = 0;

          // Delete leads without showing individual toast messages
          for (const id of ids) {
            try {
              const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Session-Token': sessionToken,
                  'Authorization': `Bearer ${accessToken}`
                }
              });

              if (response.ok) {
                deletedCount++;
              } else {
                failedCount++;
              }
            } catch (error) {
              console.error(`Error deleting lead ${id}:`, error);
              failedCount++;
            }
          }

          // Refresh leads list with current filters
          const state = get();
          let agentToShow = state.selectedAgentId;
          if (!agentToShow) {
            const { user } = useAuthStore.getState();
            if (user?.role === 'admin') {
              agentToShow = user.id;
            } else if (user?.role === 'manager') {
              agentToShow = user.id;
            }
          }
          await state.fetchLeads(state.currentPage, state.pageSize, agentToShow || undefined);
          
          set({ selectedLead: null });
          
          return { deletedCount, failedCount };
        } catch (error) {
          console.error('Error in bulk delete:', error);
          throw error;
        } finally {
          set({ isLoading: false, isBulkDeleting: false });
        }
      },

      updateLeadStatus: async (id: string, status: string) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/leads/${id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ status })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בעדכון סטטוס הליד');
          }

          // Refresh leads list with current filters
          const state = get();
          // For admin users, if no specific agent is selected, show their own leads by default
          // For other users, use selectedAgentId or their own ID
          let agentToShow = state.selectedAgentId;
          if (!agentToShow) {
            const { user } = useAuthStore.getState();
            if (user?.role === 'admin') {
              // Admin should see their own leads by default unless they specifically selected "all leads"
              agentToShow = user.id;
            } else if (user?.role === 'manager') {
              agentToShow = user.id;
            }
          }
          await state.fetchLeads(state.currentPage, state.pageSize, agentToShow || undefined);
          
          toast.success('סטטוס הליד עודכן בהצלחה');
        } catch (error) {
          console.error('Error updating lead status:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון סטטוס הליד');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      bulkAssignLeads: async (leadIds: string[], assignedTo: string) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/leads/bulk-assign`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ 
              leadIds: leadIds.map(id => parseInt(id)),
              assignedTo: parseInt(assignedTo)
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בשיוך הלידים');
          }

          const result = await response.json();
          
          // Refresh leads list with current filters
          const state = get();
          // For admin users, if no specific agent is selected, show their own leads by default
          // For other users, use selectedAgentId or their own ID
          let agentToShow = state.selectedAgentId;
          if (!agentToShow) {
            const { user } = useAuthStore.getState();
            if (user?.role === 'admin') {
              // Admin should see their own leads by default unless they specifically selected "all leads"
              agentToShow = user.id;
            } else if (user?.role === 'manager') {
              agentToShow = user.id;
            }
          }
          await state.fetchLeads(state.currentPage, state.pageSize, agentToShow || undefined);
          
          if (result.successCount > 0) {
            toast.success(`שויכו בהצלחה ${result.successCount} לידים`);
          }
          
          if (result.errorCount > 0) {
            toast.error(`${result.errorCount} לידים לא שויכו`);
          }
        } catch (error) {
          console.error('Error in bulk assignment:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה בשיוך הלידים');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      importFromExcel: async (file: File, userId: string) => {
        try {
          set({ isLoading: true, isImporting: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const formData = new FormData();
          formData.append('file', file);
          formData.append('assigned_to', userId);

          const response = await fetch(`${API_BASE_URL}/leads/import/excel`, {
            method: 'POST',
            headers: {
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json();
            
            // Handle different types of errors with better messages
            if (errorData.errors && errorData.errors.length > 0) {
              const errorDetails = errorData.errors.slice(0, 3).join('\n');
              const totalErrors = errorData.errors.length;
              const moreErrors = totalErrors > 3 ? `\n(ועוד ${totalErrors - 3} שגיאות...)` : '';
              
              toast.error(
                `נמצאו שגיאות בקובץ:\n${errorDetails}${moreErrors}\n\n` +
                (errorData.detectedColumns ? 
                  `עמודות שזוהו: שם="${errorData.detectedColumns.name || 'לא זוהה'}", טלפון="${errorData.detectedColumns.phone || 'לא זוהה'}"` : 
                  '') +
                (errorData.suggestion ? `\n\nהצעה: ${errorData.suggestion}` : ''),
                { duration: 8000 }
              );
            } else {
              toast.error(errorData.error || 'שגיאה בייבוא הקובץ');
            }
            throw new Error(errorData.error || 'שגיאה בייבוא הקובץ');
          }

          const result = await response.json();
          
          // Show detailed success message
          let successMessage = `יובאו בהצלחה ${result.imported} לידים`;
          if (result.warnings && result.warnings.length > 0) {
            const warningCount = result.warnings.length;
            successMessage += `\n(עם ${warningCount} אזהרות - בדוק את הנתונים)`;
          }
          if (result.detectedColumns) {
            successMessage += `\nעמודות שזוהו: שם="${result.detectedColumns.name}", טלפון="${result.detectedColumns.phone}"`;
          }
          
          // Refresh leads list with current filters
          const state = get();
          // For admin users, if no specific agent is selected, show their own leads by default
          // For other users, use selectedAgentId or their own ID
          let agentToShow = state.selectedAgentId;
          if (!agentToShow) {
            const { user } = useAuthStore.getState();
            if (user?.role === 'admin') {
              // Admin should see their own leads by default unless they specifically selected "all leads"
              agentToShow = user.id;
            } else if (user?.role === 'manager') {
              agentToShow = user.id;
            }
          }
          await state.fetchLeads(state.currentPage, state.pageSize, agentToShow || undefined);
          
          toast.success(successMessage, { duration: 6000 });
        } catch (error) {
          console.error('Error importing leads:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה בייבוא הלידים');
          throw error;
        } finally {
          set({ isLoading: false, isImporting: false });
        }
      },

      setSelectedLead: (lead: Lead | null) => {
        set({ selectedLead: lead });
      },

      getLeadsByUser: (userId: string) => {
        return get().leads.filter(lead => lead.assignedTo === userId);
      },

      getLeadsByClient: (clientId: string) => {
        return get().leads.filter(lead => lead.clientId === clientId);
      },

      searchLeads: (query: string) => {
        const leads = get().leads;
        const lowercaseQuery = query.toLowerCase();
        
        return leads.filter(lead =>
          lead.name.toLowerCase().includes(lowercaseQuery) ||
          (lead.email && lead.email.toLowerCase().includes(lowercaseQuery)) ||
          lead.phone.includes(query) ||
          (lead.notes && lead.notes.toLowerCase().includes(lowercaseQuery))
        );
      },

      clearLeads: () => {
        set({ leads: [], selectedLead: null, error: null, totalLeads: 0, currentPage: 1 });
      },

      setCurrentPage: (page: number) => {
        set({ currentPage: page });
      },

      setPageSize: (size: number) => {
        set({ pageSize: size, currentPage: 1 }); // Reset to first page when changing page size
      },

      updateAvailableStatuses: () => {
        const authStore = useAuthStore.getState();
        const { user, clientConfig } = authStore;
        
        if (user?.role === 'admin') {
          // Admin sees all statuses - no restrictions
          set({ availableStatuses: ['חדש', 'בטיפול', 'נשלחה הצעת מחיר', 'אין מענה', 'אין מענה 2', 'רוצה לחשוב', 'ממתין לחתימה', 'עסקה נסגרה', 'לא מעוניין', 'הסרה מהמאגר', 'מספר שגוי', 'לקוח קיים'] });
        } else if (clientConfig?.lead_statuses && clientConfig.lead_statuses.length > 0) {
          // Use client-specific statuses
          const statuses = clientConfig.lead_statuses.map((status: any) => status.name);
          set({ availableStatuses: statuses });
        } else {
          // Fallback to default statuses
          set({ availableStatuses: ['חדש', 'בטיפול', 'נשלחה הצעת מחיר', 'אין מענה', 'אין מענה 2', 'רוצה לחשוב', 'ממתין לחתימה', 'עסקה נסגרה', 'לא מעוניין', 'הסרה מהמאגר', 'מספר שגוי', 'לקוח קיים'] });
        }
      },

      setSelectedAgentId: (agentId: string | null) => {
        set({ selectedAgentId: agentId });
      }
    }),
    {
      name: 'lead-storage',
      version: 2,
      partialize: (state) => ({
        // Only persist selected lead, not the full leads list
        selectedLead: state.selectedLead,
        isLoading: false,
        error: null,
        pageSize: state.pageSize,
        availableStatuses: state.availableStatuses,
        selectedAgentId: state.selectedAgentId
      })
    }
  )
);