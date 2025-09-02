import { 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Event } from '../types';

// Event Management - Now using user subcollections
export const createEvent = async (userId: string, eventData: Omit<Event, 'createdAt' | 'updatedAt'>) => {
  try {
    const userEventsRef = collection(db, 'users', userId, 'events');
    const eventRef = await addDoc(userEventsRef, {
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

export const getEvent = async (userId: string, eventId: string) => {
  try {
    const eventRef = doc(db, 'users', userId, 'events', eventId);
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

export const updateEvent = async (userId: string, eventId: string, updates: Partial<Event>) => {
  try {
    const eventRef = doc(db, 'users', userId, 'events', eventId);
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

export const deleteEvent = async (userId: string, eventId: string) => {
  try {
    const eventRef = doc(db, 'users', userId, 'events', eventId);
    await deleteDoc(eventRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting event:', error);
    return { success: false, error };
  }
};

// Get events for a specific user
export const getUserEvents = async (userId: string) => {
  try {
    const userEventsRef = collection(db, 'users', userId, 'events');
    const q = query(userEventsRef, orderBy('startsAt', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const events: Array<Event & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as Event & { id: string });
    });
    
    return { success: true, events };
  } catch (error) {
    console.error('Error fetching user events:', error);
    return { success: false, error };
  }
};

// Get events by PRO - redesigned for subcollection architecture
export const getEventsByPro = async (proId: string) => {
  try {
    // First, get all users who belong to this PRO (including the PRO themselves)
    const usersRef = collection(db, 'users');
    const teamQuery = query(usersRef, where('proId', '==', proId));
    const teamSnapshot = await getDocs(teamQuery);
    
    // Also explicitly include the PRO user themselves in case proId doesn't match their own uid
    const proUserRef = doc(db, 'users', proId);
    const proUserSnap = await getDoc(proUserRef);
    
    const userIds = new Set<string>();
    
    // Add team members
    teamSnapshot.forEach((doc) => {
      userIds.add(doc.id);
    });
    
    // Add PRO user themselves if they exist and have PRO role
    if (proUserSnap.exists()) {
      const proUserData = proUserSnap.data();
      if (proUserData?.role === 'PRO') {
        userIds.add(proId);
      }
    }
    
    if (userIds.size === 0) {
      return { success: true, events: [] };
    }
    
    // Get events from each team member's subcollection
    const allEvents: Array<Event & { id: string; userId: string }> = [];
    
    for (const userId of userIds) {
      try {
        const userEventsRef = collection(db, 'users', userId, 'events');
        const eventsQuery = query(userEventsRef, orderBy('startsAt', 'asc'));
        const eventsSnapshot = await getDocs(eventsQuery);
        
        eventsSnapshot.forEach((doc) => {
          allEvents.push({ 
            id: doc.id, 
            userId: userId,
            ...doc.data() 
          } as Event & { id: string; userId: string });
        });
      } catch (error) {
        console.warn(`Error fetching events for user ${userId}:`, error);
        // Continue with other users even if one fails
      }
    }
    
    // Sort all events by start date
    allEvents.sort((a, b) => {
      const aTime = a.startsAt?.toDate?.()?.getTime() || 0;
      const bTime = b.startsAt?.toDate?.()?.getTime() || 0;
      return aTime - bTime;
    });
    
    return { success: true, events: allEvents };
  } catch (error) {
    console.error('Error fetching events by PRO:', error);
    return { success: false, error };
  }
};

// Get events by date range for a user
export const getEventsByDateRange = async (userId: string, startDate: Timestamp, endDate: Timestamp) => {
  try {
    const userEventsRef = collection(db, 'users', userId, 'events');
    const q = query(
      userEventsRef,
      where('startsAt', '>=', startDate),
      where('startsAt', '<=', endDate),
      orderBy('startsAt', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    const events: Array<Event & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as Event & { id: string });
    });
    
    return { success: true, events };
  } catch (error) {
    console.error('Error fetching events by date range:', error);
    return { success: false, error };
  }
};

// Get events by attendee (for a specific user)
export const getEventsByAttendee = async (attendeeUserId: string) => {
  try {
    return await getUserEvents(attendeeUserId);
  } catch (error) {
    console.error('Error fetching events by attendee:', error);
    return { success: false, error };
  }
};

// Get events by type for a user
export const getEventsByType = async (userId: string, eventType: Event['type']) => {
  try {
    const userEventsRef = collection(db, 'users', userId, 'events');
    const q = query(
      userEventsRef,
      where('type', '==', eventType),
      orderBy('startsAt', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    const events: Array<Event & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as Event & { id: string });
    });
    
    return { success: true, events };
  } catch (error) {
    console.error('Error fetching events by type:', error);
    return { success: false, error };
  }
}; 