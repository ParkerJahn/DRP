// Password change tracking utilities
export class PasswordChangeTracker {
  private static readonly STORAGE_KEY = 'password_change_completed';

  // Mark that a user has completed password change
  static markPasswordChangeCompleted(userId: string): void {
    try {
      const completedUsers = this.getCompletedUsers();
      completedUsers[userId] = {
        completed: true,
        timestamp: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(completedUsers));
      
      console.log(`✅ Password change completed for user: ${userId}`);
    } catch (error) {
      console.error('Error marking password change completed:', error);
    }
  }

  // Check if a user has completed password change
  static hasCompletedPasswordChange(userId: string): boolean {
    try {
      const completedUsers = this.getCompletedUsers();
      const userData = completedUsers[userId];
      
      if (!userData) {
        return false;
      }

      // Check if completion was recent (within last 24 hours)
      const hoursSinceCompletion = (Date.now() - userData.timestamp) / (1000 * 60 * 60);
      return userData.completed && hoursSinceCompletion < 24;
    } catch (error) {
      console.error('Error checking password change completion:', error);
      return false;
    }
  }

  // Get all users who have completed password changes
  private static getCompletedUsers(): Record<string, { completed: boolean; timestamp: number }> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error getting completed users:', error);
      return {};
    }
  }

  // Clear completion status for a user (useful for testing)
  static clearPasswordChangeCompletion(userId: string): void {
    try {
      const completedUsers = this.getCompletedUsers();
      delete completedUsers[userId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(completedUsers));
      console.log(`🗑️ Cleared password change completion for user: ${userId}`);
    } catch (error) {
      console.error('Error clearing password change completion:', error);
    }
  }

  // Clear all completion data (useful for testing)
  static clearAllCompletions(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Cleared all password change completions');
    } catch (error) {
      console.error('Error clearing all completions:', error);
    }
  }

  // Get completion status for debugging
  static getDebugInfo(): Record<string, unknown> {
    try {
      const completedUsers = this.getCompletedUsers();
      return {
        completedUsers,
        totalCompleted: Object.keys(completedUsers).length,
        storageKey: this.STORAGE_KEY
      };
    } catch (error) {
      console.error('Error getting debug info:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
} 