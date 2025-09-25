import React from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  Users, 
  Calendar, 
  Phone, 
  MessageSquare, 
  FileText, 
  BarChart3, 
  Settings, 
  Bell,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/', icon: Home, label: 'דף הבית' },
    { path: '/leads', icon: Users, label: 'לידים' },
    { path: '/customers', icon: User, label: 'לקוחות' },
    { path: '/calendar', icon: Calendar, label: 'יומן' },
    { path: '/dialer', icon: Phone, label: 'חיוג' },
    { path: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
    { path: '/tasks', icon: FileText, label: 'משימות' },
    { path: '/reports', icon: BarChart3, label: 'דוחות' },
    { path: '/reminders', icon: Bell, label: 'תזכורות' },
    { path: '/settings', icon: Settings, label: 'הגדרות' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : '-100%',
        }}
        transition={{
          type: 'tween',
          duration: 0.3,
          ease: 'easeInOut'
        }}
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 shadow-lg
          md:relative md:translate-x-0 md:shadow-none
          sidebar-mobile
          ${isOpen ? 'open' : ''}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              מערכת ניהול לידים
            </h1>
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {user.name || 'משתמש'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto">
            <div className="p-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      // Close sidebar on mobile after navigation
                      if (window.innerWidth < 768) {
                        onClose();
                      }
                    }}
                    className={`
                      flex items-center space-x-3 rtl:space-x-reverse px-3 py-2 rounded-lg mb-1
                      transition-colors duration-200
                      ${isActive 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 rtl:space-x-reverse w-full px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">התנתקות</span>
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export { Sidebar };
