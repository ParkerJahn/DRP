// Free Access Code Configuration
// This code allows users to activate indefinite free access mode

export const FREE_ACCESS_CODE = import.meta.env.VITE_FREE_ACCESS_CODE || 'your_free_access_code_here';

// Free Access Status Management
export interface FreeAccessStatus {
  isActive: boolean;
  activatedAt?: Date;
  activatedBy?: string;
}

// Local Storage Keys
export const FREE_ACCESS_STORAGE_KEY = 'drp_free_access_status';
export const FREE_ACCESS_CODE_STORAGE_KEY = 'drp_free_access_code_attempts';

// Free Access Validation
export const validateFreeAccessCode = (inputCode: string): boolean => {
  return inputCode === FREE_ACCESS_CODE;
};

// Rate Limiting for Code Attempts
export const checkCodeAttempts = (): boolean => {
  const attempts = localStorage.getItem(FREE_ACCESS_CODE_STORAGE_KEY);
  if (!attempts) return true;
  
  const attemptData = JSON.parse(attempts);
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  // Reset attempts if more than 1 hour ago
  if (attemptData.timestamp < oneHourAgo) {
    localStorage.removeItem(FREE_ACCESS_CODE_STORAGE_KEY);
    return true;
  }
  
  // Allow up to 5 attempts per hour
  return attemptData.count < 5;
};

export const recordCodeAttempt = (): void => {
  const attempts = localStorage.getItem(FREE_ACCESS_CODE_STORAGE_KEY);
  const now = Date.now();
  
  if (!attempts) {
    localStorage.setItem(FREE_ACCESS_CODE_STORAGE_KEY, JSON.stringify({
      count: 1,
      timestamp: now
    }));
  } else {
    const attemptData = JSON.parse(attempts);
    const oneHourAgo = now - (60 * 60 * 1000);
    
    if (attemptData.timestamp < oneHourAgo) {
      // Reset if more than 1 hour ago
      localStorage.setItem(FREE_ACCESS_CODE_STORAGE_KEY, JSON.stringify({
        count: 1,
        timestamp: now
      }));
    } else {
      // Increment count
      localStorage.setItem(FREE_ACCESS_CODE_STORAGE_KEY, JSON.stringify({
        count: attemptData.count + 1,
        timestamp: attemptData.timestamp
      }));
    }
  }
};

// Free Access Status Management
export const getFreeAccessStatus = (): FreeAccessStatus => {
  const stored = localStorage.getItem(FREE_ACCESS_STORAGE_KEY);
  if (!stored) return { isActive: false };
  
  try {
    const status = JSON.parse(stored);
    return {
      isActive: status.isActive || false,
      activatedAt: status.activatedAt ? new Date(status.activatedAt) : undefined,
      activatedBy: status.activatedBy
    };
  } catch {
    return { isActive: false };
  }
};

export const setFreeAccessStatus = (status: FreeAccessStatus): void => {
  localStorage.setItem(FREE_ACCESS_STORAGE_KEY, JSON.stringify(status));
};

export const activateFreeAccess = (userId?: string): void => {
  setFreeAccessStatus({
    isActive: true,
    activatedAt: new Date(),
    activatedBy: userId
  });
};

export const deactivateFreeAccess = (): void => {
  setFreeAccessStatus({
    isActive: false
  });
}; 