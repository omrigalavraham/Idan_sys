import { useEffect, useRef } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import useAuthStore from '../store/authStore';
import { API_BASE_URL } from '../config/api';
import toast from 'react-hot-toast';

// Israel timezone functions (inline)
function isIsraelDST(date: Date): boolean {
  const month = date.getMonth(); // 0=Jan, 8=Sep, 9=Oct
  return month >= 3 && month <= 8; // April-September = summer (UTC+3)
}

function utcToIsraelTime(utcDate: Date): Date {
  const offset = isIsraelDST(utcDate) ? 3 : 2;
  return new Date(utcDate.getTime() + (offset * 60 * 60 * 1000));
}

function logTimezoneInfo(label: string, utcTime: Date): void {
  const offset = isIsraelDST(utcTime) ? 3 : 2;
  const israelTime = new Date(utcTime.getTime() + (offset * 60 * 60 * 1000));
  const isDST = isIsraelDST(utcTime);
  
  console.log(`🕐 ${label}:`, {
    UTC: utcTime.toISOString(),
    Israel: israelTime.toLocaleString('he-IL'),
    Offset: `UTC+${offset}`,
    Season: isDST ? 'Summer (IDT)' : 'Winter (IST)'
  });
}

export const useReminderNotifications = () => {
  const { addNotification } = useNotificationStore();
  const { user, isAuthenticated } = useAuthStore();
  const lastCheckRef = useRef<Date>(new Date());
  const notifiedEventsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Only run if user is authenticated
    if (!isAuthenticated || !user) {
      return;
    }

    const checkUnifiedEvents = async () => {
      try {
        const sessionToken = localStorage.getItem('session_token');
        const accessToken = localStorage.getItem('access_token');
        
        if (!sessionToken || !accessToken) {
          return;
        }

        // Fetch unified events
        const response = await fetch(`${API_BASE_URL}/unified-events`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken,
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          console.error('Failed to fetch unified events');
          return;
        }

        const data = await response.json();
        const events = data.events || data; // Handle both {events: [...]} and [...] formats
        const now = new Date();
        const currentTime = now.getTime();

        events.forEach((event: any) => {
          // Skip if already notified this session
          if (notifiedEventsRef.current.has(event.id)) {
            return;
          }

          // Only process reminder events that are active and not yet notified
          if (event.eventType !== 'reminder' || !event.isActive || event.notified) {
            return;
          }

          try {
            // Parse event start time (stored in UTC)
            const eventDateTimeUTC = new Date(event.startTime);
            
            if (isNaN(eventDateTimeUTC.getTime())) {
              console.warn('Invalid event date/time:', event);
              return;
            }

            // Convert UTC time to Israel time for display using smart timezone function
            const eventDateTimeIsrael = utcToIsraelTime(eventDateTimeUTC);
            
            // Calculate when the notification should be shown (in UTC)
            const advanceNoticeMs = (event.advanceNotice || 5) * 60 * 1000; // Convert minutes to milliseconds
            const notificationTimeUTC = new Date(eventDateTimeUTC.getTime() - advanceNoticeMs);
            
            logTimezoneInfo(`Event ${event.id} check`, eventDateTimeUTC);
            console.log(`- Israel time: ${eventDateTimeIsrael.toLocaleString('he-IL')}`);
            console.log(`- Notification time (UTC): ${notificationTimeUTC.toISOString()}`);
            console.log(`- Current time (UTC): ${new Date(currentTime).toISOString()}`);
            console.log(`- Should notify: ${currentTime >= notificationTimeUTC.getTime() && currentTime < eventDateTimeUTC.getTime()}`);
            
            // Check if it's time to show the notification (compare in UTC)
            if (currentTime >= notificationTimeUTC.getTime() && currentTime < eventDateTimeUTC.getTime()) {
              // Additional check: make sure we're not too late (within 10 minutes of notification time)
              const timeDiffMinutes = (currentTime - notificationTimeUTC.getTime()) / (1000 * 60);
              if (timeDiffMinutes >= 0 && timeDiffMinutes <= 10) {
                
                // Format time for display (use Israel time)
                const eventTimeString = eventDateTimeIsrael.toLocaleTimeString('he-IL', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                });
                const eventDateString = eventDateTimeIsrael.toLocaleDateString('he-IL');
                
                const customerName = event.customerName || 'לא צוין';
                const title = event.title || 'תזכורת';
                
                // Show toast notification
                toast(
                  `🔔 ${title}\nלקוח: ${customerName}\nזמן: ${eventTimeString}\nתאריך: ${eventDateString}`,
                  {
                    duration: 15000, // 15 seconds
                    icon: '🔔',
                    style: {
                      background: '#3b82f6',
                      color: 'white',
                      fontSize: '14px',
                      padding: '16px',
                      borderRadius: '8px',
                      whiteSpace: 'pre-line',
                    },
                  }
                );

                // Add to notification center
                addNotification({
                  type: 'reminder',
                  title: `תזכורת: ${title}`,
                  message: `לקוח: ${customerName}\nזמן: ${eventTimeString}\nתאריך: ${eventDateString}`,
                  priority: 'high',
                  metadata: {
                    eventId: event.id,
                    customerName,
                    reminderTime: eventTimeString,
                    reminderDate: eventDateString,
                    title,
                    description: event.description
                  }
                });

                // Mark as notified in memory to prevent duplicate notifications this session
                notifiedEventsRef.current.add(event.id);
                
                // Mark as notified in the database
                markEventAsNotified(event.id);
                
                console.log('🔔 Event notification sent:', title, 'at Israel time:', eventTimeString);
              }
            }
          } catch (error) {
            console.error('Error checking event:', event, error);
          }
        });

        lastCheckRef.current = now;
      } catch (error) {
        console.error('Error checking unified events:', error);
      }
    };

    const markEventAsNotified = async (eventId: number) => {
      try {
        const sessionToken = localStorage.getItem('session_token');
        const accessToken = localStorage.getItem('access_token');
        
        if (!sessionToken || !accessToken) {
          return;
        }

        await fetch(`${API_BASE_URL}/unified-events/${eventId}/notified`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken,
            'Authorization': `Bearer ${accessToken}`
          }
        });
      } catch (error) {
        console.error('Error marking event as notified:', error);
      }
    };

    // Check immediately
    checkUnifiedEvents();

    // Check every 15 seconds for better responsiveness
    const interval = setInterval(checkUnifiedEvents, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, addNotification]);

  return null; // This hook doesn't render anything
};
