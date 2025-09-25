import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import ToastNotification from './ToastNotification';
import { useNotificationStore } from '../../store/notificationStore';

const ToastContainer: React.FC = () => {
  const { notifications, removeNotification, checkCallbackNotifications } = useNotificationStore();
  const [visibleToasts, setVisibleToasts] = React.useState<string[]>([]);

  useEffect(() => {
    // בדיקת הרשאות להתראות
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // הפעלת בדיקת התראות
    checkCallbackNotifications();
  }, []);

  useEffect(() => {
    // כשמתווספת התראה חדשה, הוסף אותה לרשימת ההתראות המוצגות
    notifications.forEach((notification) => {
      if (!visibleToasts.includes(notification.id) && !notification.read) {
        setVisibleToasts((prev) => [...prev, notification.id]);
        
        // הסר את ההתראה אחרי 5 שניות
        setTimeout(() => {
          setVisibleToasts((prev) => prev.filter((id) => id !== notification.id));
        }, 5000);
      }
    });
  }, [notifications]);

  const handleClose = (id: string) => {
    setVisibleToasts((prev) => prev.filter((toastId) => toastId !== id));
    removeNotification(id);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications
          .filter((notification) => visibleToasts.includes(notification.id))
          .map((notification) => (
            <ToastNotification
              key={notification.id}
              id={notification.id}
              title={notification.title}
              message={notification.message}
              type={notification.type as "task" | "lead"}
              metadata={notification.metadata}
              onClose={handleClose}
            />
          ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;