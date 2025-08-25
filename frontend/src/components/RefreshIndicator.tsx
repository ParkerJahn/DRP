import React from 'react';
import { useSmartPolling } from '../hooks/useSmartPolling';

interface RefreshIndicatorProps {
  onRefresh: () => Promise<void>;
  interval?: number;
  showStatus?: boolean;
  className?: string;
}

export const RefreshIndicator: React.FC<RefreshIndicatorProps> = ({
  onRefresh,
  interval = 300000, // 5 minutes default
  showStatus = true,
  className = ''
}) => {
  const {
    isPolling,
    lastPollTime,
    nextPollTime,
    manualRefresh,
    error
  } = useSmartPolling({
    interval,
    onPoll: onRefresh,
    pauseOnActivity: true,
    activityTimeout: 30000 // 30 seconds
  });

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const formatNextPoll = (date: Date | null) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (diff < 0) return 'Soon';
    if (minutes < 1) return 'Any moment';
    if (minutes < 60) return `in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `in ${hours}h`;
    return date.toLocaleDateString();
  };

  const handleManualRefresh = async () => {
    try {
      await manualRefresh();
    } catch (err) {
      console.error('Manual refresh failed:', err);
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Manual Refresh Button */}
      <button
        onClick={handleManualRefresh}
        disabled={isPolling}
        className={`
          flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium
          transition-colors duration-200
          ${isPolling 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
          }
        `}
        title="Refresh data now"
      >
        {isPolling ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span>Refreshing...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </>
        )}
      </button>

      {/* Status Information */}
      {showStatus && (
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          {/* Last Update */}
          <div className="flex items-center space-x-1">
            <span>Last updated:</span>
            <span className="font-medium">{formatTime(lastPollTime)}</span>
          </div>

          {/* Next Update */}
          <div className="flex items-center space-x-1">
            <span>Next update:</span>
            <span className="font-medium">{formatNextPoll(nextPollTime)}</span>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-1 text-red-500">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="truncate max-w-32" title={error}>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 