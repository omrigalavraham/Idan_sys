import { toast } from 'react-hot-toast';

export interface ServiceNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  link?: string;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: ServiceNotification[] = [];
  private subscribers: Set<(notifications: ServiceNotification[]) => void> = new Set();

  private constructor() {
    this.loadNotifications();
    this.setupServiceWorker();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async setupServiceWorker() {
    if ('serviceWorker' in navigator && typeof Notification !== 'undefined') {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
        });
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    }
  }

  async send(notification: Omit<ServiceNotification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    const newNotification: ServiceNotification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false
    };

    this.notifications.unshift(newNotification);
    this.notifySubscribers();
    await this.persistNotifications();

    // Show toast notification
    toast(notification.message, {
      icon: this.getIcon(notification.type),
      duration: 5000
    });

    // Show system notification if supported and permitted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.png'
      });
    }
  }

  private getIcon(type: ServiceNotification['type']) {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  }

  subscribe(callback: (notifications: ServiceNotification[]) => void): () => void {
    this.subscribers.add(callback);
    callback(this.notifications);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.notifications));
  }

  async markAsRead(id: string): Promise<void> {
    this.notifications = this.notifications.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification
    );
    this.notifySubscribers();
    await this.persistNotifications();
  }

  async markAllAsRead(): Promise<void> {
    this.notifications = this.notifications.map(notification => ({ ...notification, read: true }));
    this.notifySubscribers();
    await this.persistNotifications();
  }

  async clear(): Promise<void> {
    this.notifications = [];
    this.notifySubscribers();
    await this.persistNotifications();
  }

  private async persistNotifications(): Promise<void> {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error persisting notifications:', error);
    }
  }

  private async loadNotifications(): Promise<void> {
    try {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.notifySubscribers();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();