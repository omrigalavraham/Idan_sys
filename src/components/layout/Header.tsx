import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, User, Settings, LogOut } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import { useClientStore } from '../../store/clientStore';
import AttendanceButton from '../attendance/AttendanceButton';
import NotificationCenter from '../notifications/NotificationCenter';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const { clients } = useClientStore();
  const isDark = theme === 'dark';
  const [showProfile, setShowProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const getUserClient = () => {
    if (!user?.client_id) return null;
    return clients.find(c => c.id === user.client_id!.toString());
  };

  const userClient = getUserClient();

  useEffect(() => {
    if (user?.id) {
      const savedAvatar = localStorage.getItem(`userAvatar_${user.id}`);
      if (savedAvatar) {
        setAvatarUrl(savedAvatar);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    const handleAvatarUpdate = (event: StorageEvent) => {
      if (user?.id && event.key === `userAvatar_${user.id}`) {
        setAvatarUrl(event.newValue);
      }
    };

    window.addEventListener('storage', handleAvatarUpdate);
    return () => window.removeEventListener('storage', handleAvatarUpdate);
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm mobile-header safe-top">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMenuClick}
              className="menu-button text-blue-600 dark:text-blue-400 md:hidden haptic-medium p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30"
            >
              <Menu className="h-8 w-8" />
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-blue-600 dark:to-purple-600 text-white shadow-md flex items-center justify-center haptic-light"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.button>

            <AttendanceButton />
            <NotificationCenter />
            
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowProfile(!showProfile)}
                className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md transition-all duration-200 haptic-medium"
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={user?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </motion.button>

              <AnimatePresence>
                {showProfile && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProfile(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden"
                    >
                      {/* Header Section */}
                      <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                            {avatarUrl ? (
                              <img 
                                src={avatarUrl} 
                                alt={user?.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {user?.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user?.email}
                            </p>
                            {userClient && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
                                {userClient.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="py-2">
                        <motion.button 
                          whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            navigate('/profile');
                            setShowProfile(false);
                          }}
                          className="w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 text-right flex items-center gap-3 transition-colors duration-150"
                        >
                          <User className="w-4 h-4 text-blue-500" />
                          פרופיל
                        </motion.button>
                        
                        <motion.button 
                          whileHover={{ backgroundColor: "rgba(107, 114, 128, 0.05)" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            navigate('/settings');
                            setShowProfile(false);
                          }}
                          className="w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 text-right flex items-center gap-3 transition-colors duration-150"
                        >
                          <Settings className="w-4 h-4 text-gray-500" />
                          הגדרות
                        </motion.button>
                        
                        <div className="h-px bg-gray-100 dark:bg-gray-700 mx-2 my-2" />
                        
                        <motion.button
                          whileHover={{ backgroundColor: "rgba(239, 68, 68, 0.05)" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleLogout}
                          className="w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 text-right flex items-center gap-3 transition-colors duration-150"
                        >
                          <LogOut className="w-4 h-4" />
                          התנתק
                        </motion.button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;