// Utility functions for cross-platform notifications
export const isNotificationSupported = (): boolean => {
  return typeof Notification !== 'undefined' && 'Notification' in window;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission | null> => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported on this platform');
    return null;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

export const showNotification = (title: string, options?: NotificationOptions): Notification | null => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported, falling back to console log');
    console.log(`Notification: ${title}`, options);
    return null;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }
  
  try {
    return new Notification(title, options);
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

export const getNotificationPermission = (): NotificationPermission | null => {
  if (!isNotificationSupported()) {
    return null;
  }
  
  return Notification.permission;
};