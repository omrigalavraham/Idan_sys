import { UserModel } from '../models/User.js';
import { SessionModel } from '../models/Session.js';
import { SystemClientModel } from '../models/SystemClient.js';

/**
 * Job to clean up deleted users and expired sessions
 * Runs automatically every day at 2:00 AM
 */
export class CleanupJobs {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start the cleanup jobs
   */
  static start(): void {
    if (this.cleanupInterval) {
      console.log('Cleanup jobs already running');
      return;
    }

    console.log('Starting cleanup jobs...');
    
    // Run cleanup immediately on startup
    this.runCleanup();
    
    // Schedule cleanup to run daily at 2:00 AM
    this.scheduleDailyCleanup();
    
    console.log('Cleanup jobs started successfully');
  }

  /**
   * Stop the cleanup jobs
   */
  static stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Cleanup jobs stopped');
    }
  }

  /**
   * Schedule daily cleanup at 2:00 AM
   */
  private static scheduleDailyCleanup(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 2:00 AM

    const msUntilTomorrow = tomorrow.getTime() - now.getTime();
    
    // Set timeout for first run tomorrow
    setTimeout(() => {
      this.runCleanup();
      
      // Then set interval for every 24 hours
      this.cleanupInterval = setInterval(() => {
        this.runCleanup();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
    }, msUntilTomorrow);
    
    console.log(`Next cleanup scheduled for: ${tomorrow.toISOString()}`);
  }

  /**
   * Run the cleanup process
   */
  private static async runCleanup(): Promise<void> {
    if (this.isRunning) {
      console.log('Cleanup already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      console.log('Starting cleanup process...');
      
      // Clean up deleted users (more than 1 month old)
      const deletedUsersCount = await UserModel.cleanupDeletedUsers();
      console.log(`Cleaned up ${deletedUsersCount} deleted users`);
      
      // Clean up deleted system clients (more than 1 month old)
      const deletedClientsCount = await SystemClientModel.cleanupDeletedClients();
      console.log(`Cleaned up ${deletedClientsCount} deleted system clients`);
      
      // Clean up expired sessions
      const expiredSessionsCount = await SessionModel.cleanupExpired();
      console.log(`Cleaned up ${expiredSessionsCount} expired sessions`);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.log(`Cleanup completed successfully in ${duration}ms`);
      console.log(`- Deleted users: ${deletedUsersCount}`);
      console.log(`- Deleted system clients: ${deletedClientsCount}`);
      console.log(`- Expired sessions: ${expiredSessionsCount}`);
      
    } catch (error) {
      console.error('Error during cleanup process:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger cleanup (for testing or admin use)
   */
  static async triggerCleanup(): Promise<{
    deletedUsers: number;
    deletedSystemClients: number;
    expiredSessions: number;
    duration: number;
  }> {
    if (this.isRunning) {
      throw new Error('Cleanup is already running');
    }

    const startTime = new Date();
    
    try {
      console.log('Manual cleanup triggered...');
      
      const deletedUsersCount = await UserModel.cleanupDeletedUsers();
      const deletedClientsCount = await SystemClientModel.cleanupDeletedClients();
      const expiredSessionsCount = await SessionModel.cleanupExpired();
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      return {
        deletedUsers: deletedUsersCount,
        deletedSystemClients: deletedClientsCount,
        expiredSessions: expiredSessionsCount,
        duration
      };
      
    } catch (error) {
      console.error('Error during manual cleanup:', error);
      throw error;
    }
  }

  /**
   * Get cleanup status
   */
  static getStatus(): {
    isRunning: boolean;
    hasInterval: boolean;
    nextRun?: Date;
  } {
    return {
      isRunning: this.isRunning,
      hasInterval: this.cleanupInterval !== null,
      nextRun: this.cleanupInterval ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined
    };
  }
}
