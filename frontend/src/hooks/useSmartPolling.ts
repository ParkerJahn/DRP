import { useEffect, useRef, useCallback, useState } from 'react';

interface UseSmartPollingOptions {
  interval: number; // Polling interval in milliseconds
  enabled?: boolean; // Whether polling should be enabled
  pauseOnActivity?: boolean; // Pause polling when user is active
  activityTimeout?: number; // How long to wait after activity before resuming
  onPoll?: () => Promise<void>; // Function to call on each poll
}

interface UseSmartPollingReturn {
  isPolling: boolean;
  lastPollTime: Date | null;
  nextPollTime: Date | null;
  manualRefresh: () => Promise<void>;
  pausePolling: () => void;
  resumePolling: () => void;
  error: string | null;
}

export const useSmartPolling = ({
  interval,
  enabled = true,
  pauseOnActivity = true,
  activityTimeout = 30000, // 30 seconds
  onPoll
}: UseSmartPollingOptions): UseSmartPollingReturn => {
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const [nextPollTime, setNextPollTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());
  const isPausedRef = useRef(false);

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = new Date();
    if (isPausedRef.current && pauseOnActivity) {
      // Resume polling after activity timeout
      setTimeout(() => {
        if (new Date().getTime() - lastActivityRef.current.getTime() >= activityTimeout) {
          isPausedRef.current = false;
        }
      }, activityTimeout);
    }
  }, [activityTimeout, pauseOnActivity]);

  // Add activity listeners
  useEffect(() => {
    if (!pauseOnActivity) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => updateActivity();
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity, pauseOnActivity]);

  // Polling function
  const poll = useCallback(async () => {
    if (!enabled || isPausedRef.current) return;

    try {
      setIsPolling(true);
      setError(null);
      
      if (onPoll) {
        await onPoll();
      }
      
      setLastPollTime(new Date());
      setNextPollTime(new Date(Date.now() + interval));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Polling failed');
      console.error('Smart polling error:', err);
    } finally {
      setIsPolling(false);
    }
  }, [enabled, onPoll, interval]);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    await poll();
  }, [poll]);

  // Pause polling
  const pausePolling = useCallback(() => {
    isPausedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Resume polling
  const resumePolling = useCallback(() => {
    isPausedRef.current = false;
    if (enabled && !intervalRef.current) {
      intervalRef.current = setInterval(poll, interval);
    }
  }, [enabled, interval, poll]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (enabled && !isPausedRef.current) {
      // Initial poll
      poll();
      
      // Set up interval
      intervalRef.current = setInterval(poll, interval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [enabled, interval, poll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isPolling,
    lastPollTime,
    nextPollTime,
    manualRefresh,
    pausePolling,
    resumePolling,
    error
  };
}; 