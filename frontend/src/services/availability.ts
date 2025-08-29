import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface AvailabilitySlot {
  id?: string;
  proId: string;
  userId: string; // PRO or STAFF member's UID
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isRecurring: boolean; // Weekly recurring or one-time
  startDate?: Timestamp; // For one-time availability
  endDate?: Timestamp; // For one-time availability
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AvailabilityTemplate {
  id?: string;
  proId: string;
  userId: string;
  name: string;
  slots: Omit<AvailabilitySlot, 'id' | 'proId' | 'userId' | 'createdAt' | 'updatedAt'>[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ===== AVAILABILITY SLOTS - Now using user subcollections =====

// Create a new availability slot in user's subcollection
export const createAvailabilitySlot = async (userId: string, slotData: Omit<AvailabilitySlot, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    // Validate required fields
    if (!slotData.userId || !slotData.proId) {
      return { success: false, error: 'User ID and PRO ID are required' };
    }
    
    if (slotData.dayOfWeek < 0 || slotData.dayOfWeek > 6) {
      return { success: false, error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' };
    }
    
    // Validate time format (basic check)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slotData.startTime) || !timeRegex.test(slotData.endTime)) {
      return { success: false, error: 'Invalid time format. Use HH:MM format' };
    }
    
    // Ensure end time is after start time
    if (slotData.startTime >= slotData.endTime) {
      return { success: false, error: 'End time must be after start time' };
    }
    
    const userSlotsRef = collection(db, 'users', userId, 'availabilitySlots');
    const slotRef = await addDoc(userSlotsRef, {
      ...slotData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, slotId: slotRef.id };
  } catch (error) {
    console.error('Error creating availability slot:', error);
    return { success: false, error };
  }
};

// Get availability slots for a specific user
export const getUserAvailabilitySlots = async (userId: string) => {
  try {
    const userSlotsRef = collection(db, 'users', userId, 'availabilitySlots');
    const querySnapshot = await getDocs(userSlotsRef);
    
    const slots: Array<AvailabilitySlot & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      slots.push({ id: doc.id, ...doc.data() } as AvailabilitySlot & { id: string });
    });
    
    // Sort by day of week, then by start time
    slots.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startTime.localeCompare(b.startTime);
    });
    
    return { success: true, slots };
  } catch (error) {
    console.error('Error fetching user availability slots:', error);
    return { success: false, error };
  }
};

// Get availability slots by PRO - needs redesign for subcollections
export const getAvailabilitySlotsByPro = async (proId: string) => {
  try {
    console.warn(`getAvailabilitySlotsByPro for ${proId} needs to be redesigned for subcollection architecture`);
    return { success: false, error: 'Method needs redesign for subcollections' };
  } catch (error) {
    console.error('Error fetching availability slots by PRO:', error);
    return { success: false, error };
  }
};

// Update availability slot in user's subcollection
export const updateAvailabilitySlot = async (userId: string, slotId: string, updates: Partial<AvailabilitySlot>) => {
  try {
    const slotRef = doc(db, 'users', userId, 'availabilitySlots', slotId);
    await updateDoc(slotRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating availability slot:', error);
    return { success: false, error };
  }
};

// Delete availability slot from user's subcollection
export const deleteAvailabilitySlot = async (userId: string, slotId: string) => {
  try {
    const slotRef = doc(db, 'users', userId, 'availabilitySlots', slotId);
    await deleteDoc(slotRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting availability slot:', error);
    return { success: false, error };
  }
};

// Get active availability slots for a user
export const getActiveAvailabilitySlots = async (userId: string) => {
  try {
    const userSlotsRef = collection(db, 'users', userId, 'availabilitySlots');
    const q = query(
      userSlotsRef,
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    const slots: Array<AvailabilitySlot & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      slots.push({ id: doc.id, ...doc.data() } as AvailabilitySlot & { id: string });
    });
    
    // Sort by day of week, then by start time
    slots.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startTime.localeCompare(b.startTime);
    });
    
    return { success: true, slots };
  } catch (error) {
    console.error('Error fetching active availability slots:', error);
    return { success: false, error };
  }
};

// ===== AVAILABILITY TEMPLATES - Now using user subcollections =====

