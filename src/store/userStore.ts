import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE_URL } from '../config/api.js';
import { User, UserFormData } from '../types';
import toast from 'react-hot-toast';
import { useSyncStore } from './syncStore';

interface UserStore {
  users: User[];
  deletedUsers: User[];
  selectedUser: User | null;
  isLoading: boolean;
  error: string | null;
  
  // API functions
  fetchUsers: () => Promise<void>;
  fetchDeletedUsers: (managerId?: string) => Promise<void>;
  fetchManagers: () => Promise<void>;
  fetchAgentsByManager: () => Promise<void>;
  addUser: (userData: UserFormData, adminId: string) => Promise<void>;
  updateUser: (id: string, updates: Partial<UserFormData>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  restoreUser: (id: string) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  hasPermission: (userId: string, permission: string) => boolean;
  setSelectedUser: (user: User | null) => void;
  clearUsers: () => void;
}

// Agent permissions - נציג יכול לראות רק את עצמו
const agentPermissions = [
  'view_own_profile',
  'edit_own_profile',
  'view_own_leads',
  'create_leads',
  'edit_own_leads',
  'view_own_customers',
  'create_customers',
  'edit_own_customers',
  'view_calendar',
  'create_calendar',
  'edit_own_calendar',
  'view_own_reports'
];

// Manager permissions - מנהל יכול לנהל נציגים
const managerPermissions = [
  ...agentPermissions,
  'view_all_users',
  'create_agents',
  'edit_agents',
  'delete_agents',
  'view_all_leads',
  'edit_all_leads',
  'delete_leads',
  'view_all_customers',
  'edit_all_customers',
  'delete_customers',
  'view_all_reports',
  'create_reports',
  'edit_all_calendar',
  'delete_calendar',
  'manage_settings'
];

// Admin permissions - מנהל מערכת עם גישה מלאה
const adminPermissions = [
  'view_leads',
  'create_leads',
  'edit_leads',
  'delete_leads',
  'view_customers',
  'create_customers',
  'edit_customers',
  'delete_customers',
  'view_reports',
  'create_reports',
  'view_calendar',
  'create_calendar',
  'edit_calendar',
  'delete_calendar',
  'manage_users',
  'manage_clients',
  'manage_settings',
  'view_analytics',
  'view_all_users',
  'create_managers',
  'edit_managers',
  'delete_managers',
  'create_agents',
  'edit_agents',
  'delete_agents'
];

// פונקציה לקבלת הרשאות לפי תפקיד
const getPermissionsByRole = (role: string): string[] => {
  switch (role) {
    case 'admin':
      return adminPermissions;
    case 'manager':
      return managerPermissions;
    case 'agent':
      return agentPermissions;
    default:
      return agentPermissions;
  }
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      users: [],
      deletedUsers: [],
      selectedUser: null,
      isLoading: false,
      error: null,

      fetchUsers: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.warn('No authentication tokens found, skipping users fetch');
            set({ isLoading: false });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            console.warn(`Users API returned ${response.status}, using empty array`);
            set({ users: [], isLoading: false });
            return;
          }

          const data = await response.json();
          
          // Transform server data to match our User interface
          const users = data.users?.map((user: any) => ({
            id: user.id?.toString() || '',
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            email: user.email || '',
            role: user.role || 'user',
            status: user.is_active ? 'active' : 'inactive',
            createdAt: user.created_at,
            lastLogin: user.last_login,
            createdBy: user.created_by?.toString() || 'system',
            loginAttempts: user.login_attempts || 0,
            lastPasswordChange: user.last_password_change,
            twoFactorEnabled: user.two_factor_enabled || false,
            permissions: getPermissionsByRole(user.role),
            clientId: user.client_id?.toString(),
            department: user.department,
            phoneNumber: user.phone_number,
            notes: user.notes,
            deletedAt: user.deleted_at,
            managerId: user.manager_id?.toString()
          })) || [];

