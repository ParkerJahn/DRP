import { useState, useEffect } from 'react';
import { 
  getFreeAccessStatus, 
  setFreeAccessStatus, 
  activateFreeAccess, 
  deactivateFreeAccess,
  type FreeAccessStatus 
} from '../config/freeAccess';

export const useFreeAccess = () => {
  const [freeAccessStatus, setFreeAccessStatusState] = useState<FreeAccessStatus>(getFreeAccessStatus());

  // Update local state when free access status changes
  const updateFreeAccessStatus = (newStatus: FreeAccessStatus) => {
    setFreeAccessStatus(newStatus);
    setFreeAccessStatusState(newStatus);
  };

  // Activate free access
  const activate = (userId?: string) => {
    activateFreeAccess(userId);
    const newStatus = getFreeAccessStatus();
    setFreeAccessStatusState(newStatus);
  };

  // Deactivate free access
  const deactivate = () => {
    deactivateFreeAccess();
    const newStatus = getFreeAccessStatus();
    setFreeAccessStatusState(newStatus);
  };

  // Check if user has free access
  const hasFreeAccess = freeAccessStatus.isActive;

  // Refresh status from storage
  const refreshStatus = () => {
    const currentStatus = getFreeAccessStatus();
    setFreeAccessStatusState(currentStatus);
  };

  // Listen for storage changes (if another tab changes the status)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'drp_free_access_status') {
        refreshStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    freeAccessStatus,
    hasFreeAccess,
    activate,
    deactivate,
    refreshStatus,
    updateFreeAccessStatus
  };
}; 