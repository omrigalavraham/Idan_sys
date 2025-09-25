import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useClientStore } from '../store/clientStore';
import { useUserStore } from '../store/userStore';
import { useLeadStore } from '../store/leadStore';
import useCustomerStore from '../store/customerStore';
import toast from 'react-hot-toast';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'agent';
  allowedRoles?: ('admin' | 'manager' | 'agent')[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole, allowedRoles }) => {
  const { isAuthenticated, user, checkSession } = useAuthStore();
  const { currentClient, clients, setCurrentClient, fetchClients } = useClientStore();
  const { fetchUsers } = useUserStore();
  const { fetchLeads } = useLeadStore();
  const { fetchCustomers } = useCustomerStore();
  const location = useLocation();
  const [isChecking, setIsChecking] = React.useState(true);

  useEffect(() => {
    const verifySession = async () => {
      setIsChecking(true);
      try {
        const isValid = await checkSession();
        if (!isValid && isAuthenticated) {
          toast.error('פג תוקף החיבור, נא להתחבר מחדש');
        }
      } catch (error) {
        console.error('Session verification error:', error);
      } finally {
        setIsChecking(false);
      }
    };

    verifySession();
  }, [location, checkSession, isAuthenticated]);

  // Initialize data when authenticated - only once
  useEffect(() => {
    let isInitialized = false;
    
    const initializeData = async () => {
      if (isAuthenticated && user && !isInitialized) {
        isInitialized = true;
        try {
          
          // Check if we have valid authentication tokens
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.warn('No authentication tokens found, skipping data initialization');
            return;
          }
          
          // Fetch data with graceful fallback
          await Promise.all([
            fetchClients().catch(err => console.warn('Failed to fetch clients:', err)),
            (user.role === 'admin' || user.role === 'manager') ? fetchUsers().catch(err => console.warn('Failed to fetch users:', err)) : Promise.resolve(),
            fetchLeads().catch(err => console.warn('Failed to fetch leads:', err)),
            fetchCustomers().catch(err => console.warn('Failed to fetch customers:', err))
          ]);
        } catch (error) {
          console.error('Error initializing data:', error);
        }
      }
    };

    initializeData();
  }, [isAuthenticated, user?.id]); // Only depend on user.id to prevent loops

  // Initialize current client if not set
  useEffect(() => {
    if (isAuthenticated && clients.length > 0 && !currentClient) {
      const storedClientId = localStorage.getItem('currentClientId');
      if (storedClientId) {
        const client = clients.find(c => c.id === storedClientId);
        if (client) {
          setCurrentClient(storedClientId);
        } else {
          // Set first client as default
          setCurrentClient(clients[0].id);
        }
      } else {
        // Set first client as default
        setCurrentClient(clients[0].id);
      }
    }
  }, [isAuthenticated, clients, currentClient, setCurrentClient]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role permissions
  if (requiredRole && user?.role !== requiredRole) {
    toast.error('אין לך הרשאות מתאימות לצפייה בדף זה');
    return <Navigate to="/" replace />;
  }
  
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    toast.error('אין לך הרשאות מתאימות לצפייה בדף זה');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;