          set({ users, isLoading: false });
        } catch (error) {
          console.warn('Error fetching users, continuing without user data:', error);
          set({ 
            users: [],
            error: null, // Don't show error to user for non-critical failure
            isLoading: false 
          });
        }
      },

      fetchDeletedUsers: async (managerId?: string) => {
        try {
          set({ isLoading: true, error: null });
          
          console.log('=== FETCHING DELETED USERS ===');
          console.log('Manager ID parameter:', managerId);
          console.log('API_BASE_URL:', API_BASE_URL);
          
          let url: string;
          
          if (managerId) {
            // For managers, fetch only their deleted agents
            url = `${API_BASE_URL}/users/deleted/public/${managerId}`;
            console.log('Manager detected - fetching deleted users for manager ID:', managerId);
          } else {
            // For admins and others, fetch all deleted users
            url = `${API_BASE_URL}/users/deleted/public`;
            console.log('Admin or other role - fetching all deleted users');
          }
          
          console.log('Request URL:', url);
          console.log('No authentication required - using public endpoint');
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          console.log('Response status:', response.status);
          console.log('Response headers:', Object.fromEntries(response.headers.entries()));

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Deleted users API returned ${response.status}:`, errorText);
            set({ deletedUsers: [], isLoading: false });
            return;
          }

          const data = await response.json();
          console.log('Public deleted users endpoint response:', data);
          console.log('Message:', data.message);
          console.log('Total deleted users:', data.total);
          console.log('Deleted users array:', data.deletedUsers);
          
          // Transform server data to match our User interface
          const deletedUsers = data.deletedUsers?.map((user: any) => ({
            id: user.id?.toString() || '',
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            email: user.email || '',
            role: user.role || 'user',
            status: user.is_active ? 'active' : 'inactive',
            createdAt: user.created_at,
            lastLogin: user.last_login,
            createdBy: user.created_by?.toString() || 'system',
            loginAttempts: user.login_attempts || 0,
            lastPasswordChange: user.last_password_change,
            twoFactorEnabled: user.two_factor_enabled || false,
            permissions: getPermissionsByRole(user.role),
            clientId: user.client_id?.toString(),
            department: user.department,
            phoneNumber: user.phone_number,
            notes: user.notes,
            deletedAt: user.deleted_at,
            managerId: user.manager_id?.toString()
          })) || [];

          console.log('Transformed deleted users:', deletedUsers);
          set({ deletedUsers, isLoading: false });
        } catch (error) {
          console.error('Error fetching deleted users:', error);
          set({ 
            deletedUsers: [],
            error: null, // Don't show error to user for non-critical failure
            isLoading: false 
          });
        }
      },

      fetchManagers: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.warn('No authentication tokens found, skipping managers fetch');
            set({ isLoading: false });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/users?role=manager`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            console.warn(`Managers API returned ${response.status}, using empty array`);
            set({ users: [], isLoading: false });
            return;
          }

          const data = await response.json();
          
          // Transform server data to match our User interface
          const managers = data.users?.map((user: any) => ({
            id: user.id?.toString() || '',
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            email: user.email || '',
            role: user.role || 'manager',
            status: user.is_active ? 'active' : 'inactive',
            createdAt: user.created_at,
            lastLogin: user.last_login,
            createdBy: user.created_by?.toString() || 'system',
            loginAttempts: user.login_attempts || 0,
            lastPasswordChange: user.last_password_change,
            twoFactorEnabled: user.two_factor_enabled || false,
            permissions: getPermissionsByRole(user.role),
            clientId: user.client_id?.toString(),
            department: user.department,
            phoneNumber: user.phone_number,
            notes: user.notes,
            deletedAt: user.deleted_at,
            managerId: user.manager_id?.toString()
          })) || [];

          set({ users: managers, isLoading: false });
        } catch (error) {
          console.warn('Error fetching managers, continuing without manager data:', error);
          set({ 
            users: [],
            error: null, // Don't show error to user for non-critical failure
            isLoading: false 
          });
        }
      },

      fetchAgentsByManager: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.warn('No authentication tokens found, skipping agents fetch');
            set({ isLoading: false });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/users/agents/by-manager`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            console.warn(`Agents API returned ${response.status}, using empty array`);
            set({ users: [], isLoading: false });
            return;
          }

          const data = await response.json();
          
          // Transform server data to match our User interface
          const agents = data.agents?.map((user: any) => ({
            id: user.id?.toString() || '',
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            email: user.email || '',
            role: user.role || 'agent',
            status: user.is_active ? 'active' : 'inactive',
            createdAt: user.created_at,
            lastLogin: user.last_login,
            createdBy: user.created_by?.toString() || 'system',
            loginAttempts: user.login_attempts || 0,
            lastPasswordChange: user.last_password_change,
            twoFactorEnabled: user.two_factor_enabled || false,
            permissions: getPermissionsByRole(user.role),
            clientId: user.client_id?.toString(),
            department: user.department,
            phoneNumber: user.phone_number,
            notes: user.notes,
            deletedAt: user.deleted_at,
            managerId: user.manager_id?.toString()
          })).filter((user: any) => !user.deletedAt && user.id) || [];

          set({ users: agents, isLoading: false });
        } catch (error) {
          console.warn('Error fetching agents, continuing without agent data:', error);
          set({ 
            users: [],
            error: null,
            isLoading: false 
          });
        }
      },

      addUser: async (userData: UserFormData, adminId: string) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          // Validate password for new users
          if (!userData.password) {
            throw new Error('סיסמה נדרשת למשתמש חדש');
          }

          const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              first_name: userData.name.split(' ')[0] || userData.name,
              last_name: userData.name.split(' ').slice(1).join(' ') || '',
              email: userData.email,
              password: userData.password,
              role: userData.role,
              is_active: true, // וודא שהמשתמש נוצר כפעיל
              client_id: userData.clientId,
              department: userData.department,
              phone_number: userData.phone,
              notes: userData.notes,
              manager_id: userData.managerId
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה ביצירת המשתמש');
          }

          const responseData = await response.json();
          
          // אם נוצר system_client עבור מנהל, רק עדכן את ה-store המקומי
          if (responseData.systemClient && userData.role === 'manager') {
            // לא צריך ליצור system_client נוסף - השרת כבר יצר אותו
            // רק נרשם ללוג שהמערכת יצרה system_client
          }

          // Refresh users list
          await get().fetchUsers();
          
          // Add sync event
          useSyncStore.getState().addSyncEvent({
            type: 'user',
            action: 'create',
            entityId: 'new-user',
            userId: adminId,
            data: userData
          });
          
          const successMessage = responseData.systemClient 
            ? 'המשתמש והלקוח נוצרו בהצלחה' 
            : 'המשתמש נוצר בהצלחה';
          toast.success(successMessage);
          set({ selectedUser: null });
        } catch (error) {
          console.error('Error adding user:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת משתמש');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateUser: async (id: string, updates: Partial<UserFormData>) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/users/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              first_name: updates.name?.split(' ')[0],
              last_name: updates.name?.split(' ').slice(1).join(' '),
              email: updates.email,
              password: updates.password,
              role: updates.role,
              client_id: updates.clientId,
              department: updates.department,
              phone_number: updates.phone,
              notes: updates.notes,
              manager_id: updates.managerId
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בעדכון המשתמש');
          }

          // Refresh users list
          await get().fetchUsers();

          // Add sync event
          useSyncStore.getState().addSyncEvent({
            type: 'user',
            action: 'update',
            entityId: id,
            userId: 'system',
            data: updates
          });
          
          toast.success('המשתמש עודכן בהצלחה');
          set({ selectedUser: null });
        } catch (error) {
          console.error('Error updating user:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון המשתמש');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteUser: async (id: string) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const user = get().users.find(u => u.id === id);
          if (!user) {
            throw new Error('משתמש לא נמצא');
          }

          const response = await fetch(`${API_BASE_URL}/users/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה במחיקת המשתמש');
          }

          // Refresh users list
          await get().fetchUsers();

          // Add sync event
          useSyncStore.getState().addSyncEvent({
            type: 'user',
            action: 'delete',
            entityId: id,
            userId: 'system',
            data: { userName: user.name }
          });
          
          toast.success('המשתמש נמחק בהצלחה');
          set({ selectedUser: null });
        } catch (error) {
          console.error('Error deleting user:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת המשתמש');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      restoreUser: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          
          console.log('=== RESTORING USER ===');
          console.log('User ID:', id);
          console.log('API_BASE_URL:', API_BASE_URL);
          
          const url = `${API_BASE_URL}/users/restore/public/${id}`;
          console.log('Request URL:', url);
          console.log('No authentication required - using public endpoint');
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          console.log('Response status:', response.status);
          console.log('Response headers:', Object.fromEntries(response.headers.entries()));

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Restore user API returned ${response.status}:`, errorText);
            set({ error: `Failed to restore user: ${response.status}`, isLoading: false });
            return;
          }

          const data = await response.json();
          console.log('Restore user response:', data);
          
          if (data.success) {
            // Remove user from deleted users list
            set(state => ({
              deletedUsers: state.deletedUsers.filter(user => user.id !== id),
              isLoading: false
            }));
            
            // Show success message
            alert(`משתמש ${data.message} שוחזר בהצלחה!`);
          } else {
            set({ error: 'Failed to restore user', isLoading: false });
          }
        } catch (error) {
          console.error('Error restoring user:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to restore user', isLoading: false });
        }
      },

      toggleUserStatus: async (id: string) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const user = get().users.find(u => u.id === id);
          if (!user) {
            throw new Error('משתמש לא נמצא');
          }

          const newStatus = user.status === 'active' ? 'inactive' : 'active';

          const response = await fetch(`${API_BASE_URL}/users/${id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ status: newStatus })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בעדכון סטטוס המשתמש');
          }

          // Refresh users list
          await get().fetchUsers();
          
          toast.success('סטטוס המשתמש עודכן בהצלחה');
        } catch (error) {
          console.error('Error toggling user status:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון סטטוס המשתמש');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      hasPermission: (userId: string, permission: string) => {
        const user = get().users.find(u => u.id === userId);
        if (!user) return false;
        if (user.status !== 'active') return false;
        if (user.role === 'admin') return true;
        return user.permissions?.includes(permission) || false;
      },

      setSelectedUser: (user: User | null) => {
        set({ selectedUser: user });
      },

      clearUsers: () => {
        set({ users: [], deletedUsers: [], selectedUser: null, error: null });
      }
    }),
    {
      name: 'user-storage',
      version: 2,
      partialize: (state) => ({
        // Only persist selected user, not the full users list
        selectedUser: state.selectedUser,
        isLoading: false,
        error: null
      })
    }
  )
);