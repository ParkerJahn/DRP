// Enhanced security utilities for DRP Workshop
import { v4 as uuidv4 } from 'uuid';

// CSRF Protection
export class CSRFProtection {
  private static readonly TOKEN_KEY = 'csrf_token';
  private static readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  // Generate a new CSRF token
  static generateToken(): string {
    const token = uuidv4();
    const expiry = Date.now() + this.TOKEN_EXPIRY;
    
    // Store token with expiry
    const tokenData = { token, expiry };
    sessionStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));
    
    return token;
  }

  // Get current valid token
  static getToken(): string | null {
    const tokenData = sessionStorage.getItem(this.TOKEN_KEY);
    if (!tokenData) return null;
    
    try {
      const { token, expiry } = JSON.parse(tokenData);
      if (Date.now() > expiry) {
        sessionStorage.removeItem(this.TOKEN_KEY);
        return null;
      }
      return token;
    } catch {
      sessionStorage.removeItem(this.TOKEN_KEY);
      return null;
    }
  }

  // Validate a token
  static validateToken(token: string): boolean {
    const currentToken = this.getToken();
    return currentToken === token;
  }

  // Refresh token (for long-running sessions)
  static refreshToken(): string {
    const currentToken = this.getToken();
    if (currentToken) {
      // Extend existing token
      const expiry = Date.now() + this.TOKEN_EXPIRY;
      const tokenData = { token: currentToken, expiry };
      sessionStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));
      return currentToken;
    }
    return this.generateToken();
  }

  // Clear token (for logout)
  static clearToken(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
  }
}

// Security Headers and CSP
export class SecurityHeaders {
  // Content Security Policy
  static readonly CSP_POLICY = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Vite dev mode
      "'unsafe-eval'",   // Required for Vite dev mode
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind CSS
      'https://fonts.googleapis.com'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:'
    ],
    'img-src': [
      "'self'",
      'data:',
      'https:',
      'blob:'
    ],
    'connect-src': [
      "'self'",
      'https://firebase.googleapis.com',
      'https://identitytoolkit.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://www.googleapis.com',
      'wss://localhost:*', // WebSocket for dev
      'ws://localhost:*'   // WebSocket for dev
    ],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  };

  // Generate CSP header string
  static generateCSPHeader(): string {
    return Object.entries(this.CSP_POLICY)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(' ')}`;
      })
      .join('; ');
  }

  // Security headers for API responses
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': this.generateCSPHeader()
    };
  }
}

// Input Sanitization Enhancement
export class EnhancedSanitizer {
  // Remove potentially dangerous patterns
  static sanitizeAdvanced(input: string): string {
    if (!input) return '';
    
    return input
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove dangerous characters
      .replace(/[<>{}()[\]\\]/g, '')
      // Remove control characters
      .replace(/[\x7F]/g, '')
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Remove bidirectional override characters
      .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Validate file uploads
  static validateFileUpload(file: File, allowedTypes: string[], maxSize: number): {
    isValid: boolean;
    error?: string;
  } {
    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`
      };
    }

    // Check file type
    const fileType = file.type.toLowerCase();
    if (!allowedTypes.includes(fileType)) {
      return {
        isValid: false,
        error: `File type ${fileType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const allowedExtensions = allowedTypes.map(type => {
      if (type === 'image/jpeg') return '.jpg,.jpeg';
      if (type === 'image/png') return '.png';
      if (type === 'application/pdf') return '.pdf';
      return type.split('/')[1];
    }).flat();

    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    if (!allowedExtensions.some(ext => fileExtension.includes(ext))) {
      return {
        isValid: false,
        error: `File extension ${fileExtension} is not allowed`
      };
    }

    return { isValid: true };
  }

  // Sanitize file names
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 100); // Limit length
  }
}

// Session Security
export class SessionSecurity {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout

  // Check if session is about to expire
  static isSessionExpiring(): boolean {
    const lastActivity = sessionStorage.getItem('last_activity');
    if (!lastActivity) return false;
    
    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
    return timeSinceLastActivity > (this.SESSION_TIMEOUT - this.WARNING_TIME);
  }

  // Check if session has expired
  static isSessionExpired(): boolean {
    const lastActivity = sessionStorage.getItem('last_activity');
    if (!lastActivity) return true;
    
    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
    return timeSinceLastActivity > this.SESSION_TIMEOUT;
  }

  // Update session activity
  static updateActivity(): void {
    sessionStorage.setItem('last_activity', Date.now().toString());
  }

  // Clear session data
  static clearSession(): void {
    sessionStorage.clear();
    localStorage.removeItem('theme');
    // Keep only essential data
  }

  // Initialize session security
  static initialize(): void {
    this.updateActivity();
    
    // Set up activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), { passive: true });
    });

    // Check session status periodically
    setInterval(() => {
      if (this.isSessionExpired()) {
        // Redirect to login or show session expired message
        window.location.href = '/auth?expired=true';
      }
    }, 60000); // Check every minute
  }
}

// Audit Logging
export class SecurityAudit {
  private static readonly MAX_LOG_SIZE = 1000;
  private static logs: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'security';
    message: string;
    userId?: string;
    action?: string;
    ip?: string;
    userAgent?: string;
  }> = [];

  // Log security event
  static logSecurityEvent(
    level: 'info' | 'warn' | 'error' | 'security',
    message: string,
    userId?: string,
    action?: string
  ): void {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      userId,
      action,
      ip: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    this.logs.push(logEntry);

    // Keep log size manageable
    if (this.logs.length > this.MAX_LOG_SIZE) {
      this.logs = this.logs.slice(-this.MAX_LOG_SIZE);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[SECURITY] ${level.toUpperCase()}: ${message}`, logEntry);
    }

    // In production, you'd send this to a logging service
    if (import.meta.env.PROD) {
      // this.sendToLoggingService(logEntry);
    }
  }

  // Get client IP (would be set by your backend)
  private static getClientIP(): string {
    // This would typically come from your backend
    return 'unknown';
  }

  // Get audit logs
  static getLogs(): typeof this.logs {
    return [...this.logs];
  }

  // Clear logs
  static clearLogs(): void {
    this.logs = [];
  }
} 