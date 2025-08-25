// Rate limiting utilities for security
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number; blocked: boolean }> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
    blockDurationMs: number = 60 * 60 * 1000 // 1 hour
  ) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.blockDurationMs = blockDurationMs;
  }

  // Check if an action is allowed for a given identifier
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier);

    // If no previous attempts, allow
    if (!userAttempts) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs, blocked: false });
      return true;
    }

    // If currently blocked, check if block has expired
    if (userAttempts.blocked) {
      if (now > userAttempts.resetTime + this.blockDurationMs) {
        // Block expired, reset
        this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs, blocked: false });
        return true;
      }
      return false; // Still blocked
    }

    // If window has expired, reset
    if (now > userAttempts.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs, blocked: false });
      return true;
    }

    // Check if max attempts reached
    if (userAttempts.count >= this.maxAttempts) {
      // Block the user
      userAttempts.blocked = true;
      userAttempts.resetTime = now + this.blockDurationMs;
      return false;
    }

    // Increment attempt count
    userAttempts.count++;
    return true;
  }

  // Get remaining attempts for an identifier
  getRemainingAttempts(identifier: string): number {
    const userAttempts = this.attempts.get(identifier);
    if (!userAttempts) return this.maxAttempts;
    
    if (userAttempts.blocked) return 0;
    if (Date.now() > userAttempts.resetTime) return this.maxAttempts;
    
    return Math.max(0, this.maxAttempts - userAttempts.count);
  }

  // Get time until reset for an identifier
  getTimeUntilReset(identifier: string): number {
    const userAttempts = this.attempts.get(identifier);
    if (!userAttempts) return 0;
    
    const now = Date.now();
    if (userAttempts.blocked) {
      return Math.max(0, userAttempts.resetTime + this.blockDurationMs - now);
    }
    
    return Math.max(0, userAttempts.resetTime - now);
  }

  // Reset attempts for an identifier (useful for successful actions)
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  // Clear all rate limiting data (useful for testing or maintenance)
  clear(): void {
    this.attempts.clear();
  }

  // Get statistics for monitoring
  getStats(): { totalIdentifiers: number; blockedIdentifiers: number } {
    let blockedCount = 0;
    for (const attempts of this.attempts.values()) {
      if (attempts.blocked) blockedCount++;
    }
    
    return {
      totalIdentifiers: this.attempts.size,
      blockedIdentifiers: blockedCount
    };
  }
}

// Specialized rate limiters for different use cases
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000, 60 * 60 * 1000); // 5 attempts per 15 min, block for 1 hour
export const contactFormRateLimiter = new RateLimiter(3, 60 * 60 * 1000, 24 * 60 * 60 * 1000); // 3 attempts per hour, block for 24 hours
export const messageRateLimiter = new RateLimiter(20, 60 * 1000, 5 * 60 * 1000); // 20 messages per minute, block for 5 minutes
export const apiRateLimiter = new RateLimiter(100, 60 * 1000, 10 * 60 * 1000); // 100 API calls per minute, block for 10 minutes

// Utility function to format time remaining
export const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) return 'now';
  
  const minutes = Math.floor(ms / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

// Hook for React components to use rate limiting
export const useRateLimit = (limiter: RateLimiter, identifier: string) => {
  const isAllowed = limiter.isAllowed(identifier);
  const remainingAttempts = limiter.getRemainingAttempts(identifier);
  const timeUntilReset = limiter.getTimeUntilReset(identifier);
  
  const reset = () => limiter.reset(identifier);
  
  return {
    isAllowed,
    remainingAttempts,
    timeUntilReset,
    reset,
    formatTimeRemaining: () => formatTimeRemaining(timeUntilReset)
  };
}; 