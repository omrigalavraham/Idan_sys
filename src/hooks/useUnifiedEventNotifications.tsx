import { useEffect, useRef } from 'react';
import { useUnifiedEventStore, UnifiedEvent } from '../store/unifiedEventStore';
import { useNotificationStore } from '../store/notificationStore';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const useUnifiedEventNotifications = (): null => {
  const { markAsNotified, fetchEvents } = useUnifiedEventStore();
  const { addNotification } = useNotificationStore();
  const { user, isAuthenticated } = useAuthStore();
  const lastCheckRef = useRef<Date>(new Date());

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // שליפה ראשונית של אירועים
    fetchEvents().catch(error => {
      console.error('Error fetching events:', error);
    });

    const checkReminders = () => {
      const now = new Date();
      const currentTime = now.getTime();

      // גישה ל-state של zustand
      const currentEvents: UnifiedEvent[] = useUnifiedEventStore.getState().events || [];

      const reminderEvents = currentEvents.filter(
        (event) => event.eventType === 'reminder' && (event.isActive ?? true) && !(event.notified ?? false)
      );

      reminderEvents.forEach((event) => {
        try {
          const eventDateTime = new Date(event.startTime);
          if (isNaN(eventDateTime.getTime())) {
            console.warn('Invalid event date/time:', event);
            return;
          }

          const notificationTime = new Date(
            eventDateTime.getTime() - event.advanceNotice * 60 * 1000
          );

          if (currentTime >= notificationTime.getTime() && currentTime < eventDateTime.getTime()) {
            const timeDiffMinutes = (currentTime - notificationTime.getTime()) / (1000 * 60);
            if (timeDiffMinutes >= 0 && timeDiffMinutes <= 5) {
              // הצגת התראה פשוטה
              const message = `🔔 תזכורת: ${event.title}\n👤 לקוח: ${event.customerName || 'לא צוין'}\n⏰ זמן: ${format(eventDateTime, 'HH:mm')}\n📅 תאריך: ${format(eventDateTime, 'dd/MM/yyyy')}`;
              
              toast(message, {
                duration: 15000,
                position: 'top-center',
                style: {
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: 'white',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                  maxWidth: '92vw',
                  fontSize: '14px',
                },
              });

              // הוספה למרכז ההתראות
              addNotification({
                type: 'reminder',
                title: `תזכורת: ${event.title}`,
                message: `לקוח: ${event.customerName || 'לא צוין'}\nזמן: ${format(
                  eventDateTime,
                  'HH:mm'
                )}\nתאריך: ${format(eventDateTime, 'dd/MM/yyyy')}`,
                priority: 'high',
                metadata: {
                  eventId: event.id,
                  customerName: event.customerName,
                  startTime: event.startTime,
                  title: event.title,
                  description: event.description,
                },
              });

              markAsNotified(event.id);
              console.log('🔔 Event notification sent:', event.title);
            }
          }
        } catch (error) {
          console.error('Error checking event:', event, error);
        }
      });

      lastCheckRef.current = now;
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, markAsNotified, fetchEvents, addNotification]);

  return null;
};