// Create availability template in user's subcollection
export const createAvailabilityTemplate = async (userId: string, templateData: Omit<AvailabilityTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    // Validate required fields
    if (!templateData.name || !templateData.userId || !templateData.proId) {
      return { success: false, error: 'Name, User ID, and PRO ID are required' };
    }
    
    if (!templateData.slots || templateData.slots.length === 0) {
      return { success: false, error: 'At least one slot is required' };
    }
    
    const userTemplatesRef = collection(db, 'users', userId, 'availabilityTemplates');
    const templateRef = await addDoc(userTemplatesRef, {
      ...templateData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, templateId: templateRef.id };
  } catch (error) {
    console.error('Error creating availability template:', error);
    return { success: false, error };
  }
};

// Get availability templates for a specific user
export const getUserAvailabilityTemplates = async (userId: string) => {
  try {
    const userTemplatesRef = collection(db, 'users', userId, 'availabilityTemplates');
    const querySnapshot = await getDocs(userTemplatesRef);
    
    const templates: Array<AvailabilityTemplate & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      templates.push({ id: doc.id, ...doc.data() } as AvailabilityTemplate & { id: string });
    });
    
    // Sort by creation date (newest first)
    templates.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, templates };
  } catch (error) {
    console.error('Error fetching user availability templates:', error);
    return { success: false, error };
  }
};

// Apply availability template (create slots from template)
export const applyAvailabilityTemplate = async (userId: string, templateId: string) => {
  try {
    // Get the template
    const templateRef = doc(db, 'users', userId, 'availabilityTemplates', templateId);
    const templateSnap = await getDoc(templateRef);
    
    if (!templateSnap.exists()) {
      return { success: false, error: 'Template not found' };
    }
    
    const template = templateSnap.data() as AvailabilityTemplate;
    
    // Create slots from template
    const createdSlots = [];
    for (const slotData of template.slots) {
      const result = await createAvailabilitySlot(userId, {
        ...slotData,
        userId: template.userId,
        proId: template.proId,
      });
      
      if (result.success) {
        createdSlots.push(result.slotId);
      }
    }
    
    return { 
      success: true, 
      createdSlots,
      message: `Created ${createdSlots.length} availability slots from template`
    };
  } catch (error) {
    console.error('Error applying availability template:', error);
    return { success: false, error };
  }
};

// Delete availability template from user's subcollection
export const deleteAvailabilityTemplate = async (userId: string, templateId: string) => {
  try {
    const templateRef = doc(db, 'users', userId, 'availabilityTemplates', templateId);
    await deleteDoc(templateRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting availability template:', error);
    return { success: false, error };
  }
};

// Check if a time slot is available for booking
export const checkAvailability = async (
  staffUserId: string, 
  date: Date, 
  startTime: string, 
  endTime: string
) => {
  try {
    const dayOfWeek = date.getDay();
    const userSlotsRef = collection(db, 'users', staffUserId, 'availabilitySlots');
    
    // Check for recurring availability
    const recurringQuery = query(
      userSlotsRef,
      where('dayOfWeek', '==', dayOfWeek),
      where('isActive', '==', true),
      where('isRecurring', '==', true)
    );
    
    const recurringSnapshot = await getDocs(recurringQuery);
    let isAvailable = false;
    
    recurringSnapshot.forEach((doc) => {
      const slot = doc.data() as AvailabilitySlot;
      if (startTime >= slot.startTime && endTime <= slot.endTime) {
        isAvailable = true;
      }
    });
    
    // Check for one-time availability
    if (!isAvailable) {
      const oneTimeQuery = query(
        userSlotsRef,
        where('startDate', '<=', Timestamp.fromDate(date)),
        where('endDate', '>=', Timestamp.fromDate(date)),
        where('isActive', '==', true),
        where('isRecurring', '==', false)
      );
      
      const oneTimeSnapshot = await getDocs(oneTimeQuery);
      oneTimeSnapshot.forEach((doc) => {
        const slot = doc.data() as AvailabilitySlot;
        if (startTime >= slot.startTime && endTime <= slot.endTime) {
          isAvailable = true;
        }
      });
    }
    
    return { success: true, isAvailable };
  } catch (error) {
    console.error('Error checking availability:', error);
    return { success: false, error };
  }
}; 