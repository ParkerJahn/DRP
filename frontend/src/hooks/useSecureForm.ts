import { useState, useCallback } from 'react';
import { InputValidator, INPUT_LIMITS } from '../utils/validation';

export interface FormField {
  value: string;
  isValid: boolean;
  error?: string;
  touched: boolean;
}

export interface FormConfig<T extends Record<string, unknown>> {
  initialValues: T;
  validationRules: Record<keyof T, {
    type: 'name' | 'email' | 'password' | 'phone' | 'text' | 'url' | 'number';
    required?: boolean;
    maxLength?: number;
    minLength?: number;
    min?: number;
    max?: number;
    label?: string;
  }>;
}

export interface UseSecureFormReturn<T extends Record<string, unknown>> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isFormValid: boolean;
  setFieldValue: (field: keyof T, value: string, isValid: boolean) => void;
  setFieldTouched: (field: keyof T) => void;
  handleBlur: (field: keyof T) => () => void;
  validateField: (field: keyof T, value: string) => { isValid: boolean; error?: string };
  validateForm: () => boolean;
  reset: () => void;
  getFieldProps: (field: keyof T) => {
    name: string;
    value: string;
    onChange: (value: string, isValid: boolean) => void;
    onBlur: () => void;
    required: boolean;
    type: string;
    validationType: string;
    label?: string;
    maxLength?: number;
    minLength?: number;
    min?: number;
    max?: number;
    customError?: string;
  };
}

export function useSecureForm<T extends Record<string, unknown>>(
  config: FormConfig<T>
): UseSecureFormReturn<T> {
  const [values, setValues] = useState<T>(config.initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);
  const [fieldValidities, setFieldValidities] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  // Validate individual field
  const validateField = useCallback((field: keyof T, value: string) => {
    const rule = config.validationRules[field];
    if (!rule) return { isValid: true };

    if (!value && !rule.required) {
      return { isValid: true };
    }

    try {
      switch (rule.type) {
        case 'name':
          return InputValidator.validateName(value, rule.label || String(field));
        case 'email':
          return InputValidator.validateEmail(value);
        case 'password':
          return InputValidator.validatePassword(value);
        case 'phone':
          return InputValidator.validatePhone(value);
        case 'url':
          return InputValidator.validateUrl(value);
        case 'number':
          return InputValidator.validateNumber(value, rule.min, rule.max);
        case 'text':
        default: {
          const maxLength = rule.maxLength || INPUT_LIMITS.SHORT_TEXT_MAX;
          return InputValidator.validateTextContent(value, maxLength);
        }
      }
    } catch {
      return { isValid: false, error: 'Invalid input detected' };
    }
  }, [config.validationRules]);

  // Set field value with validation
  const setFieldValue = useCallback((field: keyof T, value: string, isValid: boolean) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setFieldValidities(prev => ({ ...prev, [field]: isValid }));
    
    // Clear error if field becomes valid
    if (isValid && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Mark field as touched
  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  // Handle blur event
  const handleBlur = useCallback((field: keyof T) => () => {
    setFieldTouched(field);
    
    // Validate on blur
    const validation = validateField(field, String(values[field]));
    if (!validation.isValid && validation.error) {
      setErrors(prev => ({ ...prev, [field]: validation.error || '' }));
    }
  }, [setFieldTouched, validateField, values]);

  // Validate entire form
  const validateForm = useCallback(() => {
    const newErrors: Record<keyof T, string> = {} as Record<keyof T, string>;
    const newValidities: Record<keyof T, boolean> = {} as Record<keyof T, boolean>;
    let isFormValid = true;

    Object.keys(config.validationRules).forEach(fieldKey => {
      const field = fieldKey as keyof T;
      const value = String(values[field] || '');
      const validation = validateField(field, value);
      
      newValidities[field] = validation.isValid;
      
      if (!validation.isValid) {
        newErrors[field] = validation.error || 'Invalid input';
        isFormValid = false;
      }
    });

    setErrors(newErrors);
    setFieldValidities(newValidities);
    setTouched(prev => {
      const newTouched = { ...prev };
      Object.keys(config.validationRules).forEach(fieldKey => {
        newTouched[fieldKey as keyof T] = true;
      });
      return newTouched;
    });

    return isFormValid;
  }, [config.validationRules, values, validateField]);

  // Reset form
  const reset = useCallback(() => {
    setValues(config.initialValues);
    setErrors({} as Record<keyof T, string>);
    setTouched({} as Record<keyof T, boolean>);
    setFieldValidities({} as Record<keyof T, boolean>);
  }, [config.initialValues]);

  // Get props for SecureInput component
  const getFieldProps = useCallback((field: keyof T) => {
    const rule = config.validationRules[field];
    const fieldType = rule?.type || 'text';
    
    // Map validation types to input types
    const inputType = fieldType === 'phone' ? 'tel' : 
                     fieldType === 'number' ? 'number' : 
                     fieldType;

    return {
      name: String(field),
      value: String(values[field] || ''),
      onChange: (value: string, isValid: boolean) => setFieldValue(field, value, isValid),
      onBlur: handleBlur(field),
      required: rule?.required || false,
      type: inputType,
      validationType: fieldType,
      label: rule?.label,
      maxLength: rule?.maxLength,
      minLength: rule?.minLength,
      min: rule?.min,
      max: rule?.max,
      customError: touched[field] ? errors[field] : undefined,
    };
  }, [config.validationRules, values, setFieldValue, handleBlur, touched, errors]);

  // Check if all required fields are valid
  const isFormValid = Object.keys(config.validationRules).every(fieldKey => {
    const field = fieldKey as keyof T;
    const rule = config.validationRules[field];
    const value = String(values[field] || '');
    
    // If field is not required and empty, it's valid
    if (!rule.required && !value) return true;
    
    // Otherwise check field validity
    return fieldValidities[field] === true;
  });

  const isValid = isFormValid;

  return {
    values,
    errors,
    touched,
    isValid,
    isFormValid,
    setFieldValue,
    setFieldTouched,
    handleBlur,
    validateField,
    validateForm,
    reset,
    getFieldProps,
  };
} 