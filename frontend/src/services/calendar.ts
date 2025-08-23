import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Event, EventType } from '../types';

// Event Management
export const createEvent = async (eventData: Omit<Event, 'createdAt' | 'updatedAt'>) => {
  try {
    const eventRef = await addDoc(collection(db, 'events'), {
      ...eventData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, eventId: eventRef.id };
  } catch (error) {
    console.error('Error creating event:', error);
    return { success: false, error };
  }
};

export const getEvent = async (eventId: string) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (eventSnap.exists()) {
      return { success: true, event: { id: eventSnap.id, ...eventSnap.data() } };
    } else {
      return { success: false, error: 'Event not found' };
    }
  } catch (error) {
    console.error('Error fetching event:', error);
    return { success: false, error };
  }
};

export const updateEvent = async (eventId: string, updates: Partial<Event>) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating event:', error);
    return { success: false, error };
  }
};

export const deleteEvent = async (eventId: string) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    await deleteDoc(eventRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting event:', error);
    return { success: false, error };
  }
};

// Get events by PRO
export const getEventsByPro = async (proId: string) => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef, 
      where('proId', '==', proId)
      // Removed orderBy to avoid composite index requirement
    );
    const querySnapshot = await getDocs(q);
    
    const events: Array<Event & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as Event & { id: string });
    });
    
    // Sort client-side instead
    events.sort((a, b) => a.startsAt.toDate().getTime() - b.startsAt.toDate().getTime());
    
    return { success: true, events };
  } catch (error) {
    console.error('Error fetching events by PRO:', error);
    return { success: false, error };
  }
};

// Get events by attendee
export const getEventsByAttendee = async (attendeeUid: string) => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef, 
      where('attendees', 'array-contains', attendeeUid)
      // Removed orderBy to avoid composite index requirement
    );
    const querySnapshot = await getDocs(q);
    
    const events: Array<Event & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as Event & { id: string });
    });
    
    // Sort client-side instead
    events.sort((a, b) => a.startsAt.toDate().getTime() - b.startsAt.toDate().getTime());
    
    return { success: true, events };
  } catch (error) {
    console.error('Error fetching events by attendee:', error);
    return { success: false, error };
  }
};

// Get events by type
export const getEventsByType = async (proId: string, type: EventType) => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef, 
      where('proId', '==', proId),
      where('type', '==', type)
      // Removed orderBy to avoid composite index requirement
    );
    const querySnapshot = await getDocs(q);
    
    const events: Array<Event & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as Event & { id: string });
    });
    
    // Sort client-side instead
    events.sort((a, b) => a.startsAt.toDate().getTime() - b.startsAt.toDate().getTime());
    
    return { success: true, events };
  } catch (error) {
    console.error('Error fetching events by type:', error);
    return { success: false, error };
  }
};

// Get upcoming events
export const getUpcomingEvents = async (proId: string, limit = 10) => {
  try {
    const now = new Date();
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef, 
      where('proId', '==', proId),
      where('startsAt', '>=', now)
      // Removed orderBy to avoid composite index requirement
    );
    const querySnapshot = await getDocs(q);
    
    const events: Array<Event & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as Event & { id: string });
    });
    
    // Sort client-side instead
    events.sort((a, b) => a.startsAt.toDate().getTime() - b.startsAt.toDate().getTime());
    
    return { success: true, events: events.slice(0, limit) };
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return { success: false, error };
  }
};

// Get events in date range
export const getEventsInRange = async (proId: string, startDate: Date, endDate: Date) => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef, 
      where('proId', '==', proId),
      where('startsAt', '>=', startDate),
      where('startsAt', '<=', endDate)
      // Removed orderBy to avoid composite index requirement
    );
    const querySnapshot = await getDocs(q);
    
    const events: Array<Event & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as Event & { id: string });
    });
    
    // Sort client-side instead
    events.sort((a, b) => a.startsAt.toDate().getTime() - b.startsAt.toDate().getTime());
    
    return { success: true, events };
  } catch (error) {
    console.error('Error fetching events in range:', error);
    return { success: false, error };
  }
};

// Add attendee to event
export const addEventAttendee = async (eventId: string, attendeeUid: string) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (eventSnap.exists()) {
      const event = eventSnap.data() as Event;
      const attendees = event.attendees || [];
      
      if (!attendees.includes(attendeeUid)) {
        attendees.push(attendeeUid);
        await updateDoc(eventRef, {
          attendees,
          updatedAt: serverTimestamp(),
        });
      }
      
      return { success: true };
    } else {
      return { success: false, error: 'Event not found' };
    }
  } catch (error) {
    console.error('Error adding attendee to event:', error);
    return { success: false, error };
  }
};

// Remove attendee from event
export const removeEventAttendee = async (eventId: string, attendeeUid: string) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (eventSnap.exists()) {
      const event = eventSnap.data() as Event;
      const attendees = event.attendees || [];
      const filteredAttendees = attendees.filter(uid => uid !== attendeeUid);
      
      await updateDoc(eventRef, {
        attendees: filteredAttendees,
        updatedAt: serverTimestamp(),
      });
      
      return { success: true };
    } else {
      return { success: false, error: 'Event not found' };
    }
  } catch (error) {
    console.error('Error removing attendee from event:', error);
    return { success: false, error };
  }
}; 