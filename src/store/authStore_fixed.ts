import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, ClientConfig } from '../types';
import { API_BASE_URL } from '../config/api.js';
import { RateLimiter } from '../utils/rateLimiter';
import toast from 'react-hot-toast';

// Rate limiter for login attempts
const loginRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 15 * 60 * 1000 // 15 minutes
});

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
}

// Helper function for safe JSON parsing
const safeJsonParse = async (response: Response, url: string) => {
  const contentType = response.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`Non-JSON response from ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      contentType,
      body: text.substring(0, 200) + (text.length > 200 ? '...' : '')
    });
    throw new Error(`Server returned ${response.status} ${response.statusText} - Expected JSON but got ${contentType}`);
  }
  
  try {
    return await response.json();
  } catch (error) {
    console.error(`Failed to parse JSON from ${url}:`, error);
    throw new Error(`Invalid JSON response from server: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

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
          const url = `${API_BASE_URL}/auth/verify`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (response.ok) {
            const userUrl = `${API_BASE_URL}/auth/me`;
            const userResponse = await fetch(userUrl, {
              method: 'GET',
              headers: {
                'X-Session-Token': sessionToken,
                'Authorization': `Bearer ${accessToken}`
              }
            });

            if (userResponse.ok) {
              const userData = await safeJsonParse(userResponse, userUrl);
              set({
                user: userData.user,
                clientConfig: userData.clientConfig,
                isAuthenticated: true
              });
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
          const url = `${API_BASE_URL}/auth/login`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: trimmedEmail, password })
          });

          if (!response.ok) {
            const errorData = await safeJsonParse(response, url);
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await safeJsonParse(response, url);

          // Store tokens
          localStorage.setItem('session_token', data.sessionToken);
          localStorage.setItem('access_token', data.accessToken);

          // Update state
          set({
            user: data.user,
            clientConfig: data.clientConfig,
            isAuthenticated: true,
            rememberMe: remember
          });

          // Save credentials if remember me is checked
          if (remember) {
            set({
              savedCredentials: {
                email: trimmedEmail,
                password: password
              }
            });
          } else {
            set({ savedCredentials: null });
          }

          // Reset rate limiter on successful login
          loginRateLimiter.reset(trimmedEmail);

          toast.success('התחברת בהצלחה');
        } catch (error) {
          console.error('Login error:', error);
          
          // Record failed attempt
          loginRateLimiter.recordAttempt(trimmedEmail);
          
          const errorMessage = error instanceof Error ? error.message : 'שגיאה בהתחברות';
          toast.error(errorMessage);
          throw error;
        }
      },

      logout: async () => {
        try {
          const sessionToken = localStorage.getItem('session_token');
          
          if (sessionToken) {
            const url = `${API_BASE_URL}/auth/logout`;
            await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': sessionToken
              }
            });
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear tokens and state regardless of API call success
          localStorage.removeItem('session_token');
          localStorage.removeItem('access_token');
          
          set({
            user: null,
            clientConfig: null,
            isAuthenticated: false,
            savedCredentials: null
          });

          toast.success('התנתקת בהצלחה');
        }
      },

      setSavedCredentials: (email: string, password: string) => {
        set({
          savedCredentials: { email, password }
        });
      },

      clearSavedCredentials: () => {
        set({ savedCredentials: null });
      }
    }),
    {
      name: 'auth-storage',
      version: 1,
      partialize: (state) => ({
        user: state.user,
        clientConfig: state.clientConfig,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
        savedCredentials: state.savedCredentials
      })
    }
  )
);
