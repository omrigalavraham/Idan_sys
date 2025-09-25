import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RateLimiter } from '../utils/rateLimiter';
import { API_BASE_URL } from '../config/api.js';

// Create a single instance of RateLimiter for auth attempts
const loginRateLimiter = new RateLimiter(5, 300000); // 5 attempts per 5 minutes

// Function to load user profile image
const loadUserProfileImage = async (userId: string) => {
  try {
    const sessionToken = localStorage.getItem('session_token');
    const accessToken = localStorage.getItem('access_token');
    
    if (!sessionToken || !accessToken) {
      console.warn('No authentication tokens found for profile image loading');
      return;
    }

    // Get user profile data to load avatar
    const response = await fetch(`${API_BASE_URL}/users/profile/${userId}`, {
      headers: {
        'X-Session-Token': sessionToken,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const profileData = await response.json();
      
      // Load avatar if exists
      if (profileData.profile?.avatar_url) {
        console.log('Loading avatar from database on login');
        // Save to localStorage for immediate access
        localStorage.setItem(`userAvatar_${userId}`, profileData.profile.avatar_url);
        
        // Trigger storage event manually for other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: `userAvatar_${userId}`,
          newValue: profileData.profile.avatar_url
        }));
      } else {
        // Check if there's a saved avatar in localStorage as fallback
        const savedAvatar = localStorage.getItem(`userAvatar_${userId}`);
        if (savedAvatar) {
          console.log('Using saved avatar from localStorage on login');
          // Trigger storage event manually for other components
          window.dispatchEvent(new StorageEvent('storage', {
            key: `userAvatar_${userId}`,
            newValue: savedAvatar
          }));
        }
      }
    } else {
      console.warn('Failed to load profile data for avatar');
    }
  } catch (error) {
    console.error('Error loading user profile image:', error);
  }
};

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'agent';
  permissions: string[];
  client_id?: number;
  manager_id?: number;
}

interface ClientConfig {
  id: number;
  name: string;
  company_name: string;
  lead_statuses: any[];
  customer_statuses: any[];
  payment_statuses: any[];
  features: Record<string, any>;
  message_templates: any[];
}

interface AuthStore {
  user: User | null;
  clientConfig: ClientConfig | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  savedCredentials: {
    email: string;
    password: string;
  } | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  setSavedCredentials: (email: string, password: string) => void;
  clearSavedCredentials: () => void;
  checkSession: () => Promise<boolean>;
  refreshClientConfig: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      clientConfig: null,
      isAuthenticated: false,
      rememberMe: false,
      savedCredentials: null,

      checkSession: async () => {
        const sessionToken = localStorage.getItem('session_token');
        if (!sessionToken) {
          return false;
        }

        try {
          const accessToken = localStorage.getItem('access_token');
          const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'GET',
            headers: {
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (response.ok) {
            const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
              method: 'GET',
              headers: {
                'X-Session-Token': sessionToken,
                'Authorization': `Bearer ${accessToken}`
              }
            });

            if (userResponse.ok) {
              const userData = await userResponse.json();
              // Get proper permissions based on role
              const permissions = userData.user.role === 'admin' ? 
                ['view_leads', 'create_leads', 'edit_leads', 'delete_leads', 'view_customers', 'create_customers', 'edit_customers', 'delete_customers', 'view_reports', 'create_reports', 'view_calendar', 'create_calendar', 'edit_calendar', 'delete_calendar', 'manage_users', 'manage_clients', 'manage_settings', 'view_analytics'] :
                ['view_leads', 'create_leads', 'edit_leads', 'view_customers', 'create_customers', 'edit_customers', 'view_reports', 'view_calendar', 'create_calendar', 'edit_calendar', 'manage_settings'];
              
              set({
                user: {
                  id: userData.user.id?.toString() || '',
                  name: `${userData.user.first_name || ''} ${userData.user.last_name || ''}`.trim(),
                  email: userData.user.email || '',
                  role: userData.user.role || 'user',
                  permissions: permissions,
                  client_id: userData.user.client_id,
                  manager_id: userData.user.manager_id
                },
                clientConfig: userData.client_config || null,
                isAuthenticated: true
              });

              // Load user profile image on session check
              await loadUserProfileImage(userData.user.id?.toString() || '');
              
              return true;
            }
          }
        } catch (error) {
          console.error('Session check error:', error);
        }

