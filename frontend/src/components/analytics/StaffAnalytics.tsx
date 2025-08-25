import React, { useState, useEffect } from 'react';
import { getEventsByPro } from '../../services/calendar';
import { getUsersByRole } from '../../services/firebase';
import type { Event } from '../../types';

interface StaffAnalyticsProps {
  proId: string;
}

interface SessionData {
  upcoming: number;
  today: number;
  thisWeek: number;
  completed: number;
  cancelled: number;
}

interface AthleteData {
  total: number;
  active: number;
  newThisMonth: number;
  averageSessions: number;
}

interface ExtendedEvent extends Event {
  id: string;
  status?: string;
}

interface UserData {
  role: string;
  status?: string;
  createdAt?: {
    toDate: () => Date;
  };
}

const StaffAnalytics: React.FC<StaffAnalyticsProps> = ({ proId }) => {
  const [sessionData, setSessionData] = useState<SessionData>({
    upcoming: 0,
    today: 0,
    thisWeek: 0,
    completed: 0,
    cancelled: 0
  });
  const [athleteData, setAthleteData] = useState<AthleteData>({
    total: 0,
    active: 0,
    newThisMonth: 0,
    averageSessions: 0
  });
  const [upcomingSessions, setUpcomingSessions] = useState<Array<ExtendedEvent>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStaffAnalytics = async () => {
      try {
        setLoading(true);
        
        // Load events data
        const eventsResult = await getEventsByPro(proId);
        const usersResult = await getUsersByRole(proId, 'ATHLETE');

        if (eventsResult.success && usersResult.success) {
          const events = eventsResult.events || [];
          const users = usersResult.users || [];
          
          // Process session data
          const sessions = processSessionData(events);
          setSessionData(sessions);

          // Process athlete data
          const athletes = processAthleteData(users, events);
          setAthleteData(athletes);

          // Get upcoming sessions
          const upcoming = events
            .filter(event => event.type === 'session' && event.startsAt.toDate() > new Date())
            .sort((a, b) => a.startsAt.toDate().getTime() - b.startsAt.toDate().getTime())
            .slice(0, 5);
          setUpcomingSessions(upcoming);
        }
      } catch (error) {
        console.error('Error loading staff analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStaffAnalytics();
  }, [proId]);

  const processSessionData = (events: Array<ExtendedEvent>): SessionData => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const sessions = events.filter(event => event.type === 'session');
    
    return {
      upcoming: sessions.filter(event => event.startsAt.toDate() > now).length,
      today: sessions.filter(event => {
        const eventDate = event.startsAt.toDate();
        return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }).length,
      thisWeek: sessions.filter(event => {
        const eventDate = event.startsAt.toDate();
        return eventDate >= weekStart && eventDate < weekEnd;
      }).length,
      completed: sessions.filter(event => (event as ExtendedEvent).status === 'completed').length,
      cancelled: sessions.filter(event => (event as ExtendedEvent).status === 'cancelled').length
    };
  };

  const processAthleteData = (users: Array<UserData>, events: Array<ExtendedEvent>): AthleteData => {
    const athletes = users.filter(user => user.role === 'ATHLETE');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const sessions = events.filter(event => event.type === 'session');
    const totalSessions = sessions.length;
    const averageSessions = athletes.length > 0 ? Math.round(totalSessions / athletes.length) : 0;

    return {
      total: athletes.length,
      active: athletes.filter(athlete => athlete.status === 'active').length,
      newThisMonth: athletes.filter(athlete => {
        const joinDate = athlete.createdAt?.toDate() || new Date(0);
        return joinDate >= monthStart;
      }).length,
      averageSessions
    };
  };

  const getSessionEfficiency = () => {
    const total = sessionData.completed + sessionData.cancelled;
    return total > 0 ? Math.round((sessionData.completed / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Overview */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-ethnocentric mb-6">
          📅 Session Management
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
            <div className="text-sm font-medium opacity-90">Upcoming Sessions</div>
            <div className="text-2xl font-bold">{sessionData.upcoming}</div>
            <div className="text-sm opacity-90">
              {sessionData.thisWeek} this week
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
            <div className="text-sm font-medium opacity-90">Today's Sessions</div>
            <div className="text-2xl font-bold">{sessionData.today}</div>
            <div className="text-sm opacity-90">
              {sessionData.today > 0 ? 'Ready to go!' : 'No sessions today'}
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
            <div className="text-sm font-medium opacity-90">Completed</div>
            <div className="text-2xl font-bold">{sessionData.completed}</div>
            <div className="text-sm opacity-90">
              {getSessionEfficiency()}% efficiency
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg text-white">
            <div className="text-sm font-medium opacity-90">This Week</div>
            <div className="text-2xl font-bold">{sessionData.thisWeek}</div>
            <div className="text-sm opacity-90">
              Total weekly sessions
            </div>
          </div>
        </div>

        {/* Session Efficiency Chart */}
        <div className="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Session Efficiency</h4>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {getSessionEfficiency()}% success rate
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{sessionData.completed}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${getSessionEfficiency()}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cancelled</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{sessionData.cancelled}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                <div 
                  className="bg-red-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${100 - getSessionEfficiency()}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Athlete Management */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-ethnocentric mb-6">
          🏃 Athlete Management
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Athlete Stats */}
          <div className="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Athlete Overview</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Athletes</span>
                <span className="font-semibold text-gray-900 dark:text-white">{athleteData.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Active Athletes</span>
                <span className="font-semibold text-gray-900 dark:text-white">{athleteData.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">New This Month</span>
                <span className="font-semibold text-green-600 dark:text-green-400">+{athleteData.newThisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Avg Sessions/Athlete</span>
                <span className="font-semibold text-gray-900 dark:text-white">{athleteData.averageSessions}</span>
              </div>
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Next 5 Sessions</h4>
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-gray-400 dark:text-gray-500 text-2xl mb-2">📅</div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming sessions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-2 bg-white dark:bg-neutral-600 rounded">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-900 dark:text-white truncate">
                        {session.title}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {session.startsAt.toDate().toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffAnalytics; 