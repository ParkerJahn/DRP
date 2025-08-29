import DOMPurify from 'dompurify';

// Input sanitization and validation utilities
export class InputValidator {
  // Sanitize HTML content to prevent XSS
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }

  // Sanitize plain text (remove HTML tags and dangerous characters)
  static sanitizeText(input: string): string {
    if (!input) return '';
    // Remove HTML tags and encode dangerous characters
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>]/g, '') // Remove remaining < >
      .trim();
  }

  // Validate and sanitize email
  static validateEmail(email: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!email) {
      return { isValid: false, sanitized: '', error: 'Email is required' };
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

  // Validate and sanitize password
  static validatePassword(password: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!password) {
      return { isValid: false, sanitized: '', error: 'Password is required' };
    }

    if (password.length < 6) {
      return { isValid: false, sanitized: '', error: 'Password must be at least 6 characters long' };
    }

    if (password.length > 128) {
      return { isValid: false, sanitized: '', error: 'Password is too long' };
    }

    // Check for common weak patterns
    if (password.toLowerCase() === 'password' || password.toLowerCase() === '123456') {
      return { isValid: false, sanitized: '', error: 'Please choose a stronger password' };
    }

    return { isValid: true, sanitized: password };
  }

  // Validate and sanitize names
  static validateName(name: string, fieldName: string = 'Name'): { isValid: boolean; sanitized: string; error?: string } {
    if (!name) {
      return { isValid: false, sanitized: '', error: `${fieldName} is required` };
    }

    const sanitized = InputValidator.sanitizeText(name).trim();
    
    if (sanitized.length < 2) {
      return { isValid: false, sanitized: '', error: `${fieldName} must be at least 2 characters long` };
    }

    if (sanitized.length > 50) {
      return { isValid: false, sanitized: '', error: `${fieldName} is too long` };
    }

    // Check for suspicious patterns
    if (/[<>{}()[\]\\]/.test(sanitized)) {
      return { isValid: false, sanitized: '', error: `${fieldName} contains invalid characters` };
    }

    return { isValid: true, sanitized };
  }

  // Validate and sanitize phone numbers
  static validatePhone(phone: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!phone) {
      return { isValid: true, sanitized: '' }; // Phone is optional
    }

    const sanitized = phone.replace(/[^\d+\-()\s]/g, '').trim();
    
    if (sanitized.length < 10) {
      return { isValid: false, sanitized: '', error: 'Phone number is too short' };
    }

    if (sanitized.length > 20) {
      return { isValid: false, sanitized: '', error: 'Phone number is too long' };
    }

    return { isValid: true, sanitized };
  }

  // Validate and sanitize text content (for messages, descriptions, etc.)
  static validateTextContent(content: string, maxLength: number = 1000): { isValid: boolean; sanitized: string; error?: string } {
    if (!content) {
      return { isValid: false, sanitized: '', error: 'Content is required' };
    }

    const sanitized = InputValidator.sanitizeText(content).trim();
    
    if (sanitized.length < 1) {
      return { isValid: false, sanitized: '', error: 'Content cannot be empty' };
    }

    if (sanitized.length > maxLength) {
      return { isValid: false, sanitized: '', error: `Content is too long (max ${maxLength} characters)` };
    }

    return { isValid: true, sanitized };
  }

  // Validate and sanitize numeric inputs
  static validateNumber(value: string, min?: number, max?: number): { isValid: boolean; sanitized: number | null; error?: string } {
    if (!value) {
      return { isValid: false, sanitized: null, error: 'Value is required' };
    }

    const sanitized = parseFloat(value.replace(/[^\d.-]/g, ''));
    
    if (isNaN(sanitized)) {
      return { isValid: false, sanitized: null, error: 'Please enter a valid number' };
    }

    if (min !== undefined && sanitized < min) {
      return { isValid: false, sanitized: null, error: `Value must be at least ${min}` };
    }

    if (max !== undefined && sanitized > max) {
      return { isValid: false, sanitized: null, error: `Value must be no more than ${max}` };
    }

    return { isValid: true, sanitized };
  }

  // Validate and sanitize URLs
  static validateUrl(url: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!url) {
      return { isValid: true, sanitized: '' }; // URL is optional
    }

    const sanitized = url.trim();
    
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

  // Rate limiting helper
  static createRateLimiter(maxAttempts: number, windowMs: number) {
    const attempts = new Map<string, { count: number; resetTime: number }>();
    
    return (identifier: string): boolean => {
      const now = Date.now();
      const userAttempts = attempts.get(identifier);
      
      if (!userAttempts || now > userAttempts.resetTime) {
        attempts.set(identifier, { count: 1, resetTime: now + windowMs });
        return true;
      }
      
      if (userAttempts.count >= maxAttempts) {
        return false;
      }
      
      userAttempts.count++;
      return true;
    };
  }

  // Prevent common injection patterns
  static containsInjectionPatterns(input: string): boolean {
    const dangerousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<script/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<form/i,
      /<input/i,
      /<textarea/i,
      /<select/i,
      /<button/i,
      /<link/i,
      /<meta/i,
      /<style/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(input));
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
  containsInjectionPatterns
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