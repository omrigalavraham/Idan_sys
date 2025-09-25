import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, User, Calendar } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import useAuthStore from '../../store/authStore';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const ReminderBanner: React.FC = () => {
  const { notifications } = useNotificationStore();
  const [activeReminders, setActiveReminders] = useState<any[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Get reminder notifications that haven't been dismissed
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated || !authState.user) return;
    
    const user = authState.user;

    // Get reminder notifications for current user that haven't been dismissed
    const reminderNotifications = notifications.filter(
      n => n.type === 'system' && 
      n.userId === user.id &&
      n.metadata?.reminderId && 
      !dismissedReminders.has(n.metadata.reminderId) &&
      !n.read
    );

    setActiveReminders(reminderNotifications);
  }, [notifications, dismissedReminders]);

  const handleDismiss = (reminderId: string) => {
    setDismissedReminders(prev => new Set([...prev, reminderId]));
    
    // Also mark the notification as read in the notification store
    const { markAsRead } = useNotificationStore.getState();
    const notification = notifications.find(n => n.metadata?.reminderId === reminderId);
    if (notification) {
      markAsRead(notification.id);
    }
  };

  if (activeReminders.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-md px-4">
      <AnimatePresence>
        {activeReminders.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4 mb-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-white">
                    {notification.title}
                  </h4>
                  <p className="text-blue-100 text-sm mt-1">
                    {notification.message}
                  </p>
                  
                  {notification.metadata && (
                    <div className="mt-2 space-y-1">
                      {notification.metadata.customerName && (
                        <div className="flex items-center gap-2 text-sm text-blue-100">
                          <User className="w-4 h-4" />
                          <span>{notification.metadata.customerName}</span>
                        </div>
                      )}
                      {notification.metadata.reminderDate && (
                        <div className="flex items-center gap-2 text-sm text-blue-100">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(notification.metadata.reminderDate), 'dd/MM/yyyy', { locale: he })}
                            {notification.metadata.reminderTime && ` בשעה ${notification.metadata.reminderTime.substring(0, 5)}`}
                          </span>
                        </div>
                      )}
                      {notification.metadata.description && (
                        <p className="text-sm text-blue-100 mt-1">
                          {notification.metadata.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDismiss(notification.metadata?.reminderId)}
                className="text-blue-100 hover:text-white ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ReminderBanner;