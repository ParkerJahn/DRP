import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  getEventsByPro, 
  getEventsByAttendee
} from '../services/calendar';
import { getUsersByRole } from '../services/firebase';
import { 
  createAvailabilitySlot, 
  getUserAvailabilitySlots, 
  getActiveAvailabilitySlots,
  updateAvailabilitySlot, 
  deleteAvailabilitySlot
} from '../services/availability';
import type { AvailabilitySlot } from '../services/availability';
import type { Event, EventType, User } from '../types';
import { Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<(Event & { id: string })[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  
  // Availability state
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [isManagingAvailability, setIsManagingAvailability] = useState(false);
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);
  const [availabilityChanges, setAvailabilityChanges] = useState<Record<number, Partial<AvailabilitySlot>>>({});
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    event: Event | null;
  }>({
    isOpen: false,
    event: null
  });
  
  // Debounced hover handler to reduce excessive re-renders
  const debouncedSetHover = useCallback((date: string | null, position?: { x: number; y: number }) => {
    setTimeout(() => {
      setHoveredDate(date);
      if (position) {
        setHoverPosition(position);
      }
    }, 50); // Small delay to reduce rapid state changes
  }, []);
  
  // Form state
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'session' as EventType,
    startsAt: '',
    endsAt: '',
    attendees: [] as string[],
    visibility: 'team' as 'team' | 'attendees'
  });

  // Availability form state
  const [availabilityForm, setAvailabilityForm] = useState({
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '17:00',
    isRecurring: true,
    startDate: '',
    endDate: '',
    isActive: true
  });

  useEffect(() => {
    if (user) {
      loadEvents();
      loadTeamMembers();
      // Load availability slots for all users so they can see when coaches are available
      loadAvailabilitySlots();
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
      
      if (result.success && 'events' in result) {
        setEvents(result.events || []);
        if ((result.events || []).length === 0) {
          console.log('Calendar: No events found in database');
        } else {
          console.log('Calendar: Total events loaded:', (result.events || []).length);
        }
      } else {
        console.error('Failed to load events:', result.error);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailabilitySlots = async () => {
    if (!user) return;
    
    try {
      let result: { success: boolean; slots?: AvailabilitySlot[]; error?: string } | null = null;
      if (user.role === 'PRO') {
        // PRO sees all team availability
        try {
          const availabilityResult = await getUserAvailabilitySlots(user.uid);
          result = {
            success: availabilityResult.success,
            slots: availabilityResult.slots,
            error: availabilityResult.error ? String(availabilityResult.error) : undefined
          };
        } catch (error) {
          result = { success: false, error: String(error) };
        }
      } else if (user.role === 'STAFF') {
        // STAFF sees their own availability
        try {
          const availabilityResult = await getActiveAvailabilitySlots(user.uid);
          result = {
            success: availabilityResult.success,
            slots: availabilityResult.slots,
            error: availabilityResult.error ? String(availabilityResult.error) : undefined
          };
        } catch (error) {
          result = { success: false, error: String(error) };
        }
      } else if (user.role === 'ATHLETE') {
        // ATHLETES see team availability for booking
        try {
          const availabilityResult = await getUserAvailabilitySlots(user.proId || user.uid);
          result = {
            success: availabilityResult.success,
            slots: availabilityResult.slots,
            error: availabilityResult.error ? String(availabilityResult.error) : undefined
          };
        } catch (error) {
          result = { success: false, error: String(error) };
        }
      }
      
      if (result && result.success) {
        setAvailabilitySlots(result.slots || []);
      } else {
        console.error('Failed to load availability slots:', result?.error || 'No result');
      }
    } catch (error) {
      console.error('Error loading availability slots:', error);
    }
  };

  const handleCreateAvailabilitySlot = async () => {
    if (!user || !availabilityForm.startTime || !availabilityForm.endTime) return;
    
    try {
      const slotData = {
        proId: user.proId || user.uid,
        userId: user.uid,
        dayOfWeek: availabilityForm.dayOfWeek,
        startTime: availabilityForm.startTime,
        endTime: availabilityForm.endTime,
        isRecurring: availabilityForm.isRecurring,
        startDate: availabilityForm.startDate ? Timestamp.fromDate(new Date(availabilityForm.startDate)) : undefined,
        endDate: availabilityForm.endDate ? Timestamp.fromDate(new Date(availabilityForm.endDate)) : undefined,
        isActive: availabilityForm.isActive
      };
      
      const result = await createAvailabilitySlot(user.uid, slotData);
      if (result.success) {
        await loadAvailabilitySlots();
        resetAvailabilityForm();
      } else {
        console.error('Calendar: Failed to create availability slot:', result.error);
        alert('Failed to create availability slot');
      }
    } catch (error) {
      console.error('Calendar: Error creating availability slot:', error);
      alert('Error creating availability slot');
    }
  };

  // const handleUpdateAvailabilitySlot = async (slotId: string) => {
  //   if (!availabilityForm.startTime || !availabilityForm.endTime) return;
    
  //   try {
  //     const updates = {
  //       dayOfWeek: availabilityForm.dayOfWeek,
  //       startTime: availabilityForm.startTime,
  //       endTime: availabilityForm.endTime,
  //       isRecurring: availabilityForm.isRecurring,
  //       startDate: availabilityForm.startDate ? Timestamp.fromDate(new Date(availabilityForm.startDate)) : undefined,
  //       endDate: availabilityForm.endDate ? Timestamp.fromDate(new Date(availabilityForm.endDate)) : undefined,
  //       isActive: availabilityForm.isActive
  //     };
      
  //     const result = await updateAvailabilitySlot(slotId, updates);
  //     if (result.success) {
  //       await loadAvailabilitySlots();
  //       resetAvailabilityForm();
  //     } else {
  //       alert('Failed to update availability slot');
  //     }
  //   } catch (error) {
  //     console.error('Error updating availability slot:', error);
  //     alert('Error updating availability slot');
  //   }
  // };

  const handleDeleteAvailabilitySlot = async (slotId: string) => {
    if (!user || !confirm('Are you sure you want to delete this availability slot?')) return;
    
    try {
      const result = await deleteAvailabilitySlot(user.uid, slotId);
      if (result.success) {
        await loadAvailabilitySlots();
      } else {
        alert('Failed to delete availability slot');
      }
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      alert('Error deleting availability slot');
    }
  };

  const handleAvailabilityChange = (dayOfWeek: number, field: string, value: string | boolean) => {
    setAvailabilityChanges(prev => {
      const newChanges = {
        ...prev,
        [dayOfWeek]: {
          ...prev[dayOfWeek],
          [field]: value
        }
      };
      
      return newChanges;
    });
  };

  const handleSaveAllAvailability = async () => {
    if (!user) return;
    
    try {
      const changesEntries = Object.entries(availabilityChanges);
      if (changesEntries.length === 0) {
        alert('No changes to save');
        return;
      }

      // Process each day's changes
      for (const [dayOfWeekStr, dayChanges] of changesEntries) {
        const dayOfWeek = parseInt(dayOfWeekStr);
        const existingSlot = availabilitySlots.find(slot => slot.dayOfWeek === dayOfWeek);
        
        if (existingSlot) {
          // Update existing slot
          if (dayChanges.isActive === false) {
            // Delete slot if marked as inactive
            await deleteAvailabilitySlot(user.uid, existingSlot.id!);
          } else {
            // Update slot with new times
            const updates = {
              startTime: dayChanges.startTime || existingSlot.startTime,
              endTime: dayChanges.endTime || existingSlot.endTime,
              isActive: dayChanges.isActive !== undefined ? dayChanges.isActive : existingSlot.isActive
            };
            
            const result = await updateAvailabilitySlot(user.uid, existingSlot.id!, updates);
            if (!result.success) {
              console.error(`Failed to update day ${dayOfWeek}:`, result.error);
            }
          }
        } else if (dayChanges.isActive !== false) {
          // Create new slot
          const slotData = {
            proId: user.proId || user.uid,
            userId: user.uid,
            dayOfWeek,
            startTime: dayChanges.startTime || '09:00',
            endTime: dayChanges.endTime || '17:00',
            isRecurring: true,
            isActive: true
          };
          
          const result = await createAvailabilitySlot(user.uid, slotData);
          if (!result.success) {
            console.error(`Failed to create day ${dayOfWeek}:`, result.error);
          }
        }
      }

      // Reload availability slots and clear changes
      await loadAvailabilitySlots();
      setAvailabilityChanges({});
      alert('Availability schedule saved successfully!');
      
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Error saving availability schedule');
    }
  };

  const resetAvailabilityForm = () => {
    setAvailabilityForm({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      isRecurring: true,
      startDate: '',
      endDate: '',
      isActive: true
    });
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
      
      const result = await createEvent(user.uid, eventData);
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
    if (!user || !eventForm.title || !eventForm.startsAt || !eventForm.endsAt) return;
    
    try {
      const updates = {
        title: eventForm.title,
        type: eventForm.type,
        startsAt: Timestamp.fromDate(new Date(eventForm.startsAt)),
        endsAt: Timestamp.fromDate(new Date(eventForm.endsAt)),
        attendees: eventForm.attendees,
        visibility: eventForm.visibility
      };
      
      const result = await updateEvent(user.uid, eventId, updates);
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

  // Refresh user auth token to get latest permissions
  const refreshUserToken = async () => {
    if (!user) return;
    
    try {
      // Force refresh the user's ID token to get latest custom claims
      await getAuth().currentUser?.getIdToken(true);
      console.log('Calendar: User token refreshed');
    } catch (error) {
      console.error('Error refreshing user token:', error);
    }
  };

  // Handle event deletion with confirmation
  const handleDeleteEvent = async () => {
    if (!user || !deleteModal.event) return;
    
    try {
      // Refresh user token first to ensure latest permissions
      await refreshUserToken();
      
      // The event object has an id property from Firestore
      const eventId = (deleteModal.event as Event & { id: string }).id;
      if (!eventId) {
        alert('Event ID not found');
        return;
      }
      
      console.log('Calendar: Attempting to delete event:', {
        eventId,
        eventData: deleteModal.event,
        currentUser: {
          uid: user?.uid,
          role: user?.role,
          proId: user?.proId
        }
      });
      
      const result = await deleteEvent(user.uid, eventId);
      if (result.success) {
        await loadEvents(); // Reload events after deletion
        setDeleteModal({ isOpen: false, event: null });
      } else {
        alert('Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event');
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (event: Event) => {
    setDeleteModal({ isOpen: true, event });
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

  // Get availability slots for a specific date
  const getAvailabilityForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const slots = availabilitySlots.filter(slot => 
      slot.dayOfWeek === dayOfWeek && 
      slot.isActive && 
      slot.isRecurring
    );
    
    return slots;
  };

  // Convert 24-hour format to 12-hour AM/PM format
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Optimized user lookup functions using useMemo to prevent recalculation
  const userLookupMap = useMemo(() => {
    const map = new Map<string, User>();
    teamMembers.forEach(member => {
      map.set(member.uid, member);
    });
    return map;
  }, [teamMembers]);

  // Memoized user functions to prevent recreating on every render
  const getUserInitials = useCallback((userId: string) => {
    const user = userLookupMap.get(userId);
    if (!user) return '??';
    
    const firstName = user.firstName || user.displayName?.split(' ')[0] || '';
    const lastName = user.lastName || user.displayName?.split(' ')[1] || '';
    
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }, [userLookupMap]);

  const getUserName = useCallback((userId: string) => {
    const user = userLookupMap.get(userId);
    if (!user) return 'Unknown User';
    
    return user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
  }, [userLookupMap]);

  // Convert availability slot to display format with initials
  const formatAvailabilitySlotWithInitials = (slot: AvailabilitySlot) => {
    const initials = getUserInitials(slot.userId);
    
    return {
      id: `availability-${slot.id}`,
      title: `${initials} - Available`,
      type: 'availability' as const,
      isAvailability: true,
      startTime: slot.startTime,
      endTime: slot.endTime,
      userId: slot.userId,
      userName: getUserName(slot.userId),
      formattedTime: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`
    };
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

  // Memoized Day Hover Popup Component to prevent unnecessary re-renders
  const DayHoverPopup = React.memo<{ 
    date: Date; 
    events: Event[]; 
    availability: Array<{
      id: string;
      title: string;
      type: string;
      isAvailability: boolean;
      startTime: string;
      endTime: string;
      userId: string;
      userName: string;
      formattedTime: string;
    }>
  }>(({ date, events, availability }) => {
    
    if (!hoveredDate || hoveredDate !== date.toDateString()) {
      return null;
    }

    return (
      <div
        className="fixed z-50 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 min-w-[280px] max-w-[400px]"
        style={{
          left: hoverPosition.x,
          top: hoverPosition.y - 10,
          transform: 'translateX(-50%)'
        }}
      >
        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        
        <div className="space-y-2">
          {/* Availability Section */}
          {availability.length > 0 && (
            <div>
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Available Staff:</div>
              {availability.map((avail, index) => (
                <div key={index} className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    {avail.userName}
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">
                    {avail.formattedTime}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Events Section */}
          {events.length > 0 && (
            <div className={availability.length > 0 ? 'mt-3 pt-3 border-t border-gray-200 dark:border-gray-600' : ''}>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scheduled Events:</div>
              {events.map((event, eventIndex) => (
                <div key={eventIndex} className="text-xs bg-gray-50 dark:bg-neutral-700 p-2 rounded group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{event.title}</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {new Date(event.startsAt.toDate()).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} - {new Date(event.endsAt.toDate()).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(event);
                      }}
                      className="ml-2 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold leading-none transition-opacity duration-200"
                      title="Delete event"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Empty State */}
          {availability.length === 0 && events.length === 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
              No events or availability scheduled
            </div>
          )}
        </div>
      </div>
    );
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-3 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-ethnocentric">Calendar</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
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

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setIsManagingAvailability(false)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              !isManagingAvailability
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            📅 Events
          </button>
          {(user.role === 'PRO' || user.role === 'STAFF') && (
            <button
              onClick={() => setIsManagingAvailability(true)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isManagingAvailability
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              ⏰ Availability
            </button>
          )}
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
        {!isManagingAvailability ? (
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

                  // Get availability slots for this day
                  const dayAvailability = getAvailabilityForDate(date);
                  const availabilityDisplays = dayAvailability.map(formatAvailabilitySlotWithInitials);

                  return (
                    <div
                      key={i}
                      className={`min-h-[120px] p-2 border border-gray-100 dark:border-gray-700 ${
                        date.getMonth() === selectedDate.getMonth() ? 'bg-white dark:bg-neutral-800' : 'bg-gray-50 dark:bg-neutral-900'
                      } relative cursor-pointer`}
                      onMouseEnter={(e) => {
                        debouncedSetHover(date.toDateString(), {
                          x: e.currentTarget.getBoundingClientRect().left + e.currentTarget.getBoundingClientRect().width / 2,
                          y: e.currentTarget.getBoundingClientRect().top
                        });
                      }}
                      onMouseLeave={() => {
                        debouncedSetHover(null);
                      }}
                    >
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {/* Show availability slots first */}
                        {availabilityDisplays.map((availability, availIndex) => (
                          <div
                            key={availIndex}
                            className="text-xs p-1 rounded truncate bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
                            title={`${availability.userName}: ${availability.formattedTime}`}
                          >
                            {availability.title}
                          </div>
                        ))}
                        
                        {/* Show regular events */}
                        {dayEvents.map((event, eventIndex) => {
                          return (
                            <div
                              key={eventIndex}
                              className={`text-xs p-1 rounded truncate ${getEventTypeColor(event.type)} text-white cursor-pointer hover:opacity-80 relative group`}
                              title={event.title}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(event);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="flex-1 truncate">
                                  {getEventTypeIcon(event.type)} {event.title}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteModal(event);
                                  }}
                                  className="ml-1 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold leading-none transition-opacity duration-200"
                                  title="Delete event"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Hover Popup */}
                      <DayHoverPopup 
                        date={date} 
                        events={dayEvents} 
                        availability={availabilityDisplays} 
                      />
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

                  // Get availability slots for this day
                  const dayAvailability = getAvailabilityForDate(date);
                  const availabilityDisplays = dayAvailability.map(formatAvailabilitySlotWithInitials);

                  return (
                    <div 
                      key={i} 
                      className="min-h-[200px] p-2 border border-gray-100 dark:border-gray-700 bg-white dark:bg-neutral-800 relative cursor-pointer"
                      onMouseEnter={(e) => {
                        debouncedSetHover(date.toDateString(), {
                          x: e.currentTarget.getBoundingClientRect().left + e.currentTarget.getBoundingClientRect().width / 2,
                          y: e.currentTarget.getBoundingClientRect().top
                        });
                      }}
                      onMouseLeave={() => {
                        debouncedSetHover(null);
                      }}
                    >
                      <div className="space-y-1">
                        {/* Show availability slots first */}
                        {availabilityDisplays.map((availability, availIndex) => (
                          <div
                            key={availIndex}
                            className="text-xs p-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
                            title={`${availability.userName}: ${availability.formattedTime}`}
                          >
                            <div className="font-medium">{availability.title}</div>
                            <div className="text-xs opacity-90">
                              {availability.title.replace('Available ', '')}
                            </div>
                          </div>
                        ))}
                        
                        {/* Show regular events */}
                        {dayEvents.map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            className={`text-xs p-2 rounded ${getEventTypeColor(event.type)} text-white cursor-pointer hover:opacity-80 relative group`}
                            title={event.title}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(event);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{event.title}</div>
                                <div className="text-xs opacity-90">
                                  {new Date(event.startsAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteModal(event);
                                }}
                                className="ml-2 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold leading-none transition-opacity duration-200"
                                title="Delete event"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Hover Popup */}
                      <DayHoverPopup 
                        date={date} 
                        events={dayEvents} 
                        availability={availabilityDisplays} 
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {view === 'day' && (
              <div className="p-4">
                <div className="space-y-3">
                  {/* Show availability for the selected day */}
                  {getAvailabilityForDate(selectedDate).map((slot, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-blue-900 dark:text-blue-100">⏰ Available Time</h3>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {slot.isRecurring ? 'Weekly recurring' : 'One-time availability'}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500 text-white">
                          availability
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show regular events */}
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
                  
                  {getCurrentDayEvents().length === 0 && getAvailabilityForDate(selectedDate).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <div className="text-4xl mb-2">📅</div>
                      <p>No events or availability scheduled for this day</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Availability Management UI */
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-ethnocentric">Weekly Availability Schedule</h3>
              <button
                onClick={() => {
                  // Save all changes
                  handleSaveAllAvailability();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                💾 Save All Changes
              </button>
            </div>

            {/* Weekly Availability Grid */}
            <div className="grid grid-cols-7 gap-4">
              {['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((dayName, dayIndex) => {
                const dayOfWeek = (dayIndex + 6) % 7; // Saturday = 0, Sunday = 1, Monday = 2, etc.
                const existingSlot = availabilitySlots.find(slot => slot.dayOfWeek === dayOfWeek);
                
                return (
                  <div key={dayIndex} className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-center mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">{dayName}</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={availabilityChanges[dayOfWeek]?.startTime || existingSlot?.startTime || '09:00'}
                          onChange={(e) => handleAvailabilityChange(dayOfWeek, 'startTime', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Time</label>
                        <input
                          type="time"
                          value={availabilityChanges[dayOfWeek]?.endTime || existingSlot?.endTime || '17:00'}
                          onChange={(e) => handleAvailabilityChange(dayOfWeek, 'endTime', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      
                      <div className="flex items-center justify-center">
                        <label className="flex items-center text-xs">
                          <input
                            type="checkbox"
                            checked={availabilityChanges[dayOfWeek]?.isActive !== undefined ? availabilityChanges[dayOfWeek]?.isActive : existingSlot?.isActive !== false}
                            onChange={(e) => handleAvailabilityChange(dayOfWeek, 'isActive', e.target.checked)}
                            className="mr-1"
                          />
                          <span className="text-gray-600 dark:text-gray-400">Active</span>
                        </label>
                      </div>
                      
                      {existingSlot && (
                        <button
                          onClick={() => handleDeleteAvailabilitySlot(existingSlot.id!)}
                          className="w-full px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info Text */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Set your weekly availability schedule. Changes are saved automatically.</p>
              <p className="mt-1">Uncheck "Active" to disable a day, or set times to 00:00 to remove it.</p>
            </div>
          </div>
        )}

        {/* Events List */}
        {!isManagingAvailability && (
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
                              handleDeleteEvent();
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
        )}
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
                    onChange={(e) => {
                      const newStartTime = e.target.value;
                      
                      // Calculate smart end time (1 hour after start time)
                      let smartEndTime = eventForm.endsAt;
                      if (newStartTime) {
                        const startDate = new Date(newStartTime);
                        const endDate = new Date(startDate.getTime() + (60 * 60 * 1000)); // Add 1 hour
                        const suggestedEndTime = endDate.toISOString().slice(0, 16);
                        
                        // Update end time if it's empty or before the new start time
                        if (!eventForm.endsAt || new Date(eventForm.endsAt) <= startDate) {
                          smartEndTime = suggestedEndTime;
                        }
                      }
                      
                      setEventForm(prev => ({ 
                        ...prev, 
                        startsAt: newStartTime,
                        endsAt: smartEndTime
                      }));
                    }}
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
                    min={eventForm.startsAt} // Prevent selecting end time before start time
                    onChange={(e) => {
                      const newEndTime = e.target.value;
                      
                      // Validate that end time is after start time
                      if (eventForm.startsAt && newEndTime && new Date(newEndTime) <= new Date(eventForm.startsAt)) {
                        // If user tries to set end time before start time, set it to 1 hour after start
                        const startDate = new Date(eventForm.startsAt);
                        const suggestedEndTime = new Date(startDate.getTime() + (60 * 60 * 1000)).toISOString().slice(0, 16);
                        setEventForm(prev => ({ ...prev, endsAt: suggestedEndTime }));
                        return;
                      }
                      
                      setEventForm(prev => ({ ...prev, endsAt: newEndTime }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 <strong>Smart scheduling:</strong> End time automatically adjusts to 1 hour after start time
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Attendees ({eventForm.attendees.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEventForm(prev => ({
                          ...prev,
                          attendees: teamMembers.map(member => member.uid)
                        }));
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-gray-400">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEventForm(prev => ({
                          ...prev,
                          attendees: []
                        }));
                      }}
                      className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 p-2">
                  {teamMembers.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                      No team members available
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {teamMembers.map((member) => {
                        const isSelected = eventForm.attendees.includes(member.uid);
                        return (
                          <label
                            key={member.uid}
                            className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Add attendee
                                  setEventForm(prev => ({
                                    ...prev,
                                    attendees: [...prev.attendees, member.uid]
                                  }));
                                } else {
                                  // Remove attendee
                                  setEventForm(prev => ({
                                    ...prev,
                                    attendees: prev.attendees.filter(uid => uid !== member.uid)
                                  }));
                                }
                              }}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {member.displayName || `${member.firstName} ${member.lastName}`}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {member.role}
                                {member.email && ` • ${member.email}`}
                              </p>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${
                              isSelected 
                                ? 'bg-indigo-500' 
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`} />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  📱 Tap to select/deselect attendees • {eventForm.attendees.length} of {teamMembers.length} selected
                </p>
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

      {/* Create/Edit Availability Modal */}
      {isCreatingAvailability && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Availability Slot
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Day of Week
                </label>
                <select
                  value={availabilityForm.dayOfWeek}
                  onChange={(e) => setAvailabilityForm({ ...availabilityForm, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                >
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={availabilityForm.startTime}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={availabilityForm.endTime}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={availabilityForm.isRecurring}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, isRecurring: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Weekly recurring</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setIsCreatingAvailability(false);
                  resetAvailabilityForm();
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleCreateAvailabilitySlot();
                  setIsCreatingAvailability(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Event
              </h3>
              <button
                onClick={() => setDeleteModal({ isOpen: false, event: null })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete "{deleteModal.event?.title}"? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, event: null })}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar; 