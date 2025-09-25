import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './index.css';
import './styles/mobile.css';

// iOS Compatibility Fixes
const initializeIOSFixes = () => {
  
  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (isIOS) {
    
    // Fix viewport height
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', () => {
      setTimeout(setVH, 100);
      setTimeout(setVH, 500);
    });
    
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
    
    // Fix iOS Safari issues
    (document.body.style as any).webkitUserSelect = 'none';
    (document.body.style as any).webkitTouchCallout = 'none';
    (document.body.style as any).webkitTapHighlightColor = 'transparent';
    
    // Force layout recalculation
    setTimeout(() => {
      document.body.style.height = '100vh';
      document.body.style.height = '-webkit-fill-available';
      setVH();
    }, 100);
    
    setTimeout(() => {
      setVH();
    }, 1000);
  }
};

// Initialize iOS fixes immediately
initializeIOSFixes();

// Ensure the root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  throw new Error('Failed to find the root element');
}

console.log('Root element found, creating React root...');

const root = createRoot(rootElement);

// Enhanced error handling for iOS
const renderApp = () => {
  try {
    console.log('Rendering React app...');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('React app rendered successfully');
  } catch (error) {
    console.error('Error rendering app:', error);
    
    // Show minimal loading for errors only
    rootElement.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 20px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        background: #f8fafc;
        color: #64748b;
      ">
        <div style="
          width: 24px;
          height: 24px;
          border: 2px solid #e2e8f0;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
    `;
    
    // Retry after shorter delay
    setTimeout(() => {
      try {
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    }, 1000);
  }
};

// Render with delay for iOS
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  setTimeout(renderApp, 100);
} else {
  renderApp();
}

// Enhanced error logging for iOS debugging
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', { 
    message, 
    source, 
    lineno, 
    colno, 
    error,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
  
  // Show error on iOS for debugging
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    alert(`Error: ${message}\nLine: ${lineno}\nSource: ${source}`);
  }
  
  return false;
};

// Enhanced promise rejection handling
window.onunhandledrejection = function(event) {
  console.error('Unhandled promise rejection:', {
    reason: event.reason,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
  
  // Show error on iOS for debugging
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    alert(`Promise rejection: ${event.reason}`);
  }
};

// iOS specific debugging
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  console.log('User agent:', navigator.userAgent);
  console.log('Screen dimensions:', window.screen.width, 'x', window.screen.height);
  console.log('Viewport dimensions:', window.innerWidth, 'x', window.innerHeight);
  
  // Log when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
  });
  
  // Log when page is fully loaded
  window.addEventListener('load', () => {
  });
};