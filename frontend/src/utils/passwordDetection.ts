// Password strength detection utilities
export interface PasswordAnalysis {
  isWeak: boolean;
  score: number;
  maxScore: number;
  issues: string[];
  recommendations: string[];
}

export class PasswordDetector {
  // Minimum requirements for production
  private static readonly PRODUCTION_MIN_LENGTH = 8;
  // Current minimum for debugging
  private static readonly CURRENT_MIN_LENGTH = 6;
  
  // Common weak passwords to block
  private static readonly COMMON_WEAK_PASSWORDS = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
    'dragon', 'master', 'football', 'baseball', 'sunshine',
    'princess', 'qwertyuiop', 'admin123', 'root', 'guest'
  ];

  // Analyze password strength
  static analyzePassword(password: string): PasswordAnalysis {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 0;
    const maxScore = 5;

    // Length check
    if (password.length < this.CURRENT_MIN_LENGTH) {
      issues.push(`Password is too short (${password.length} characters, minimum ${this.CURRENT_MIN_LENGTH})`);
      recommendations.push(`Increase password length to at least ${this.CURRENT_MIN_LENGTH} characters`);
    } else if (password.length < this.PRODUCTION_MIN_LENGTH) {
      issues.push(`Password length (${password.length} characters) is below production standards (${this.PRODUCTION_MIN_LENGTH})`);
      recommendations.push(`Consider increasing password length to ${this.PRODUCTION_MIN_LENGTH}+ characters for production`);
    } else {
      score += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      issues.push('Missing uppercase letters');
      recommendations.push('Include at least one uppercase letter (A-Z)');
    } else {
      score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      issues.push('Missing lowercase letters');
      recommendations.push('Include at least one lowercase letter (a-z)');
    } else {
      score += 1;
    }

    // Number check
    if (!/\d/.test(password)) {
      issues.push('Missing numbers');
      recommendations.push('Include at least one number (0-9)');
    } else {
      score += 1;
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      issues.push('Missing special characters');
      recommendations.push('Include at least one special character (!@#$%^&* etc.)');
    } else {
      score += 1;
    }

    // Common weak password check
    if (this.COMMON_WEAK_PASSWORDS.includes(password.toLowerCase())) {
      issues.push('Password is a commonly used weak password');
      recommendations.push('Choose a unique password that\'s not commonly used');
      score = Math.max(0, score - 2); // Penalize heavily for common passwords
    }

    // Sequential character check
    if (this.hasSequentialChars(password)) {
      issues.push('Password contains sequential characters (e.g., 123, abc)');
      recommendations.push('Avoid sequential patterns in your password');
      score = Math.max(0, score - 1);
    }

    // Repeated character check
    if (this.hasRepeatedChars(password)) {
      issues.push('Password contains repeated characters');
      recommendations.push('Avoid repeating the same character multiple times');
      score = Math.max(0, score - 1);
    }

    // Determine if password is weak
    const isWeak = score < 3 || issues.length > 2;

    return {
      isWeak,
      score,
      maxScore,
      issues,
      recommendations
    };
  }

  // Check if password meets current security standards
  static meetsCurrentStandards(password: string): boolean {
    const analysis = this.analyzePassword(password);
    return !analysis.isWeak && analysis.score >= 3;
  }

  // Check if password meets production security standards
  static meetsProductionStandards(password: string): boolean {
    const analysis = this.analyzePassword(password);
    return !analysis.isWeak && analysis.score >= 4 && password.length >= this.PRODUCTION_MIN_LENGTH;
  }

  // Get password strength label
  static getStrengthLabel(score: number): string {
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

  // Check if user needs mandatory password change
  static needsMandatoryChange(password: string): boolean {
    // For debugging: only require change if password is very weak
    const analysis = this.analyzePassword(password);
    
    // Require change if:
    // 1. Password is very weak (score 0-1)
    // 2. Password is below current minimum length
    // 3. Password is a common weak password
    return analysis.score <= 1 || 
           password.length < this.CURRENT_MIN_LENGTH ||
           this.COMMON_WEAK_PASSWORDS.includes(password.toLowerCase());
  }

  // Get security recommendations
  static getSecurityRecommendations(password: string): string[] {
    const analysis = this.analyzePassword(password);
    return analysis.recommendations;
  }
} 