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
  name: string; // e.g., "Morning Schedule", "Weekend Hours"
  slots: Omit<AvailabilitySlot, 'id' | 'proId' | 'userId' | 'createdAt' | 'updatedAt'>[];
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Create availability slot
export const createAvailabilitySlot = async (slotData: Omit<AvailabilitySlot, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    // Validate required fields
    if (!slotData.proId || !slotData.userId || slotData.dayOfWeek === undefined || !slotData.startTime || !slotData.endTime) {
      console.error('Missing required fields:', {
        proId: slotData.proId,
        userId: slotData.userId,
        dayOfWeek: slotData.dayOfWeek,
        startTime: slotData.startTime,
        endTime: slotData.endTime
      });
      return { success: false, error: 'Missing required fields' };
    }

    // Clean the data to remove undefined values
    const cleanSlotData = {
      proId: slotData.proId,
      userId: slotData.userId,
      dayOfWeek: slotData.dayOfWeek,
      startTime: slotData.startTime,
      endTime: slotData.endTime,
      isRecurring: slotData.isRecurring,
      isActive: slotData.isActive,
      ...(slotData.startDate && { startDate: slotData.startDate }),
      ...(slotData.endDate && { endDate: slotData.endDate })
    };

    console.log('Creating availability slot with data:', cleanSlotData);
    
    const slotRef = await addDoc(collection(db, 'availabilitySlots'), {
      ...cleanSlotData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, slotId: slotRef.id };
  } catch (error) {
    console.error('Error creating availability slot:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: (error as { code?: string })?.code,
      stack: error instanceof Error ? error.stack : undefined
    });
    return { success: false, error };
  }
};

// Get availability slots for a user
export const getAvailabilitySlots = async (userId: string) => {
  try {
    const slotsRef = collection(db, 'availabilitySlots');
    const q = query(
      slotsRef,
      where('userId', '==', userId),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    const slots: AvailabilitySlot[] = [];
    querySnapshot.forEach((doc) => {
      slots.push({ id: doc.id, ...doc.data() } as AvailabilitySlot);
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
    console.error('Error fetching availability slots:', error);
    return { success: false, error };
  }
};

// Get availability slots for a PRO's team
export const getTeamAvailabilitySlots = async (proId: string) => {
  try {
    const slotsRef = collection(db, 'availabilitySlots');
    const q = query(
      slotsRef,
      where('proId', '==', proId),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    const slots: AvailabilitySlot[] = [];
    querySnapshot.forEach((doc) => {
      slots.push({ id: doc.id, ...doc.data() } as AvailabilitySlot);
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
    console.error('Error fetching team availability slots:', error);
    return { success: false, error };
  }
};

// Update availability slot
export const updateAvailabilitySlot = async (slotId: string, updates: Partial<AvailabilitySlot>) => {
  try {
    const slotRef = doc(db, 'availabilitySlots', slotId);
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

// Delete availability slot
export const deleteAvailabilitySlot = async (slotId: string) => {
  try {
    const slotRef = doc(db, 'availabilitySlots', slotId);
    await deleteDoc(slotRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting availability slot:', error);
    return { success: false, error };
  }
};

// Create availability template
export const createAvailabilityTemplate = async (templateData: Omit<AvailabilityTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const templateRef = await addDoc(collection(db, 'availabilityTemplates'), {
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

// Get availability templates for a user
export const getAvailabilityTemplates = async (userId: string) => {
  try {
    const templatesRef = collection(db, 'availabilityTemplates');
    const q = query(
      templatesRef,
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    const templates: AvailabilityTemplate[] = [];
    querySnapshot.forEach((doc) => {
      templates.push({ id: doc.id, ...doc.data() } as AvailabilityTemplate);
    });
    
    // Sort by default first, then by name
    templates.sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return b.isDefault ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
    
    return { success: true, templates };
  } catch (error) {
    console.error('Error fetching availability templates:', error);
    return { success: false, error };
  }
};

// Apply template to create availability slots
export const applyAvailabilityTemplate = async (templateId: string) => {
  try {
    const templateRef = doc(db, 'availabilityTemplates', templateId);
    const templateSnap = await getDoc(templateRef);
    
    if (!templateSnap.exists()) {
      return { success: false, error: 'Template not found' };
    }
    
    const template = templateSnap.data() as AvailabilityTemplate;
    
    // Create slots from template
    const slotPromises = template.slots.map(slot => 
      createAvailabilitySlot({
        ...slot,
        proId: template.proId,
        userId: template.userId,
      })
    );
    
    const results = await Promise.all(slotPromises);
    const successCount = results.filter(r => r.success).length;
    
    return { 
      success: true, 
      slotsCreated: successCount,
      totalSlots: template.slots.length
    };
  } catch (error) {
    console.error('Error applying availability template:', error);
    return { success: false, error };
  }
};

// Check if a time slot is available for booking
export const checkAvailability = async (
  proId: string, 
  userId: string, 
  date: Date, 
  startTime: string, 
  endTime: string
) => {
  try {
    const dayOfWeek = date.getDay();
    const slotsRef = collection(db, 'availabilitySlots');
    
    // Check for recurring availability
    const recurringQuery = query(
      slotsRef,
      where('proId', '==', proId),
      where('userId', '==', userId),
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
        slotsRef,
        where('proId', '==', proId),
        where('userId', '==', userId),
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