import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { Event, EventType } from '../types';

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    loadEvents();
  }, [user, selectedDate]);

  const loadEvents = async () => {
    // TODO: Implement event loading from Firestore
    setLoading(false);
    // Mock data for now
    setEvents([
      {
        proId: user?.proId || '',
        title: 'Team Training Session',
        type: 'session',
        startsAt: { toDate: () => new Date() } as any,
        endsAt: { toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000) } as any,
        createdBy: user?.uid || '',
        attendees: [user?.uid || ''],
        visibility: 'team',
        createdAt: { toDate: () => new Date() } as any,
        updatedAt: { toDate: () => new Date() } as any
      }
    ]);
  };

  const canCreateEvent = user?.role === 'PRO' || user?.role === 'STAFF';

  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case 'availability': return 'bg-blue-500';
      case 'session': return 'bg-green-500';
      case 'booking': return 'bg-purple-500';
      case 'meeting': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeIcon = (type: EventType) => {
    switch (type) {
      case 'availability': return '📅';
      case 'session': return '💪';
      case 'booking': return '📋';
      case 'meeting': return '🤝';
      default: return '📌';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex bg-gray-100 dark:bg-neutral-700 rounded-lg p-1">
              {(['month', 'week', 'day'] as const).map((viewOption) => (
                <button
                  key={viewOption}
                  onClick={() => setView(viewOption)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    view === viewOption
                      ? 'bg-white dark:bg-neutral-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {viewOption.charAt(0).toUpperCase() + viewOption.slice(1)}
                </button>
              ))}
            </div>

            {/* Create Event Button */}
            {canCreateEvent && (
              <button
                onClick={() => setIsCreatingEvent(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                + Create Event
              </button>
            )}
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => {
              const newDate = new Date(selectedDate);
              if (view === 'month') {
                newDate.setMonth(newDate.getMonth() - 1);
              } else if (view === 'week') {
                newDate.setDate(newDate.getDate() - 7);
              } else {
                newDate.setDate(newDate.getDate() - 1);
              }
              setSelectedDate(newDate);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            ←
          </button>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {view === 'month' && selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            {view === 'week' && `Week of ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            {view === 'day' && selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>

          <button
            onClick={() => {
              const newDate = new Date(selectedDate);
              if (view === 'month') {
                newDate.setMonth(newDate.getMonth() + 1);
              } else if (view === 'week') {
                newDate.setDate(newDate.getDate() + 7);
              } else {
                newDate.setDate(newDate.getDate() + 1);
              }
              setSelectedDate(newDate);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            →
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {view === 'month' && (
            <div className="grid grid-cols-7">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-3 text-center font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-neutral-700">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {Array.from({ length: 35 }, (_, i) => {
                const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                date.setDate(date.getDate() + i - date.getDay());
                
                const dayEvents = events.filter(event => {
                  const eventDate = new Date(event.startsAt.toDate());
                  return eventDate.toDateString() === date.toDateString();
                });

                return (
                  <div
                    key={i}
                    className={`min-h-[120px] p-2 border border-gray-100 dark:border-gray-700 ${
                      date.getMonth() === selectedDate.getMonth() ? 'bg-white dark:bg-neutral-800' : 'bg-gray-50 dark:bg-neutral-900'
                    }`}
                  >
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`text-xs p-1 rounded truncate ${getEventTypeColor(event.type)} text-white`}
                          title={event.title}
                        >
                          {getEventTypeIcon(event.type)} {event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'week' && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Week view coming soon...
            </div>
          )}

          {view === 'day' && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Day view coming soon...
            </div>
          )}
        </div>

        {/* Events List */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upcoming Events</h3>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">📅</div>
              <h4 className="text-lg font-semibold mb-2">No events scheduled</h4>
              <p>Get started by creating your first event</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg"
                >
                  <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`}></div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{event.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(event.startsAt.toDate()).toLocaleDateString()} at{' '}
                      {new Date(event.startsAt.toDate()).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.type)} text-white`}>
                    {event.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {isCreatingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Event
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This feature will allow you to create team events, training sessions, and manage availability.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCreatingEvent(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsCreatingEvent(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar; 