import { useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Simple Session Timeout Hook
 * Automatically logs out users after 1 hour of inactivity
 */
export const useSessionTimeout = () => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const TIMEOUT_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(async () => {
      console.log('🕐 Session timeout: User inactive for 1 hour, logging out...');
      try {
        await signOut(auth);
        // Redirect to auth page
        window.location.href = '/auth';
        console.log('✅ Session timeout logout completed');
      } catch (error) {
        console.error('❌ Error during session timeout logout:', error);
        // Fallback redirect
        window.location.href = '/auth';
      }
    }, TIMEOUT_DURATION);
  };

  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus',
      'input',
      'change'
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Also listen for visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { resetTimer };
};

export default useSessionTimeout; 