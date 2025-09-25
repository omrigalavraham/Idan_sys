import { API_BASE_URL } from '../config/api.js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'ממתין' | 'בביצוע' | 'הושלם';
  priority: 'נמוך' | 'בינוני' | 'גבוה';
  dueDate: string; // Will contain both date and time in ISO format
  assignedTo: string;
  leadId?: string;
  customerId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notified: boolean;
}

export interface TaskFormData {
  title: string;
  description?: string;
  status?: 'ממתין' | 'בביצוע' | 'הושלם';
  priority?: 'נמוך' | 'בינוני' | 'גבוה';
  dueDate: string; // Will contain both date and time in ISO format
  assignedTo: string;
  leadId?: string;
  customerId?: string;
}

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  
  // API functions
  fetchTasks: () => Promise<void>;
  addTask: (taskData: TaskFormData) => Promise<void>;
  updateTask: (id: string, updates: Partial<TaskFormData>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTasksByStatus: (status: string) => Task[];
  getTasksByAssignedTo: (assignedTo: string) => Task[];
  getTasksByLead: (leadId: string) => Task[];
  getTasksByCustomer: (customerId: string) => Task[];
  clearTasks: () => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      isLoading: false,
      error: null,

      fetchTasks: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.warn('No authentication tokens found, skipping tasks fetch');
            set({ isLoading: false, error: null });
            return;
          }

          
          const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            console.error('Error fetching tasks:', response.status, response.statusText);
            throw new Error('שגיאה בטעינת המשימות');
          }

          const data = await response.json();
          
          // Transform server data to match our Task interface
          const tasks = data.tasks?.map((task: any) => ({
            id: task.id.toString(),
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.due_date ? task.due_date : '',
            assignedTo: task.assigned_to?.toString(),
            leadId: task.lead_id?.toString(),
            customerId: task.customer_id?.toString(),
            createdBy: task.created_by?.toString(),
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            notified: task.notified || false
          })) || [];

          set({ tasks, isLoading: false });
        } catch (error) {
          console.error('Error fetching tasks:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה בטעינת המשימות',
            isLoading: false 
          });
          toast.error('שגיאה בטעינת המשימות');
        }
      },

      addTask: async (taskData: TaskFormData) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          // Transform data to match server expectations
          const serverData = {
            title: taskData.title,
            description: taskData.description,
            status: taskData.status || 'ממתין',
            priority: taskData.priority || 'בינוני',
            due_date: taskData.dueDate,
            assigned_to: taskData.assignedTo ? parseInt(taskData.assignedTo) : null,
            lead_id: taskData.leadId ? parseInt(taskData.leadId) : null,
            customer_id: taskData.customerId ? parseInt(taskData.customerId) : null
          };


          const response = await fetch(`${API_BASE_URL}/tasks`, {
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
            console.error('Error creating task:', errorData);
            throw new Error(errorData.error || 'שגיאה ביצירת המשימה');
          }

          // Refresh tasks list
          await get().fetchTasks();
          
          toast.success('המשימה נוצרה בהצלחה');
        } catch (error) {
          console.error('Error creating task:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת המשימה');
          throw error;
        }
      },

      updateTask: async (id: string, updates: Partial<TaskFormData>) => {
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
          if (updates.status !== undefined) serverData.status = updates.status;
          if (updates.priority !== undefined) serverData.priority = updates.priority;
          if (updates.dueDate !== undefined) serverData.due_date = updates.dueDate;
          if (updates.assignedTo !== undefined) serverData.assigned_to = updates.assignedTo ? parseInt(updates.assignedTo) : null;
          if (updates.leadId !== undefined) serverData.lead_id = updates.leadId ? parseInt(updates.leadId) : null;
          if (updates.customerId !== undefined) serverData.customer_id = updates.customerId ? parseInt(updates.customerId) : null;


          const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
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
            console.error('Error updating task:', errorData);
            throw new Error(errorData.error || 'שגיאה בעדכון המשימה');
          }

          // Refresh tasks list
          await get().fetchTasks();
          
          toast.success('המשימה עודכנה בהצלחה');
        } catch (error) {
          console.error('Error updating task:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון המשימה');
          throw error;
        }
      },

      deleteTask: async (id: string) => {
        try {
          set({ isLoading: true });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }


          const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });


          if (!response.ok) {
            const errorData = await response.json();
            console.error('Error deleting task:', errorData);
            throw new Error(errorData.error || 'שגיאה במחיקת המשימה');
          }

          // Remove from local state
          set(state => ({
            tasks: state.tasks.filter(task => task.id !== id),
            isLoading: false
          }));
          
          toast.success('המשימה נמחקה בהצלחה');
        } catch (error) {
          console.error('Error deleting task:', error);
          set({ isLoading: false });
          toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת המשימה');
          throw error;
        }
      },

      getTasksByStatus: (status: string) => {
        return get().tasks.filter(task => task.status === status);
      },

      getTasksByAssignedTo: (assignedTo: string) => {
        return get().tasks.filter(task => task.assignedTo === assignedTo);
      },

      getTasksByLead: (leadId: string) => {
        return get().tasks.filter(task => task.leadId === leadId);
      },

      getTasksByCustomer: (customerId: string) => {
        return get().tasks.filter(task => task.customerId === customerId);
      },

      clearTasks: () => {
        set({ tasks: [], error: null });
      }
    }),
    {
      name: 'task-storage',
      version: 1,
      partialize: (state) => ({
        // Only persist tasks, not loading states
        tasks: state.tasks
      })
    }
  )
);
