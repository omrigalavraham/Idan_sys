import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, AlertCircle, Calendar, UserPlus } from 'lucide-react';
import { useNotificationStore, NotificationType } from '../../store/notificationStore';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
  switch (type) {
    case 'lead':
      return <UserPlus className="w-5 h-5 text-blue-500" />;
    case 'task':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    case 'callback':
      return <Calendar className="w-5 h-5 text-purple-500" />;
    case 'reminder':
      return <Bell className="w-5 h-5 text-orange-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
};

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotificationStore();

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleRemove = (id: string) => {
    removeNotification(id);
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md flex items-center justify-center haptic-light"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-md border border-white"
          >
            {unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="notification-center absolute left-0 mt-3 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky-header">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">התראות</h3>
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => markAllAsRead()}
                    className="text-base font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-4 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 haptic-light"
                  >
                    סמן הכל כנקרא
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center haptic-medium"
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                </div>
              </div>

              <div className="max-h-[calc(100vh-200px)] overflow-y-auto -webkit-overflow-scrolling-touch">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                    אין התראות חדשות
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`notification-item ${
                        !notification.read
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <NotificationIcon type={notification.type} />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                              {notification.title}
                            </h4>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {format(new Date(notification.createdAt), 'HH:mm', { locale: he })}
                            </span>
                          </div>
                          <p className="mt-2 text-base font-medium text-gray-600 dark:text-gray-300">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {!notification.read && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:text-blue-700 flex items-center justify-center haptic-light"
                            >
                              <Check className="w-5 h-5" />
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleRemove(notification.id)}
                            className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 hover:text-red-700 flex items-center justify-center haptic-medium"
                          >
                            <X className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;