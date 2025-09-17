// Input Security Utilities - for securing existing plain inputs
import { InputValidator, INPUT_LIMITS } from './validation';
import { contactFormRateLimiter, messageRateLimiter, apiRateLimiter } from './rateLimit';
import { SecurityAudit } from './security';

export interface SecureInputConfig {
  maxLength?: number;
  minLength?: number;
  required?: boolean;
  type?: 'text' | 'email' | 'password' | 'phone' | 'number' | 'url' | 'search' | 'exercise' | 'message';
  rateLimit?: 'form' | 'message' | 'api' | 'search' | 'none';
  allowEmpty?: boolean;
  customValidator?: (value: string) => { isValid: boolean; error?: string };
}

export interface SecureInputResult {
  isValid: boolean;
  sanitizedValue: string;
  error?: string;
  rateLimited?: boolean;
  remainingAttempts?: number;
}

export class InputSecurityManager {
  // Secure an input value with validation, sanitization, and rate limiting
  static secureInput(
    value: string, 
    identifier: string, 
    config: SecureInputConfig = {}
  ): SecureInputResult {
    const {
      maxLength = INPUT_LIMITS.SHORT_TEXT_MAX,
      minLength = 0,
      required = false,
      type = 'text',
      rateLimit = 'none',
      allowEmpty = !required,
      customValidator
    } = config;

    // 1. Rate limiting check
    if (rateLimit !== 'none') {
      const rateLimiter = this.getRateLimiter(rateLimit);
      if (!rateLimiter.isAllowed(identifier)) {
        SecurityAudit.logSecurityEvent('warn', `Rate limit exceeded for ${type} input`, identifier, 'rate_limit_exceeded');
        return {
          isValid: false,
          sanitizedValue: '',
          error: 'Too many attempts. Please try again later.',
          rateLimited: true,
          remainingAttempts: rateLimiter.getRemainingAttempts(identifier)
        };
      }
    }

    // 2. Empty value check
    if (!value || value.trim().length === 0) {
      if (allowEmpty) {
        return { isValid: true, sanitizedValue: '' };
      }
      return { isValid: false, sanitizedValue: '', error: 'This field is required' };
    }

    // 3. Length validation
    if (value.length > maxLength) {
      return {
        isValid: false,
        sanitizedValue: value.substring(0, maxLength),
        error: `Maximum ${maxLength} characters allowed`
      };
    }

    if (value.length < minLength) {
      return {
        isValid: false,
        sanitizedValue: value,
        error: `Minimum ${minLength} characters required`
      };
    }

    // 4. Type-specific validation and sanitization
    let validationResult: { isValid: boolean; sanitized: string; error?: string };

    switch (type) {
      case 'email':
        validationResult = InputValidator.validateEmail(value);
        break;
      case 'password':
        validationResult = InputValidator.validatePassword(value);
        break;
      case 'phone':
        validationResult = InputValidator.validatePhone(value);
        break;
      case 'url':
        validationResult = InputValidator.validateUrl(value);
        break;
      case 'number': {
        const numberResult = InputValidator.validateNumber(value);
        validationResult = {
          isValid: numberResult.isValid,
          sanitized: numberResult.sanitized?.toString() || '',
          error: numberResult.error
        };
        break;
      }
      case 'exercise':
        // Exercise names need special handling
        validationResult = this.validateExerciseName(value);
        break;
      case 'search':
        // Search queries need sanitization but are more permissive
        validationResult = this.validateSearchQuery(value, maxLength);
        break;
      case 'message':
        // Messages need comprehensive sanitization
        validationResult = this.validateMessage(value, maxLength);
        break;
      case 'text':
      default:
        validationResult = InputValidator.validateTextContent(value, maxLength);
        break;
    }

    // 5. Custom validation if provided
    if (validationResult.isValid && customValidator) {
      const customResult = customValidator(validationResult.sanitized);
      if (!customResult.isValid) {
        validationResult = {
          isValid: false,
          sanitized: validationResult.sanitized,
          error: customResult.error || 'Custom validation failed'
        };
      }
    }

    // 6. Security audit log for invalid inputs
    if (!validationResult.isValid) {
      SecurityAudit.logSecurityEvent('warn', `Invalid ${type} input detected`, identifier, 'invalid_input');
    }

    return {
      isValid: validationResult.isValid,
      sanitizedValue: validationResult.sanitized,
      error: validationResult.error,
      rateLimited: false
    };
  }