        // Clear invalid session
        localStorage.removeItem('session_token');
        localStorage.removeItem('access_token');
        set({
          user: null,
          clientConfig: null,
          isAuthenticated: false
        });
        return false;
      },

      updateUser: (user: User) => {
        set({ user });
      },

      login: async (email: string, password: string, remember: boolean) => {
        const trimmedEmail = email.trim().toLowerCase();

        // Clean up old avatar data from localStorage (keep only current user's)
        const cleanupOldAvatars = () => {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('userAvatar_') && key !== `userAvatar_${get().user?.id}`) {
              localStorage.removeItem(key);
            }
          });
        };

        // Check if login attempts are allowed
        if (!loginRateLimiter.isAllowed(trimmedEmail)) {
          const timeRemaining = Math.ceil(loginRateLimiter.getTimeRemaining(trimmedEmail) / 1000);
          const error = new Error(`יותר מדי ניסיונות התחברות. נסה שוב בעוד ${timeRemaining} שניות`);
          (error as any).code = 'RATE_LIMIT_EXCEEDED';
          (error as any).lockoutTimeRemaining = timeRemaining;
          throw error;
        }

        try {
          // Login via API
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: trimmedEmail,
              password: password
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            loginRateLimiter.increment(trimmedEmail);
            throw new Error(errorData.error || 'שגיאה בהתחברות');
          }

          const data = await response.json();
          
          // Store session token and access token
          localStorage.setItem('session_token', data.session_token);
          localStorage.setItem('access_token', data.access_token);

          // Get proper permissions based on role
          const getPermissionsByRole = (role: string): string[] => {
            switch (role) {
              case 'admin':
                return ['view_leads', 'create_leads', 'edit_leads', 'delete_leads', 'view_customers', 'create_customers', 'edit_customers', 'delete_customers', 'view_reports', 'create_reports', 'view_calendar', 'create_calendar', 'edit_calendar', 'delete_calendar', 'manage_users', 'manage_clients', 'manage_settings', 'view_analytics', 'view_all_users', 'create_managers', 'edit_managers', 'delete_managers', 'create_agents', 'edit_agents', 'delete_agents'];
              case 'manager':
                return ['view_own_profile', 'edit_own_profile', 'view_own_leads', 'create_leads', 'edit_own_leads', 'view_own_customers', 'create_customers', 'edit_own_customers', 'view_calendar', 'create_calendar', 'edit_own_calendar', 'view_own_reports', 'view_all_users', 'create_agents', 'edit_agents', 'delete_agents', 'view_all_leads', 'edit_all_leads', 'delete_leads', 'view_all_customers', 'edit_all_customers', 'delete_customers', 'view_all_reports', 'create_reports', 'edit_all_calendar', 'delete_calendar', 'manage_settings'];
              case 'agent':
                return ['view_own_profile', 'edit_own_profile', 'view_own_leads', 'create_leads', 'edit_own_leads', 'view_own_customers', 'create_customers', 'edit_own_customers', 'view_calendar', 'create_calendar', 'edit_own_calendar', 'view_own_reports'];
              default:
                return ['view_own_profile', 'edit_own_profile'];
            }
          };
          
          const permissions = getPermissionsByRole(data.user.role);
          
          // Create auth state with user data
          const authState = {
            user: {
              id: data.user.id?.toString() || '',
              name: `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim(),
              email: data.user.email || '',
              role: data.user.role || 'user',
              permissions: permissions,
              client_id: data.user.client_id,
              manager_id: data.user.manager_id
            },
            clientConfig: data.client_config || null,
            isAuthenticated: true,
            rememberMe: remember,
            savedCredentials: remember ? { email: trimmedEmail, password } : null
          };

          set(authState);

          // Clean up old avatar data after successful login
          cleanupOldAvatars();

          // Load user profile image immediately after login
          await loadUserProfileImage(data.user.id?.toString() || '');

          // Reset rate limiter on successful login
          loginRateLimiter.reset(trimmedEmail);

        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },

      logout: async () => {
        try {
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          if (sessionToken) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': sessionToken,
                'Authorization': `Bearer ${accessToken}`
              }
            });
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clean up user-specific data
          const currentUser = get().user;
          if (currentUser?.id) {
            localStorage.removeItem(`userAvatar_${currentUser.id}`);
          }
          
          localStorage.removeItem('session_token');
          localStorage.removeItem('access_token');
          set({
            user: null,
            clientConfig: null,
            isAuthenticated: false,
            savedCredentials: get().rememberMe ? get().savedCredentials : null,
            rememberMe: get().rememberMe
          });
        }
      },

      setSavedCredentials: (email: string, password: string) => {
        set({
          savedCredentials: { email, password }
        });
      },

      clearSavedCredentials: () => {
        set({
          savedCredentials: null,
          rememberMe: false
        });
      },

      refreshClientConfig: async () => {
        const sessionToken = localStorage.getItem('session_token');
        if (!sessionToken) return;

        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
              'X-Session-Token': sessionToken,
            }
          });

          if (response.ok) {
            const data = await response.json();
            set({
              clientConfig: data.client_config || null
            });
          }
        } catch (error) {
          console.error('Error refreshing client config:', error);
        }
      }
    }),
    {
      name: 'auth-storage',
      version: 1,
      partialize: (state) => ({
        user: state.user,
        clientConfig: state.clientConfig,
        isAuthenticated: state.isAuthenticated,
        savedCredentials: state.savedCredentials,
        rememberMe: state.rememberMe
      })
    }
  )
);

export default useAuthStore;
