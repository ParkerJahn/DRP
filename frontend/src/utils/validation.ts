import DOMPurify from 'dompurify';

// Security constants for input limits
export const INPUT_LIMITS = {
  // Personal Information
  FIRST_NAME_MAX: 50,
  LAST_NAME_MAX: 50,
  DISPLAY_NAME_MAX: 100,
  
  // Contact Information
  EMAIL_MAX: 254, // RFC 5321 limit
  PHONE_MAX: 20,
  
  // Authentication
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 128,
  
  // Content
  MESSAGE_MAX: 2000,
  DESCRIPTION_MAX: 1000,
  TITLE_MAX: 200,
  SUBJECT_MAX: 200,
  
  // Payments & Packages
  PACKAGE_NAME_MAX: 100,
  PAYMENT_DESCRIPTION_MAX: 500,
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 99999.99,
  
  // Program & Training
  PROGRAM_NAME_MAX: 100,
  EXERCISE_NAME_MAX: 100,
  WORKOUT_NOTES_MAX: 1000,
  
  // Generic limits
  SHORT_TEXT_MAX: 100,
  MEDIUM_TEXT_MAX: 500,
  LONG_TEXT_MAX: 2000,
  
  // File uploads
  FILE_SIZE_MAX: 10 * 1024 * 1024, // 10MB
  
  // Rate limiting
  FORM_SUBMISSION_RATE: 5, // per minute
  LOGIN_ATTEMPTS_MAX: 10, // per hour
} as const;

