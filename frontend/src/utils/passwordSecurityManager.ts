import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SecurityAudit } from './security';

/**
 * Password Security Manager
 * Handles setting and clearing password change requirements for users
 */
export class PasswordSecurityManager {
  
  /**
   * Mark a user as requiring a password change
   * Use this for security events, admin actions, or when passwords don't meet standards
   */
  static async requirePasswordChange(userId: string, reason: string = 'security_requirement'): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        passwordChangeRequired: true,
        updatedAt: new Date()
      });
      
      // Log the security event
      SecurityAudit.logSecurityEvent('security', `Password change required: ${reason}`, userId, 'password_change_required');
      
      console.log(`🔒 Password change required for user ${userId}: ${reason}`);
      return true;
    } catch (error) {
      console.error('Error requiring password change:', error);
      SecurityAudit.logSecurityEvent('error', `Failed to require password change: ${error}`, userId, 'password_change_requirement_failed');
      return false;
    }
  }
  
  /**
   * Clear the password change requirement for a user
   * Use this after a user successfully changes their password
   */
  static async clearPasswordChangeRequirement(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        passwordChangeRequired: false,
        updatedAt: new Date()
      });
      
      // Log the security event
      SecurityAudit.logSecurityEvent('info', 'Password change requirement cleared', userId, 'password_change_requirement_cleared');
      
      console.log(`✅ Password change requirement cleared for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error clearing password change requirement:', error);
      SecurityAudit.logSecurityEvent('error', `Failed to clear password change requirement: ${error}`, userId, 'password_change_requirement_clear_failed');
      return false;
    }
  }
  
  /**
   * Check if a user currently requires a password change
   */
  static async checkPasswordChangeRequirement(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData?.passwordChangeRequired === true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking password change requirement:', error);
      return false;
    }
  }
  
  /**
   * Set password change requirement for multiple users (e.g., after security policy update)
   */
  static async requirePasswordChangeForMultipleUsers(userIds: string[], reason: string = 'security_policy_update'): Promise<{
    success: string[];
    failed: string[];
  }> {
    const results = {
      success: [] as string[],
      failed: [] as string[]
    };
    
    for (const userId of userIds) {
      const success = await this.requirePasswordChange(userId, reason);
      if (success) {
        results.success.push(userId);
      } else {
        results.failed.push(userId);
      }
    }
    
    console.log(`🔒 Bulk password change requirement: ${results.success.length} success, ${results.failed.length} failed`);
    return results;
  }
  
  /**
   * Set password change requirement for all users of a specific role
   * Use this when updating security policies for specific user types
   */
  static async requirePasswordChangeForRole(proId: string, role: string, reason: string = 'role_security_update'): Promise<{
    success: string[];
    failed: string[];
  }> {
    try {
      // This would require a query to get all users with the specific role
      // For now, we'll return an empty result and log that this feature needs implementation
      console.log(`⚠️ Role-based password change requirement not yet implemented for ${role} users in ${proId}`);
      
      SecurityAudit.logSecurityEvent('info', `Role-based password change requirement requested for ${role}`, proId, 'role_password_change_requested');
      
      return {
        success: [],
        failed: []
      };
    } catch (error) {
      console.error('Error requiring password change for role:', error);
      return {
        success: [],
        failed: [role]
      };
    }
  }
} 