import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import ReminderBanner from '../notifications/ReminderBanner';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Enhanced iOS viewport fixes
  React.useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    
    if (isIOS) {
      
      // Multiple attempts to fix iOS viewport
      setTimeout(setVH, 100);
      setTimeout(setVH, 500);
      setTimeout(setVH, 1000);
      
      // Force iOS layout fixes
      document.body.style.height = '-webkit-fill-available';
      document.documentElement.style.height = '-webkit-fill-available';
      
      // Prevent bounce scrolling
      document.addEventListener('touchmove', (e) => {
        const target = e.target as Element;
        if (target === document.body || target === document.documentElement) {
          e.preventDefault();
        }
      }, { passive: false });
      
      // iOS Safari address bar handling
      let ticking = false;
      const updateViewport = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            setVH();
            ticking = false;
          });
          ticking = true;
        }
      };
      
      window.addEventListener('scroll', updateViewport);
      window.addEventListener('touchend', updateViewport);
    }
    
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  // Enhanced mobile keyboard handling
  React.useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
        console.log('Keyboard height:', keyboardHeight);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => window.visualViewport.removeEventListener('resize', handleViewportChange);
    }
  }, []);

  // Enhanced scroll prevention
  React.useEffect(() => {
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    
    // iOS specific scroll fixes
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      document.body.style.position = 'relative';
      document.body.style.overflow = 'hidden auto';
    }
  }, []);

  return (
    <div 
      className="flex bg-gray-50 dark:bg-gray-900 ios-safe-area" 
      style={{ 
        minHeight: 'calc(var(--vh, 1vh) * 100)',
        height: '-webkit-fill-available'
      }}
    >
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex flex-col flex-1">
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <ReminderBanner />
        
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <main className="flex-1 bg-gray-100 dark:bg-gray-900 ios-bottom-safe">
          <div className="container-fluid px-3 py-4 px-md-4 py-md-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;