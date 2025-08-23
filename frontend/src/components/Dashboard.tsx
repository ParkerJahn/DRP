import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '../types';
import { getUsersByRole } from '../services/firebase';
import { getEventsByPro, getEventsByAttendee } from '../services/calendar';
import { getPaymentsByPro, getPaymentsByPayer } from '../services/payments';
import { getPackagesByPro, getAthletePackages } from '../services/packages';

interface DashboardStats {
  staffCount: number;
  athleteCount: number;
  activePrograms: number;
  upcomingEvents: number;
  totalRevenue: number;
  activePackages: number;
  recentActivity: Array<{
    id: string;
    type: 'payment' | 'event' | 'package' | 'member';
    title: string;
    description: string;
    timestamp: Date;
    icon: string;
  }>;
}

// Weekly Calendar Component
const WeeklyCalendar: React.FC<{ userId: string; proId: string; userRole: UserRole }> = ({ userId, proId, userRole }) => {
  const [weekEvents, setWeekEvents] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadWeekEvents = async () => {
      try {
        setLoading(true);
        let eventsResult;
        
        if (userRole === 'PRO') {
          eventsResult = await getEventsByPro(proId);
        } else {
          eventsResult = await getEventsByAttendee(userId);
        }

        if (eventsResult.success && eventsResult.events) {
          const today = new Date();
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7); // End of week
          
          const weekEvents = eventsResult.events.filter((event: any) => {
            const eventDate = event.startsAt.toDate();
            return eventDate >= weekStart && eventDate < weekEnd;
          });
          
          setWeekEvents(weekEvents);
        }
      } catch (error) {
        console.warn('Weekly calendar error:', error);
        setWeekEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadWeekEvents();
  }, [userId, proId, userRole]);

  const handleViewCalendar = () => {
    navigate('/app/calendar');
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayNumber = (date: Date) => {
    return date.getDate();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getEventsForDay = (date: Date) => {
    return weekEvents.filter((event: any) => {
      const eventDate = event.startsAt.toDate();
      return eventDate.toDateString() === date.toDateString();
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📅 This Week</h3>
          <button
            onClick={handleViewCalendar}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
          >
            View Full Calendar
          </button>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Generate week dates
  const weekDates = [];
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    weekDates.push(date);
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📅 This Week</h3>
        <button
          onClick={handleViewCalendar}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
        >
          View Full Calendar
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, index) => {
          const dayEvents = getEventsForDay(date);
          const isCurrentDay = isToday(date);
          const isHovered = hoveredDay === index;
          
  return (
            <div 
              key={index} 
              className={`p-2 rounded-lg text-center transition-all duration-300 ease-in-out ${
                isCurrentDay 
                  ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400' 
                  : 'bg-gray-50 dark:bg-neutral-700'
              } ${
                isHovered 
                  ? 'scale-110 z-10 shadow-lg' 
                  : hoveredDay !== null 
                    ? 'scale-95 opacity-70' 
                    : 'scale-100'
              }`}
              onMouseEnter={() => setHoveredDay(index)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div className={`text-xs font-medium mb-1 ${
                isCurrentDay 
                  ? 'text-blue-700 dark:text-blue-300' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {getDayName(date)}
              </div>
              <div className={`text-lg font-bold mb-2 ${
                isCurrentDay 
                  ? 'text-blue-800 dark:text-blue-200' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {getDayNumber(date)}
              </div>
              
              {/* Event contents */}
              <div className="space-y-1 min-h-[60px]">
                {dayEvents.length === 0 ? (
                  <div className="text-xs text-gray-400 dark:text-gray-500 py-2">
                    No events
                  </div>
                ) : (
                  dayEvents.slice(0, isHovered ? 3 : 2).map((event: any, eventIndex: number) => (
                    <div 
                      key={eventIndex}
                      className={`p-1 rounded text-left transition-all duration-200 ${
                        isHovered 
                          ? 'bg-white dark:bg-neutral-600 shadow-sm' 
                          : 'bg-transparent'
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {event.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {event.startsAt.toDate().toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  ))
                )}
                
                {/* Show more indicator */}
                {dayEvents.length > (isHovered ? 3 : 2) && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
                    +{dayEvents.length - (isHovered ? 3 : 2)} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Calendar Widget Component
const CalendarWidget: React.FC<{ userId: string; proId: string; userRole: UserRole }> = ({ userId, proId, userRole }) => {
  const [todayEvents, setTodayEvents] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadTodayEvents = async () => {
      try {
        setLoading(true);
        let eventsResult;
        
        if (userRole === 'PRO') {
          eventsResult = await getEventsByPro(proId);
        } else {
          eventsResult = await getEventsByAttendee(userId);
        }

        if (eventsResult.success && eventsResult.events) {
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
          
          const todaysEvents = eventsResult.events.filter((event: any) => {
            const eventDate = event.startsAt.toDate();
            return eventDate >= todayStart && eventDate < todayEnd;
          });
          
          setTodayEvents(todaysEvents);
        }
      } catch (error) {
        console.warn('Calendar widget error:', error);
        setTodayEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadTodayEvents();
  }, [userId, proId, userRole]);

  const handleViewCalendar = () => {
    navigate('/app/calendar');
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📅 Today's Schedule</h3>
          <button
            onClick={handleViewCalendar}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
          >
            View All
          </button>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📅 Today's Schedule</h3>
        <button
          onClick={handleViewCalendar}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
        >
          View All
        </button>
      </div>
      
      {todayEvents.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-gray-400 dark:text-gray-500 text-4xl mb-2">📅</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No events scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayEvents.slice(0, 3).map((event: any) => (
            <div key={event.id} className="flex items-center p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg">
              <div className="flex-shrink-0 w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full mr-3"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {event.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {event.startsAt.toDate().toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })} • {event.type}
                </p>
              </div>
            </div>
          ))}
          {todayEvents.length > 3 && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                +{todayEvents.length - 3} more events today
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Upcoming Events Widget Component
const UpcomingEventsWidget: React.FC<{ userId: string; proId: string; userRole: UserRole }> = ({ userId, proId, userRole }) => {
  const [upcomingEvents, setUpcomingEvents] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUpcomingEvents = async () => {
      try {
        setLoading(true);
        let eventsResult;
        
        if (userRole === 'PRO') {
          eventsResult = await getEventsByPro(proId);
        } else {
          eventsResult = await getEventsByAttendee(userId);
        }

        if (eventsResult.success && eventsResult.events) {
          const now = new Date();
          const upcoming = eventsResult.events
            .filter((event: any) => event.startsAt.toDate() > now)
            .sort((a: any, b: any) => a.startsAt.toDate().getTime() - b.startsAt.toDate().getTime())
            .slice(0, 5); // Show next 5 events
          
          setUpcomingEvents(upcoming);
        }
      } catch (error) {
        console.warn('Upcoming events error:', error);
        setUpcomingEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadUpcomingEvents();
  }, [userId, proId, userRole]);

  const handleViewCalendar = () => {
    navigate('/app/calendar');
  };

  const formatEventTime = (timestamp: any) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'session': return '💪';
      case 'consultation': return '💬';
      case 'assessment': return '📋';
      case 'meeting': return '🤝';
      default: return '📅';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📅 Upcoming Events</h3>
          <button
            onClick={handleViewCalendar}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            View All
          </button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📅 Upcoming Events</h3>
        <button
          onClick={handleViewCalendar}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
        >
          View All
        </button>
      </div>
      
      {upcomingEvents.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📅</div>
          <p>No upcoming events</p>
          <p className="text-sm mt-1">Create your first event to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingEvents.map((event, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors cursor-pointer"
              onClick={() => navigate('/app/calendar')}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getEventTypeIcon(event.type)}</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {event.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatEventTime(event.startsAt)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {event.attendees?.length || 0} attendee{(event.attendees?.length || 0) !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { user, role, proStatus } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    staffCount: 0,
    athleteCount: 0,
    activePrograms: 0,
    upcomingEvents: 0,
    totalRevenue: 0,
    activePackages: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && role) {
      loadDashboardData();
    }
  }, [user, role]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (role === 'PRO') {
        await loadProDashboard();
      } else if (role === 'STAFF') {
        await loadStaffDashboard();
      } else if (role === 'ATHLETE') {
        await loadAthleteDashboard();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProDashboard = async () => {
    if (!user) return;
    
    const proId = user.proId || user.uid;
    const activity: DashboardStats['recentActivity'] = [];

    try {
      // Load team member counts
      const [staffResult, athleteResult] = await Promise.all([
        getUsersByRole(proId, 'STAFF'),
        getUsersByRole(proId, 'ATHLETE')
      ]);

      // Load events (with error handling for index issues)
      let upcomingEvents = 0;
      // Temporarily disabled calendar service to avoid index errors during development
      /*
      try {
        const eventsResult = await getUpcomingEvents(proId);
        upcomingEvents = eventsResult.success ? eventsResult.events?.length || 0 : 0;

        // Add recent events to activity
        if (eventsResult.success && eventsResult.events) {
          eventsResult.events.slice(0, 2).forEach(event => {
            activity.push({
              id: event.id || '',
              type: 'event',
              title: 'Upcoming Session',
              description: `${event.title} - ${event.startsAt.toDate().toLocaleDateString()}`,
              timestamp: event.startsAt.toDate(),
              icon: '📅'
            });
          });
        }
      } catch (calendarError) {
        console.warn('Calendar service temporarily unavailable:', calendarError);
        // Continue without calendar data
      }
      */

      // Load payments for revenue calculation
      const paymentsResult = await getPaymentsByPro(proId);
      let totalRevenue = 0;
      if (paymentsResult.success && paymentsResult.payments) {
        totalRevenue = paymentsResult.payments
          .filter(p => p.status === 'succeeded')
          .reduce((sum, p) => sum + p.amount, 0);
        
        // Add recent payments to activity
        paymentsResult.payments.slice(0, 3).forEach(payment => {
          activity.push({
            id: payment.id || '',
            type: 'payment',
            title: 'Payment Received',
            description: `$${(payment.amount / 100).toFixed(2)} from training session`,
            timestamp: payment.createdAt.toDate(),
            icon: '💰'
          });
        });
      }

      // Load packages
      const packagesResult = await getPackagesByPro(proId);
      const activePackages = packagesResult.success ? 
        packagesResult.packages?.filter(p => p.status === 'active').length || 0 : 0;

      // Sort activity by timestamp
      activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setStats({
        staffCount: staffResult.success ? staffResult.users?.length || 0 : 0,
        athleteCount: athleteResult.success ? athleteResult.users?.length || 0 : 0,
        activePrograms: 0, // TODO: Calculate from programs data
        upcomingEvents,
        totalRevenue,
        activePackages,
        recentActivity: activity.slice(0, 5)
      });
    } catch (error) {
      console.error('Error loading PRO dashboard:', error);
    }
  };

  const loadStaffDashboard = async () => {
    if (!user?.proId) return;

    try {
      // Load events for this staff member (with error handling)
      let myEvents: any[] = [];
      // Temporarily disabled calendar service to avoid index errors during development
      /*
      try {
        const eventsResult = await getUpcomingEvents(user.proId);
        myEvents = eventsResult.success ? 
          eventsResult.events?.filter(e => e.attendees?.includes(user.uid)) || [] : [];
      } catch (calendarError) {
        console.warn('Calendar service temporarily unavailable:', calendarError);
        // Continue without calendar data
      }
      */

      // Load athletes assigned to this staff member (simplified - would need additional field)
      const athletesResult = await getUsersByRole(user.proId, 'ATHLETE');
      const assignedAthletes = athletesResult.success ? athletesResult.users || [] : [];

      const activity: DashboardStats['recentActivity'] = [];
      
      // Add recent events to activity
      myEvents.slice(0, 3).forEach(event => {
        activity.push({
          id: event.id || '',
          type: 'event',
          title: 'Your Session',
          description: `${event.title} - ${event.startsAt.toDate().toLocaleDateString()}`,
          timestamp: event.startsAt.toDate(),
          icon: '📅'
        });
      });

      setStats({
        staffCount: 0,
        athleteCount: assignedAthletes.length,
        activePrograms: 0, // TODO: Calculate assigned programs
        upcomingEvents: myEvents.length,
        totalRevenue: 0,
        activePackages: 0,
        recentActivity: activity
      });
    } catch (error) {
      console.error('Error loading STAFF dashboard:', error);
    }
  };

  const loadAthleteDashboard = async () => {
    if (!user) return;

    try {
      // Load upcoming events for this athlete (with error handling)
      let myEvents: any[] = [];
      // Temporarily disabled calendar service to avoid index errors during development
      /*
      try {
        const eventsResult = await getUpcomingEvents(user.proId || '');
        myEvents = eventsResult.success ? 
          eventsResult.events?.filter(e => e.attendees?.includes(user.uid)) || [] : [];
      } catch (calendarError) {
        console.warn('Calendar service temporarily unavailable:', calendarError);
        // Continue without calendar data
      }
      */

      // Load athlete's package purchases
      const packagesResult = await getAthletePackages(user.uid);
      const activePackages = packagesResult.success ? 
        packagesResult.purchases?.filter(p => p.status === 'active').length || 0 : 0;

      // Load payment history
      const paymentsResult = await getPaymentsByPayer(user.uid);
      
      const activity: DashboardStats['recentActivity'] = [];
      
      // Add recent payments to activity
      if (paymentsResult.success && paymentsResult.payments) {
        paymentsResult.payments.slice(0, 2).forEach(payment => {
          activity.push({
            id: payment.id || '',
            type: 'payment',
            title: 'Payment Made',
            description: `$${(payment.amount / 100).toFixed(2)} for training package`,
            timestamp: payment.createdAt.toDate(),
            icon: '💳'
          });
        });
      }

      // Add upcoming sessions to activity
      myEvents.slice(0, 3).forEach(event => {
        activity.push({
          id: event.id || '',
          type: 'event',
          title: 'Upcoming Session',
          description: `${event.title} - ${event.startsAt.toDate().toLocaleDateString()}`,
          timestamp: event.startsAt.toDate(),
          icon: '🏋️'
        });
      });

      activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setStats({
        staffCount: 0,
        athleteCount: 0,
        activePrograms: activePackages, // Using packages as programs
        upcomingEvents: myEvents.length,
        totalRevenue: 0,
        activePackages,
        recentActivity: activity.slice(0, 5)
      });
    } catch (error) {
      console.error('Error loading ATHLETE dashboard:', error);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create-program':
        navigate('/app/programs');
        break;
      case 'schedule-session':
        navigate('/app/calendar');
        break;
      case 'send-message':
        navigate('/app/messages');
        break;
      case 'view-packages':
        navigate('/app/packages');
        break;
      case 'invite-team':
        navigate('/app/team');
        break;
      case 'view-payments':
        navigate('/app/payments');
        break;
      default:
        break;
    }
  };

  const getRoleSpecificContent = (role: UserRole) => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (role) {
      case 'PRO':
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Staff Members</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.staffCount}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <span className="text-2xl">👥</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Athletes</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.athleteCount}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                    <span className="text-2xl">🏃</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Packages</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activePackages}</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <span className="text-2xl">📦</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue (Total)</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      ${(stats.totalRevenue / 100).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PRO Status Warning */}
            {proStatus !== 'active' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Complete Your PRO Subscription
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <p>Unlock all PRO features including unlimited team members and advanced analytics.</p>
                    </div>
                    <div className="mt-4">
                      <button 
                        onClick={() => navigate('/app/payments')}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors"
                      >
                        Complete Subscription
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Events and Today's Schedule - 40/60 Split */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Upcoming Events Widget - 40% */}
              <div className="lg:col-span-2">
                {user && (
                  <UpcomingEventsWidget 
                    userId={user.uid} 
                    proId={user.proId || user.uid} 
                    userRole={user.role} 
                  />
                )}
              </div>

              {/* Today's Schedule - 60% */}
              <div className="lg:col-span-3 bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
                {user && (
                  <CalendarWidget 
                    userId={user.uid} 
                    proId={user.proId || user.uid} 
                    userRole={user.role} 
                  />
                )}
              </div>
            </div>

            {/* Weekly Calendar - Full Width */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
              {user && (
                <WeeklyCalendar 
                  userId={user.uid} 
                  proId={user.proId || user.uid} 
                  userRole={user.role} 
                />
              )}
            </div>
          </div>
        );

      case 'STAFF':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned Athletes</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.athleteCount}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <span className="text-2xl">🏃</span>
                  </div>
            </div>
          </div>

              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Upcoming Sessions</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.upcomingEvents}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                    <span className="text-2xl">📅</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Programs</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activePrograms}</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <span className="text-2xl">📋</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => handleQuickAction('create-program')}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">📝</div>
                    <div className="font-medium text-gray-900 dark:text-white">Create Program</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Design workout plans</div>
                  </div>
                </button>
                
                <button 
                  onClick={() => handleQuickAction('schedule-session')}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">📅</div>
                    <div className="font-medium text-gray-900 dark:text-white">Schedule Session</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Book with athletes</div>
        </div>
                </button>
                
                <button 
                  onClick={() => handleQuickAction('send-message')}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">💬</div>
                    <div className="font-medium text-gray-900 dark:text-white">Message Athletes</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Send updates</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Upcoming Events and Today's Schedule - 40/60 Split */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Upcoming Events Widget - 40% */}
              <div className="lg:col-span-2">
                {user && (
                  <UpcomingEventsWidget 
                    userId={user.uid} 
                    proId={user.proId || user.uid} 
                    userRole={user.role} 
                  />
                )}
              </div>

              {/* Today's Schedule - 60% */}
              <div className="lg:col-span-3 bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
                {user && (
                  <CalendarWidget 
                    userId={user.uid} 
                    proId={user.proId || user.uid} 
                    userRole={user.role} 
                  />
                )}
              </div>
            </div>
          </div>
        );

      case 'ATHLETE':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Packages</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activePackages}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <span className="text-2xl">📦</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Upcoming Sessions</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.upcomingEvents}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                    <span className="text-2xl">🏋️</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Programs</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activePrograms}</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <span className="text-2xl">📋</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => handleQuickAction('view-packages')}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">📦</div>
                    <div className="font-medium text-gray-900 dark:text-white">Browse Packages</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Find training plans</div>
                  </div>
                </button>
                
                <button 
                  onClick={() => handleQuickAction('schedule-session')}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">📅</div>
                    <div className="font-medium text-gray-900 dark:text-white">View Schedule</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Check sessions</div>
                  </div>
                </button>
                
                <button 
                  onClick={() => handleQuickAction('send-message')}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">💬</div>
                    <div className="font-medium text-gray-900 dark:text-white">Message Coach</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Get support</div>
                  </div>
                </button>
          </div>
        </div>

            {/* Weekly Calendar - Full Width */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
              {user && (
                <WeeklyCalendar 
                  userId={user.uid} 
                  proId={user.proId || user.uid} 
                  userRole={user.role} 
                />
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Welcome!</h3>
            <p className="text-gray-600 dark:text-gray-400">Your role is being determined...</p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Welcome back, {user?.displayName || user?.email}!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {role} Dashboard • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-6xl">
            {role === 'PRO' ? '💼' : role === 'STAFF' ? '👨‍💼' : '🏃‍♂️'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {role ? getRoleSpecificContent(role) : (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {stats.recentActivity.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                <div className="text-2xl">{activity.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {activity.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 