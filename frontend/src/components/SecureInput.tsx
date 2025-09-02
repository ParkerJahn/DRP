import React, { useState, useCallback } from 'react';
import { InputValidator, INPUT_LIMITS } from '../utils/validation';

export interface SecureInputProps {
  // Basic input props
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number';
  name: string;
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  onBlur?: () => void;
  
  // Validation props
  validationType?: 'name' | 'email' | 'password' | 'phone' | 'text' | 'url' | 'number';
  maxLength?: number;
  minLength?: number;
  required?: boolean;
  disabled?: boolean;
  
  // Number validation (for type="number")
  min?: number;
  max?: number;
  
  // Display props
  label?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  autoComplete?: string;
  
  // Error handling
  showErrors?: boolean;
  customError?: string;
}

export const SecureInput: React.FC<SecureInputProps> = ({
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  validationType = 'text',
  maxLength,
  minLength,
  required = false,
  disabled = false,
  min,
  max,
  label,
  placeholder,
  className = '',
  id,
  autoComplete,
  showErrors = true,
  customError,
}) => {
  const [error, setError] = useState<string>('');
  const [touched, setTouched] = useState(false);

  // Get appropriate max length based on validation type
  const getMaxLength = useCallback(() => {
    if (maxLength !== undefined) return maxLength;
    
    switch (validationType) {
      case 'name':
        return INPUT_LIMITS.FIRST_NAME_MAX;
      case 'email':
        return INPUT_LIMITS.EMAIL_MAX;
      case 'password':
        return INPUT_LIMITS.PASSWORD_MAX;
      case 'phone':
        return INPUT_LIMITS.PHONE_MAX;
      case 'url':
        return INPUT_LIMITS.MEDIUM_TEXT_MAX;
      default:
        return INPUT_LIMITS.SHORT_TEXT_MAX;
    }
  }, [maxLength, validationType]);

  // Validate input based on type
  const validateInput = useCallback((inputValue: string) => {
    if (!inputValue && !required) {
      return { isValid: true, sanitized: '', error: undefined };
    }

    switch (validationType) {
      case 'name':
        return InputValidator.validateName(inputValue, label || 'Field');
      case 'email':
        return InputValidator.validateEmail(inputValue);
      case 'password':
        return InputValidator.validatePassword(inputValue);
      case 'phone':
        return InputValidator.validatePhone(inputValue);
      case 'url':
        return InputValidator.validateUrl(inputValue);
      case 'number':
        return InputValidator.validateNumber(inputValue, min, max);
      case 'text':
      default:
        return InputValidator.validateTextContent(inputValue, getMaxLength());
    }
  }, [validationType, label, required, min, max, getMaxLength]);

  // Handle input change with validation
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Apply immediate length limit to prevent excessive input
    const limitedValue = inputValue.substring(0, getMaxLength());
    
    try {
      // Validate the input
      const validation = validateInput(limitedValue);
      
      if (validation.isValid) {
        setError('');
        const sanitizedValue = typeof validation.sanitized === 'number' 
          ? validation.sanitized.toString() 
          : validation.sanitized || limitedValue;
        onChange(sanitizedValue, true);
      } else {
        setError(validation.error || 'Invalid input');
        onChange(limitedValue, false);
      }
    } catch {
      setError('Input contains invalid characters');
      onChange('', false);
    }
  }, [getMaxLength, validateInput, onChange]);

  // Handle blur event
  const handleBlur = useCallback(() => {
    setTouched(true);
    if (onBlur) {
      onBlur();
    }
  }, [onBlur]);

  // Determine if we should show the error
  const shouldShowError = showErrors && touched && (error || customError);
  const displayError = customError || error;

  // Get input classes
  const inputClasses = `
    ${className}
    ${shouldShowError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
  `.trim();

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={id || name} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        type={type}
        id={id || name}
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={inputClasses}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        maxLength={getMaxLength()}
        minLength={minLength}
        min={type === 'number' ? min : undefined}
        max={type === 'number' ? max : undefined}
        // Security attributes
        autoCapitalize={type === 'email' ? 'none' : undefined}
        spellCheck={type === 'password' || type === 'email' ? false : undefined}
      />
      
      {shouldShowError && (
        <p className="text-red-500 text-sm mt-1" role="alert">
          {displayError}
        </p>
      )}
      
      {/* Character count indicator for longer inputs */}
      {(type === 'text' || validationType === 'text') && getMaxLength() > 100 && (
        <p className="text-gray-500 text-xs mt-1">
          {value.length} / {getMaxLength()} characters
        </p>
      )}
    </div>
  );
};

export default SecureInput; 