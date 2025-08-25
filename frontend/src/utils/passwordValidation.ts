// Comprehensive password validation system
export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  maxScore: number;
  strength: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  issues: string[];
  recommendations: string[];
  meetsStandards: boolean;
}

export class PasswordValidator {
  // Current security standards (can be easily updated)
  private static readonly CURRENT_STANDARDS = {
    minLength: 6, // Current debug setting
    productionMinLength: 8, // Production setting
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    blockCommonPasswords: true,
    blockSequentialPatterns: true,
    blockRepeatedChars: true
  };

  // Common weak passwords to block
  private static readonly COMMON_WEAK_PASSWORDS = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
    'dragon', 'master', 'football', 'baseball', 'sunshine',
    'princess', 'qwertyuiop', 'admin123', 'root', 'guest',
    'test', 'demo', 'sample', 'example', 'temp', 'tmp'
  ];

  // Validate password against current standards
  static validatePassword(password: string): PasswordValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 0;
    const maxScore = 6;

    // Length check
    if (password.length < this.CURRENT_STANDARDS.minLength) {
      issues.push(`Password is too short (${password.length} characters, minimum ${this.CURRENT_STANDARDS.minLength})`);
      recommendations.push(`Increase password length to at least ${this.CURRENT_STANDARDS.minLength} characters`);
    } else if (password.length < this.CURRENT_STANDARDS.productionMinLength) {
      issues.push(`Password length (${password.length} characters) is below production standards (${this.CURRENT_STANDARDS.productionMinLength})`);
      recommendations.push(`Consider increasing password length to ${this.CURRENT_STANDARDS.productionMinLength}+ characters for production`);
      score += 1; // Partial credit for meeting current standards
    } else {
      score += 1;
    }

    // Uppercase check
    if (this.CURRENT_STANDARDS.requireUppercase && !/[A-Z]/.test(password)) {
      issues.push('Missing uppercase letters');
      recommendations.push('Include at least one uppercase letter (A-Z)');
    } else {
      score += 1;
    }

    // Lowercase check
    if (this.CURRENT_STANDARDS.requireLowercase && !/[a-z]/.test(password)) {
      issues.push('Missing lowercase letters');
      recommendations.push('Include at least one lowercase letter (a-z)');
    } else {
      score += 1;
    }

    // Number check
    if (this.CURRENT_STANDARDS.requireNumbers && !/\d/.test(password)) {
      issues.push('Missing numbers');
      recommendations.push('Include at least one number (0-9)');
    } else {
      score += 1;
    }

    // Special character check
    if (this.CURRENT_STANDARDS.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      issues.push('Missing special characters');
      recommendations.push('Include at least one special character (!@#$%^&* etc.)');
    } else {
      score += 1;
    }

    // Common weak password check
    if (this.CURRENT_STANDARDS.blockCommonPasswords && this.COMMON_WEAK_PASSWORDS.includes(password.toLowerCase())) {
      issues.push('Password is a commonly used weak password');
      recommendations.push('Choose a unique password that\'s not commonly used');
      score = Math.max(0, score - 2); // Heavy penalty for common passwords
    }

    // Sequential character check
    if (this.CURRENT_STANDARDS.blockSequentialPatterns && this.hasSequentialChars(password)) {
      issues.push('Password contains sequential characters (e.g., 123, abc)');
      recommendations.push('Avoid sequential patterns in your password');
      score = Math.max(0, score - 1);
    }

    // Repeated character check
    if (this.CURRENT_STANDARDS.blockRepeatedChars && this.hasRepeatedChars(password)) {
      issues.push('Password contains repeated characters');
      recommendations.push('Avoid repeating the same character multiple times');
      score = Math.max(0, score - 1);
    }

    // Determine strength and validity
    const strength = this.getStrengthLabel(score);
    const meetsStandards = score >= 4 && password.length >= this.CURRENT_STANDARDS.minLength;

    return {
      isValid: meetsStandards,
      score,
      maxScore,
      strength,
      issues,
      recommendations,
      meetsStandards
    };
  }

  // Check if password meets current security standards
  static meetsCurrentStandards(password: string): boolean {
    const result = this.validatePassword(password);
    return result.meetsStandards;
  }

  // Check if password meets production security standards
  static meetsProductionStandards(password: string): boolean {
    const result = this.validatePassword(password);
    return result.meetsStandards && password.length >= this.CURRENT_STANDARDS.productionMinLength;
  }

  // Get password strength label
  private static getStrengthLabel(score: number): PasswordValidationResult['strength'] {
    if (score === 0) return 'Very Weak';
    if (score <= 1) return 'Weak';
    if (score <= 2) return 'Fair';
    if (score <= 3) return 'Good';
    if (score <= 4) return 'Strong';
    return 'Very Strong';
  }

  // Check for sequential characters
  private static hasSequentialChars(password: string): boolean {
    const sequences = [
      '123', '234', '345', '456', '789',
      'abc', 'bcd', 'cde', 'def', 'efg',
      'qwe', 'wer', 'ert', 'rty', 'tyu'
    ];
    
    return sequences.some(seq => password.toLowerCase().includes(seq));
  }

  // Check for repeated characters
  private static hasRepeatedChars(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
        return true;
      }
    }
    return false;
  }

  // Get security recommendations
  static getSecurityRecommendations(password: string): string[] {
    const result = this.validatePassword(password);
    return result.recommendations;
  }

  // Update security standards (for future use)
  static updateStandards(newStandards: Partial<typeof PasswordValidator.CURRENT_STANDARDS>): void {
    Object.assign(this.CURRENT_STANDARDS, newStandards);
    console.log('🔒 Password security standards updated:', this.CURRENT_STANDARDS);
  }
} 