  // Exercise name validation with fitness-specific rules
  private static validateExerciseName(value: string): { isValid: boolean; sanitized: string; error?: string } {
    // Sanitize the input
    const sanitized = InputValidator.sanitizeText(value, INPUT_LIMITS.EXERCISE_NAME_MAX);
    
    // Check for minimum length
    if (sanitized.length < 2) {
      return { isValid: false, sanitized, error: 'Exercise name must be at least 2 characters' };
    }

    // Check for valid exercise name patterns (letters, numbers, spaces, hyphens, parentheses)
    const exerciseNameRegex = /^[a-zA-Z0-9\s\-().']+$/;
    if (!exerciseNameRegex.test(sanitized)) {
      return { isValid: false, sanitized, error: 'Exercise name contains invalid characters' };
    }

    // Check for injection patterns
    if (InputValidator.containsSecurityThreats(sanitized)) {
      return { isValid: false, sanitized: '', error: 'Invalid characters detected' };
    }

    return { isValid: true, sanitized };
  }

  // Search query validation - more permissive but still secure
  private static validateSearchQuery(value: string, maxLength: number): { isValid: boolean; sanitized: string; error?: string } {
    // Sanitize but preserve search-friendly characters
    let sanitized = value.trim();
    
    // Remove dangerous patterns but allow some special characters for search
    sanitized = sanitized.replace(/[<>"';&|`]/g, '');
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Check for injection patterns
    if (InputValidator.containsSecurityThreats(sanitized)) {
      return { isValid: false, sanitized: '', error: 'Invalid search query' };
    }

    return { isValid: true, sanitized };
  }

  // Message validation with enhanced sanitization
  private static validateMessage(value: string, maxLength: number): { isValid: boolean; sanitized: string; error?: string } {
    // Sanitize the message
    const sanitized = InputValidator.sanitizeText(value, maxLength);
    
    // Check minimum length for messages
    if (sanitized.length < 1) {
      return { isValid: false, sanitized, error: 'Message cannot be empty' };
    }

    // Check for spam patterns
    if (this.containsSpamPatterns(sanitized)) {
      return { isValid: false, sanitized: '', error: 'Message contains inappropriate content' };
    }

    return { isValid: true, sanitized };
  }

  // Check for common spam patterns
  private static containsSpamPatterns(text: string): boolean {
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters (10+ times)
      /http[s]?:\/\/[^\s]{3,}/gi, // URLs (can be customized based on needs)
      /(.{1,10})\1{5,}/, // Repeated short patterns
    ];

    return spamPatterns.some(pattern => pattern.test(text));
  }

  // Get appropriate rate limiter
  private static getRateLimiter(type: string) {
    switch (type) {
      case 'form':
        return contactFormRateLimiter;
      case 'message':
        return messageRateLimiter;
      case 'api':
        return apiRateLimiter;
      case 'search':
        // Create a more permissive rate limiter for search
        return messageRateLimiter; // Reuse message limiter for now
      default:
        return contactFormRateLimiter;
    }
  }

  // React hook for secure input handling
  static useSecureInput(config: SecureInputConfig = {}) {
    return (value: string, identifier: string) => {
      return this.secureInput(value, identifier, config);
    };
  }

  // Higher-order component for securing existing input change handlers
  static secureChangeHandler(
    originalHandler: (value: string) => void,
    identifier: string,
    config: SecureInputConfig = {},
    onValidationError?: (error: string) => void
  ) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const result = this.secureInput(event.target.value, identifier, config);
      
      if (result.isValid) {
        originalHandler(result.sanitizedValue);
      } else if (onValidationError) {
        onValidationError(result.error || 'Invalid input');
      }
    };
  }

  // Preset configurations for common input types
  static presets = {
    exerciseName: {
      type: 'exercise' as const,
      maxLength: INPUT_LIMITS.EXERCISE_NAME_MAX,
      minLength: 2,
      required: true,
      rateLimit: 'form' as const
    },
    searchQuery: {
      type: 'search' as const,
      maxLength: INPUT_LIMITS.SHORT_TEXT_MAX,
      required: false,
      rateLimit: 'search' as const,
      allowEmpty: true
    },
    message: {
      type: 'message' as const,
      maxLength: INPUT_LIMITS.MESSAGE_MAX,
      minLength: 1,
      required: true,
      rateLimit: 'message' as const
    },
    programTitle: {
      type: 'text' as const,
      maxLength: INPUT_LIMITS.PROGRAM_NAME_MAX,
      minLength: 3,
      required: true,
      rateLimit: 'form' as const
    },
    blockName: {
      type: 'text' as const,
      maxLength: INPUT_LIMITS.SHORT_TEXT_MAX,
      minLength: 1,
      required: true,
      rateLimit: 'form' as const
    }
  };
}

// Export convenience functions
export const secureInput = InputSecurityManager.secureInput.bind(InputSecurityManager);
export const secureChangeHandler = InputSecurityManager.secureChangeHandler.bind(InputSecurityManager);
export const useSecureInput = InputSecurityManager.useSecureInput.bind(InputSecurityManager);
export const inputPresets = InputSecurityManager.presets;

// Export for React components
export default InputSecurityManager; 