// Common dangerous patterns to block
export const SECURITY_PATTERNS = {
  SQL_INJECTION: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b.*=.*\bOR\b)/i,
    /(\bAND\b.*=.*\bAND\b)/i,
  ],
  XSS_PATTERNS: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
  ],
  COMMAND_INJECTION: [
    /(\||&|;|`|\$\(|\${)/,
    /(\\x[0-9a-fA-F]{2})/,
    /(\.\.\/|\.\.\\)/,
  ],
} as const;

// Input sanitization and validation utilities
export class InputValidator {
  // Enhanced sanitization with length limits
  static sanitizeText(input: string, maxLength: number = INPUT_LIMITS.LONG_TEXT_MAX): string {
    if (!input) return '';
    
    // Basic sanitization
    let sanitized = input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>]/g, '') // Remove remaining < >
      .trim();
    
    // Check for security patterns
    if (InputValidator.containsSecurityThreats(sanitized)) {
      throw new Error('Input contains potentially dangerous content');
    }
    
    // Enforce length limit
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  // Check for security threats
  static containsSecurityThreats(input: string): boolean {
    const allPatterns = [
      ...SECURITY_PATTERNS.SQL_INJECTION,
      ...SECURITY_PATTERNS.XSS_PATTERNS,
      ...SECURITY_PATTERNS.COMMAND_INJECTION,
    ];
    
    return allPatterns.some(pattern => pattern.test(input));
  }

  // Sanitize HTML content to prevent XSS
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }

  // Validate and sanitize email with length limit
  static validateEmail(email: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!email) {
      return { isValid: false, sanitized: '', error: 'Email is required' };
    }

    if (email.length > INPUT_LIMITS.EMAIL_MAX) {
      return { isValid: false, sanitized: '', error: 'Email is too long' };
    }

    const sanitized = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(sanitized)) {
      return { isValid: false, sanitized: '', error: 'Please enter a valid email address' };
    }

    // Check for suspicious patterns
    if (sanitized.includes('javascript:') || sanitized.includes('data:')) {
      return { isValid: false, sanitized: '', error: 'Invalid email format' };
    }

    return { isValid: true, sanitized };
  }

  // Validate and sanitize password with enhanced security
  static validatePassword(password: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!password) {
      return { isValid: false, sanitized: '', error: 'Password is required' };
    }

    if (password.length < INPUT_LIMITS.PASSWORD_MIN) {
      return { isValid: false, sanitized: '', error: `Password must be at least ${INPUT_LIMITS.PASSWORD_MIN} characters long` };
    }

    if (password.length > INPUT_LIMITS.PASSWORD_MAX) {
      return { isValid: false, sanitized: '', error: 'Password is too long' };
    }

    // Check for security threats
    if (InputValidator.containsSecurityThreats(password)) {
      return { isValid: false, sanitized: '', error: 'Password contains invalid characters' };
    }

    // Check for common weak patterns
    if (password.toLowerCase() === 'password' || password.toLowerCase() === '123456') {
      return { isValid: false, sanitized: '', error: 'Please choose a stronger password' };
    }

    return { isValid: true, sanitized: password };
  }

  // Validate and sanitize names with strict limits
  static validateName(name: string, fieldName: string = 'Name'): { isValid: boolean; sanitized: string; error?: string } {
    if (!name) {
      return { isValid: false, sanitized: '', error: `${fieldName} is required` };
    }

    const maxLength = fieldName.toLowerCase().includes('first') || fieldName.toLowerCase().includes('last') 
      ? INPUT_LIMITS.FIRST_NAME_MAX 
      : INPUT_LIMITS.DISPLAY_NAME_MAX;

    try {
      const sanitized = InputValidator.sanitizeText(name, maxLength);
      
      if (sanitized.length < 2) {
        return { isValid: false, sanitized: '', error: `${fieldName} must be at least 2 characters long` };
      }

      // Only allow letters, spaces, hyphens, and apostrophes in names
      if (!/^[a-zA-Z\s\-']+$/.test(sanitized)) {
        return { isValid: false, sanitized: '', error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
      }

      return { isValid: true, sanitized };
    } catch {
      return { isValid: false, sanitized: '', error: `${fieldName} contains invalid content` };
    }
  }

  // Validate and sanitize phone numbers with strict format
  static validatePhone(phone: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!phone) {
      return { isValid: true, sanitized: '' }; // Phone is optional
    }

    if (phone.length > INPUT_LIMITS.PHONE_MAX) {
      return { isValid: false, sanitized: '', error: 'Phone number is too long' };
    }

    // Only allow digits, spaces, hyphens, parentheses, and plus sign
    const sanitized = phone.replace(/[^\d+\-()\s]/g, '').trim();
    
    if (sanitized.length < 10) {
      return { isValid: false, sanitized: '', error: 'Phone number is too short' };
    }

    return { isValid: true, sanitized };
  }

  // Validate and sanitize text content with configurable limits
  static validateTextContent(content: string, maxLength: number = INPUT_LIMITS.MESSAGE_MAX): { isValid: boolean; sanitized: string; error?: string } {
    if (!content) {
      return { isValid: false, sanitized: '', error: 'Content is required' };
    }

    try {
      const sanitized = InputValidator.sanitizeText(content, maxLength);
      
      if (sanitized.length < 1) {
        return { isValid: false, sanitized: '', error: 'Content cannot be empty' };
      }

      return { isValid: true, sanitized };
    } catch {
      return { isValid: false, sanitized: '', error: 'Content contains invalid characters' };
    }
  }

  // Validate and sanitize numeric inputs with strict bounds
  static validateNumber(value: string, min?: number, max?: number): { isValid: boolean; sanitized: number | null; error?: string } {
    if (!value) {
      return { isValid: false, sanitized: null, error: 'Value is required' };
    }

    // Remove non-numeric characters except decimal point and minus
    const sanitized = parseFloat(value.replace(/[^\d.-]/g, ''));
    
    if (isNaN(sanitized)) {
      return { isValid: false, sanitized: null, error: 'Please enter a valid number' };
    }

    const minValue = min ?? INPUT_LIMITS.AMOUNT_MIN;
    const maxValue = max ?? INPUT_LIMITS.AMOUNT_MAX;

    if (sanitized < minValue) {
      return { isValid: false, sanitized: null, error: `Value must be at least ${minValue}` };
    }

    if (sanitized > maxValue) {
      return { isValid: false, sanitized: null, error: `Value must be no more than ${maxValue}` };
    }

    return { isValid: true, sanitized };
  }

  // Validate and sanitize URLs with enhanced security
  static validateUrl(url: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!url) {
      return { isValid: true, sanitized: '' }; // URL is optional
    }

    if (url.length > INPUT_LIMITS.MEDIUM_TEXT_MAX) {
      return { isValid: false, sanitized: '', error: 'URL is too long' };
    }

    const sanitized = url.trim();
    
    // Check for security threats
    if (InputValidator.containsSecurityThreats(sanitized)) {
      return { isValid: false, sanitized: '', error: 'URL contains invalid content' };
    }
    
    try {
      const urlObj = new URL(sanitized);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, sanitized: '', error: 'Only HTTP and HTTPS URLs are allowed' };
      }
      return { isValid: true, sanitized };
    } catch {
      return { isValid: false, sanitized: '', error: 'Please enter a valid URL' };
    }
  }

  // Rate limiting helper with enhanced tracking
  static createRateLimiter(maxAttempts: number, windowMs: number) {
    const attempts = new Map<string, { count: number; resetTime: number; blocked: boolean }>();
    
    return (identifier: string): { allowed: boolean; remaining: number; resetTime: number } => {
      const now = Date.now();
      const userAttempts = attempts.get(identifier);
      
      if (!userAttempts || now > userAttempts.resetTime) {
        const resetTime = now + windowMs;
        attempts.set(identifier, { count: 1, resetTime, blocked: false });
        return { allowed: true, remaining: maxAttempts - 1, resetTime };
      }
      
      if (userAttempts.count >= maxAttempts) {
        userAttempts.blocked = true;
        return { allowed: false, remaining: 0, resetTime: userAttempts.resetTime };
      }
      
      userAttempts.count++;
      const remaining = maxAttempts - userAttempts.count;
      return { allowed: true, remaining, resetTime: userAttempts.resetTime };
    };
  }

  // Prevent common injection patterns (enhanced)
  static containsInjectionPatterns(input: string): boolean {
    return InputValidator.containsSecurityThreats(input);
  }

  // Validate file uploads
  static validateFile(file: File, allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif']): { isValid: boolean; error?: string } {
    if (!file) {
      return { isValid: false, error: 'No file selected' };
    }

    if (file.size > INPUT_LIMITS.FILE_SIZE_MAX) {
      return { isValid: false, error: 'File is too large (max 10MB)' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not allowed' };
    }

    // Check filename for security
    if (InputValidator.containsSecurityThreats(file.name)) {
      return { isValid: false, error: 'Filename contains invalid characters' };
    }

    return { isValid: true };
  }
}

// Form validation helpers
export const FormValidator = {
  // Validate a complete form object
  validateForm<T extends Record<string, unknown>>(
    formData: T,
    validationRules: Record<keyof T, (value: unknown) => { isValid: boolean; error?: string }>
  ): { isValid: boolean; errors: Partial<Record<keyof T, string>> } {
    const errors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const [field, value] of Object.entries(formData)) {
      const validator = validationRules[field as keyof T];
      if (validator) {
        const result = validator(value);
        if (!result.isValid) {
          errors[field as keyof T] = result.error;
          isValid = false;
        }
      }
    }

    return { isValid, errors };
  },

  // Debounce function for real-time validation
  debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
};

// Export individual functions for convenience
export const {
  sanitizeHtml,
  sanitizeText,
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateTextContent,
  validateNumber,
  validateUrl,
  createRateLimiter,
  containsInjectionPatterns,
  validateFile
} = InputValidator; 

// Validate current password (for password change)
export const validateCurrentPassword = (password: string): { isValid: boolean; sanitized: string; error?: string } => {
  if (!password || password.trim() === '') {
    return {
      isValid: false,
      error: 'Current password is required',
      sanitized: password.trim()
    };
  }

  return {
    isValid: true,
    sanitized: password
  };
}; 