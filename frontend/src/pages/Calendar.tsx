import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  createEvent, 
  getEventsByPro, 
  getEventsByAttendee, 
  updateEvent, 
  deleteEvent
} from '../services/calendar';
import { getUsersByRole } from '../services/firebase';
import type { Event, EventType, User } from '../types';
import { Timestamp } from 'firebase/firestore';

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<(Event & { id: string })[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  
  // Form state
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'session' as EventType,
    startsAt: '',
    endsAt: '',
    attendees: [] as string[],
    visibility: 'team' as 'team' | 'attendees'
  });

  useEffect(() => {
    if (user) {
      loadEvents();
      loadTeamMembers();
    }
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let result;
      
      if (user.role === 'ATHLETE') {
        // Athletes see only events they're invited to
        result = await getEventsByAttendee(user.uid);
      } else {
        // PRO and Staff see all team events
        result = await getEventsByPro(user.proId || user.uid);
      }
      
      if (result.success) {
        setEvents(result.events || []);
      } else {
        console.error('Failed to load events:', result.error);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    if (!user || (user.role !== 'PRO' && user.role !== 'STAFF')) return;
    
    try {
      // Get both staff and athletes for the team
      const staffResult = await getUsersByRole(user.proId || user.uid, 'STAFF');
      const athleteResult = await getUsersByRole(user.proId || user.uid, 'ATHLETE');
      
      const allMembers = [
        ...(staffResult.success ? staffResult.users || [] : []),
        ...(athleteResult.success ? athleteResult.users || [] : [])
      ];
      
      setTeamMembers(allMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleCreateEvent = async () => {
    if (!user || !eventForm.title || !eventForm.startsAt || !eventForm.endsAt) return;
    
    try {
      const eventData = {
        proId: user.proId || user.uid,
        title: eventForm.title,
        type: eventForm.type,
        startsAt: Timestamp.fromDate(new Date(eventForm.startsAt)),
        endsAt: Timestamp.fromDate(new Date(eventForm.endsAt)),
        createdBy: user.uid,
        attendees: eventForm.attendees,
        visibility: eventForm.visibility
      };
      
      const result = await createEvent(eventData);
      if (result.success) {
        await loadEvents();
        resetForm();
        setIsCreatingEvent(false);
      } else {
        alert('Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event');
    }
  };

  const handleUpdateEvent = async (eventId: string) => {
    if (!eventForm.title || !eventForm.startsAt || !eventForm.endsAt) return;
    
    try {
      const updates = {
        title: eventForm.title,
        type: eventForm.type,
        startsAt: Timestamp.fromDate(new Date(eventForm.startsAt)),
        endsAt: Timestamp.fromDate(new Date(eventForm.endsAt)),
        attendees: eventForm.attendees,
        visibility: eventForm.visibility
      };
      
      const result = await updateEvent(eventId, updates);
      if (result.success) {
        await loadEvents();
        resetForm();
        setIsEditingEvent(null);
      } else {
        alert('Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Error updating event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const result = await deleteEvent(eventId);
      if (result.success) {
        await loadEvents();
      } else {
        alert('Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event');
    }
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      type: 'session',
      startsAt: '',
      endsAt: '',
      attendees: [],
      visibility: 'team'
    });
  };

  const openEditModal = (event: Event & { id: string }) => {
    setEventForm({
      title: event.title,
      type: event.type,
      startsAt: new Date(event.startsAt.toDate()).toISOString().slice(0, 16),
      endsAt: new Date(event.endsAt.toDate()).toISOString().slice(0, 16),
      attendees: event.attendees,
      visibility: event.visibility
    });
    setIsEditingEvent(event.id);
  };

  const canCreateEvent = user?.role === 'PRO' || user?.role === 'STAFF';
  const canEditEvent = user?.role === 'PRO' || user?.role === 'STAFF';

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

  const getCurrentMonthEvents = () => {
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    return events.filter(event => {
      const eventDate = new Date(event.startsAt.toDate());
      return eventDate >= startOfMonth && eventDate <= endOfMonth;
    });
  };

  const getCurrentWeekEvents = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return events.filter(event => {
      const eventDate = new Date(event.startsAt.toDate());
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    });
  };

  const getCurrentDayEvents = () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventDate = new Date(event.startsAt.toDate());
      return eventDate >= startOfDay && eventDate <= endOfDay;
    }).sort((a, b) => a.startsAt.toDate().getTime() - b.startsAt.toDate().getTime());
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
                
                const dayEvents = getCurrentMonthEvents().filter(event => {
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
                          className={`text-xs p-1 rounded truncate ${getEventTypeColor(event.type)} text-white cursor-pointer hover:opacity-80`}
                          title={event.title}
                          onClick={() => openEditModal(event)}
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
            <div className="grid grid-cols-7">
              {/* Week Headers */}
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date(selectedDate);
                date.setDate(selectedDate.getDate() - selectedDate.getDay() + i);
                return (
                  <div key={i} className="p-3 text-center font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-neutral-700">
                    <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-sm text-gray-500">{date.getDate()}</div>
                  </div>
                );
              })}

              {/* Week Events */}
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date(selectedDate);
                date.setDate(selectedDate.getDate() - selectedDate.getDay() + i);
                
                const dayEvents = getCurrentWeekEvents().filter(event => {
                  const eventDate = new Date(event.startsAt.toDate());
                  return eventDate.toDateString() === date.toDateString();
                });

                return (
                  <div key={i} className="min-h-[200px] p-2 border border-gray-100 dark:border-gray-700 bg-white dark:bg-neutral-800">
                    <div className="space-y-1">
                      {dayEvents.map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`text-xs p-2 rounded ${getEventTypeColor(event.type)} text-white cursor-pointer hover:opacity-80`}
                          title={event.title}
                          onClick={() => openEditModal(event)}
                        >
                          <div className="font-medium">{event.title}</div>
                          <div className="text-xs opacity-90">
                            {new Date(event.startsAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'day' && (
            <div className="p-4">
              <div className="space-y-3">
                {getCurrentDayEvents().map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border-l-4 ${getEventTypeColor(event.type)} border-l-4 bg-gray-50 dark:bg-neutral-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-600`}
                    onClick={() => openEditModal(event)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{event.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(event.startsAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                          {new Date(event.endsAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.type)} text-white`}>
                        {event.type}
                      </span>
                    </div>
                  </div>
                ))}
                
                {getCurrentDayEvents().length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">📅</div>
                    <p>No events scheduled for this day</p>
                  </div>
                )}
              </div>
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
              {events
                .filter(event => new Date(event.startsAt.toDate()) >= new Date())
                .slice(0, 10)
                .map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-600 cursor-pointer"
                    onClick={() => openEditModal(event)}
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
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.type)} text-white`}>
                        {event.type}
                      </span>
                      {canEditEvent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Event Modal */}
      {(isCreatingEvent || isEditingEvent) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-96 max-w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {isCreatingEvent ? 'Create New Event' : 'Edit Event'}
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (isCreatingEvent) {
                handleCreateEvent();
              } else if (isEditingEvent) {
                handleUpdateEvent(isEditingEvent);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Type *
                </label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm(prev => ({ ...prev, type: e.target.value as EventType }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="session">💪 Training Session</option>
                  <option value="meeting">🤝 Team Meeting</option>
                  <option value="availability">📅 Availability</option>
                  <option value="booking">📋 Client Booking</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={eventForm.startsAt}
                    onChange={(e) => setEventForm(prev => ({ ...prev, startsAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={eventForm.endsAt}
                    onChange={(e) => setEventForm(prev => ({ ...prev, endsAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attendees
                </label>
                <select
                  multiple
                  value={eventForm.attendees}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    setEventForm(prev => ({ ...prev, attendees: selectedOptions }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {teamMembers.map((member) => (
                    <option key={member.uid} value={member.uid}>
                      {member.displayName} ({member.role})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Visibility
                </label>
                <select
                  value={eventForm.visibility}
                  onChange={(e) => setEventForm(prev => ({ ...prev, visibility: e.target.value as 'team' | 'attendees' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="team">👥 Team (visible to all team members)</option>
                  <option value="attendees">👤 Attendees Only (private event)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingEvent(false);
                    setIsEditingEvent(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {isCreatingEvent ? 'Create Event' : 'Update Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar; 