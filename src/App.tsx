import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import { useTheme } from './hooks/useTheme';
import AppRoutes from './routes/AppRoutes';
import ToastContainer from './components/notifications/ToastContainer';
import { useSync } from './hooks/useSync';
import { useUnifiedEventNotifications } from './hooks/useUnifiedEventNotifications';

function App() {
  const { theme } = useTheme();
  
  // Initialize sync system
  useSync();
  
  // Initialize unified event notifications
  useUnifiedEventNotifications();

  // Enhanced error boundary for iOS
  const [hasError, setHasError] = React.useState(false);
  const [errorDetails, setErrorDetails] = React.useState<string>('');

  React.useEffect(() => {
    
    const handleError = (error: ErrorEvent) => {
      console.error('App Error caught:', error);
      setHasError(true);
      setErrorDetails(`${error.message} at ${error.filename}:${error.lineno}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('App Promise rejection:', event.reason);
      setHasError(true);
      setErrorDetails(`Promise rejection: ${event.reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // iOS specific initialization
  React.useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      
      // Prevent iOS bounce scrolling
      document.addEventListener('touchmove', (e) => {
        if (e.target === document.body) {
          e.preventDefault();
        }
      }, { passive: false });
      
      // Fix iOS viewport
      const fixViewport = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      fixViewport();
      window.addEventListener('resize', fixViewport);
      window.addEventListener('orientationchange', () => {
        setTimeout(fixViewport, 100);
      });
    }
  }, []);

  if (hasError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
            משהו השתבש
          </h1>
          <p style={{ fontSize: '16px', marginBottom: '20px', opacity: 0.9 }}>
            {errorDetails}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '16px 24px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
          >
            טען מחדש
          </button>
        </div>
      </div>
    );
  }


  return (
    <Router>
      <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
        <Toaster position="top-right" />
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <AppRoutes />
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;