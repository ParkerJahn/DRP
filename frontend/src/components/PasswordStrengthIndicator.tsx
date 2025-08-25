import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showStrength: boolean;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password, showStrength }) => {
  if (!showStrength || !password) return null;

  const getPasswordStrength = (password: string) => {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 6) score += 1;
    else feedback.push('At least 6 characters');

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letter');

    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letter');

    // Number check
    if (/\d/.test(password)) score += 1;
    else feedback.push('Include a number');

    // Special character check
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 1;
    else feedback.push('Include special character');

    // Common weak passwords check
    if (password.toLowerCase() === 'password' || password.toLowerCase() === '123456') {
      score = 0;
      feedback.push('Avoid common weak passwords');
    }

    return { score, feedback, strength: getStrengthLabel(score) };
  };

  const getStrengthLabel = (score: number): string => {
    if (score === 0) return 'Very Weak';
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score <= 4) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = (strength: string): string => {
    switch (strength) {
      case 'Very Weak':
      case 'Weak':
        return 'bg-red-500';
      case 'Fair':
        return 'bg-yellow-500';
      case 'Good':
        return 'bg-blue-500';
      case 'Strong':
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  const { score, feedback, strength } = getPasswordStrength(password);
  const strengthColor = getStrengthColor(strength);

  return (
    <div className="mt-2">
      {/* Strength Bar */}
      <div className="flex items-center space-x-2 mb-2">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${strengthColor}`}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded ${
          strength === 'Very Weak' || strength === 'Weak' ? 'text-red-600 dark:text-red-400' :
          strength === 'Fair' ? 'text-yellow-600 dark:text-yellow-400' :
          strength === 'Good' ? 'text-blue-600 dark:text-blue-400' :
          'text-green-600 dark:text-green-400'
        }`}>
          {strength}
        </span>
      </div>

      {/* Feedback */}
      {feedback.length > 0 && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <p className="font-medium mb-1">To improve your password:</p>
          <ul className="list-disc list-inside space-y-1">
            {feedback.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Requirements Checklist */}
      <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
        <div className="grid grid-cols-2 gap-2">
          <div className={`flex items-center ${password.length >= 6 ? 'text-green-600 dark:text-green-400' : ''}`}>
            <span className="mr-1">{password.length >= 6 ? '✓' : '○'}</span>
            At least 6 characters
          </div>
          <div className={`flex items-center ${/[A-Z]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}`}>
            <span className="mr-1">{/[A-Z]/.test(password) ? '✓' : '○'}</span>
            Uppercase letter
          </div>
          <div className={`flex items-center ${/[a-z]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}`}>
            <span className="mr-1">{/[a-z]/.test(password) ? '✓' : '○'}</span>
            Lowercase letter
          </div>
          <div className={`flex items-center ${/\d/.test(password) ? 'text-green-600 dark:text-green-400' : ''}`}>
            <span className="mr-1">{/\d/.test(password) ? '✓' : '○'}</span>
            Number
          </div>
          <div className={`flex items-center ${/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}`}>
            <span className="mr-1">{/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) ? '✓' : '○'}</span>
            Special character
          </div>
          <div className={`flex items-center ${password.toLowerCase() !== 'password' && password.toLowerCase() !== '123456' ? 'text-green-600 dark:text-green-400' : ''}`}>
            <span className="mr-1">{password.toLowerCase() !== 'password' && password.toLowerCase() !== '123456' ? '✓' : '○'}</span>
            Not common
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator; 