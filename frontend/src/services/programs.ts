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
import type { Program } from '../types';

// Exercise and Category Management - Now using user subcollections
export interface ExerciseCategory {
  id: string;
  name: string;
  exercises: string[];
  createdBy: string;
  proId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const createExerciseCategory = async (userId: string, categoryData: Omit<ExerciseCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const userExercisesRef = collection(db, 'users', userId, 'exercises');
    const newCategory = {
      ...categoryData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Use the returned docRef to get the actual created ID
    const docRef = await addDoc(userExercisesRef, newCategory);
    return { success: true, categoryId: docRef.id, category: newCategory };
  } catch (error) {
    console.error('Error creating exercise category:', error);
    return { success: false, error };
  }
};

export const getExerciseCategories = async (userId: string) => {
  try {
    const userExercisesRef = collection(db, 'users', userId, 'exercises');
    const q = query(userExercisesRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    const categories: Array<ExerciseCategory & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() } as ExerciseCategory & { id: string });
    });
    
    return { success: true, categories };
  } catch (error) {
    console.error('Error fetching exercise categories:', error);
    return { success: false, error };
  }
};

export const updateExerciseCategory = async (userId: string, categoryId: string, updates: Partial<ExerciseCategory>) => {
  try {
    const categoryRef = doc(db, 'users', userId, 'exercises', categoryId);
    await updateDoc(categoryRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating exercise category:', error);
    return { success: false, error };
  }
};

export const deleteExerciseCategory = async (userId: string, categoryId: string) => {
  try {
    const categoryRef = doc(db, 'users', userId, 'exercises', categoryId);
    await deleteDoc(categoryRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting exercise category:', error);
    return { success: false, error };
  }
};

// Program Management - Now using user subcollections
export const createProgram = async (userId: string, programData: Omit<Program, 'createdAt' | 'updatedAt'>) => {
  try {
    const newProgram = {
      ...programData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Store program in creator's subcollection
    const creatorProgramsRef = collection(db, 'users', userId, 'programs');
    const creatorProgramRef = await addDoc(creatorProgramsRef, newProgram);
    
    // Also store copies in each assigned athlete's subcollection
    if (programData.athleteUids && programData.athleteUids.length > 0) {

      const copyPromises = programData.athleteUids.map(async (athleteUid) => {
        if (athleteUid !== userId) { // Don't duplicate if the creator is also an athlete
          try {

            const athleteProgramsRef = collection(db, 'users', athleteUid, 'programs');
            await addDoc(athleteProgramsRef, {
              ...newProgram,
              // Add metadata to track this is a shared program
              sharedFromCreator: userId,
              isSharedProgram: true,
              originalProgramId: creatorProgramRef.id
            });

          } catch (error) {
            console.error(`❌ Failed to share program with athlete ${athleteUid}:`, error);
            console.error('Error details:', {
              athleteUid,
              creatorUid: userId,
              programData: {
                proId: programData.proId,
                athleteUids: programData.athleteUids,
                title: programData.title
              }
            });
            // Continue with other athletes even if one fails
          }
        }
      });
      
      // Wait for all athlete copies to be created
      await Promise.allSettled(copyPromises);
    }
    
    return { success: true, programId: creatorProgramRef.id, program: newProgram };
  } catch (error) {
    console.error('Error creating program:', error);
    return { success: false, error };
  }
};

export const getProgram = async (userId: string, programId: string) => {
  try {
    const programRef = doc(db, 'users', userId, 'programs', programId);
    const programSnap = await getDoc(programRef);
    
    if (programSnap.exists()) {
      return { success: true, program: { id: programSnap.id, ...programSnap.data() } };
    } else {
      return { success: false, error: 'Program not found' };
    }
  } catch (error) {
    console.error('Error fetching program:', error);
    return { success: false, error };
  }
};

export const updateProgram = async (userId: string, programId: string, updates: Partial<Program>) => {
  try {
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    // Update the main program
    const programRef = doc(db, 'users', userId, 'programs', programId);
    await updateDoc(programRef, updateData);
    
    // Get the program data to check if it has assigned athletes
    const programSnap = await getDoc(programRef);
    if (programSnap.exists()) {
      const programData = programSnap.data() as Program;
      
      // If this program has assigned athletes, update their copies too
      if (programData.athleteUids && programData.athleteUids.length > 0) {
        const updatePromises = programData.athleteUids.map(async (athleteUid) => {
          if (athleteUid !== userId) { // Don't update creator's own copy twice
            try {
              // Find the shared program in athlete's subcollection
              const athleteProgramsRef = collection(db, 'users', athleteUid, 'programs');
              const athleteQuery = query(
                athleteProgramsRef, 
                where('originalProgramId', '==', programId)
              );
              const athleteQuerySnap = await getDocs(athleteQuery);
              
              // Update each matching shared program
              const athleteUpdatePromises = athleteQuerySnap.docs.map(doc => 
                updateDoc(doc.ref, updateData)
              );
              await Promise.all(athleteUpdatePromises);

            } catch (error) {
              console.error(`Failed to sync updates to athlete ${athleteUid}:`, error);
              // Continue with other athletes even if one fails
            }
          }
        });
        
        await Promise.allSettled(updatePromises);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating program:', error);
    return { success: false, error };
  }
};

export const deleteProgram = async (userId: string, programId: string) => {
  try {
    const programRef = doc(db, 'users', userId, 'programs', programId);
    
    // Get the program data before deleting to check for shared copies
    const programSnap = await getDoc(programRef);
    const programData = programSnap.exists() ? programSnap.data() as Program : null;
    
    // Delete the main program
    await deleteDoc(programRef);
    
    // If this program had assigned athletes, delete their copies too
    if (programData?.athleteUids && programData.athleteUids.length > 0) {
      const deletePromises = programData.athleteUids.map(async (athleteUid) => {
        if (athleteUid !== userId) { // Don't try to delete from creator's collection twice
          try {
            // Find and delete the shared program in athlete's subcollection
            const athleteProgramsRef = collection(db, 'users', athleteUid, 'programs');
            const athleteQuery = query(
              athleteProgramsRef, 
              where('originalProgramId', '==', programId)
            );
            const athleteQuerySnap = await getDocs(athleteQuery);
            
            // Delete each matching shared program
            const athleteDeletePromises = athleteQuerySnap.docs.map(doc => 
              deleteDoc(doc.ref)
            );
            await Promise.all(athleteDeletePromises);

          } catch (error) {
            console.error(`Failed to delete shared program from athlete ${athleteUid}:`, error);
            // Continue with other athletes even if one fails
          }
        }
      });
      
      await Promise.allSettled(deletePromises);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting program:', error);
    return { success: false, error };
  }
};

// Get programs for a specific user
export const getUserPrograms = async (userId: string) => {
  try {

    const userProgramsRef = collection(db, 'users', userId, 'programs');
    const q = query(userProgramsRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const programs: Array<Program & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      const programData = { id: doc.id, ...doc.data() } as Program & { id: string };
      programs.push(programData);

    });
    

    return { success: true, programs };
  } catch (error) {
    console.error(`❌ Error fetching user programs for ${userId}:`, error);
    return { success: false, error };
  }
};

// Get programs by athlete (for a specific user)
export const getProgramsByAthlete = async (athleteUserId: string) => {
  try {
    return await getUserPrograms(athleteUserId);
  } catch (error) {
    console.error('Error fetching programs by athlete:', error);
    return { success: false, error };
  }
};

// Get programs by PRO - redesigned for subcollection architecture
export const getProgramsByPro = async (proId: string) => {
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
      return { success: true, programs: [] };
    }
    
    // Get programs from each team member's subcollection
    const allPrograms: Array<Program & { id: string; userId: string }> = [];
    
    for (const userId of userIds) {
      try {
        const userProgramsRef = collection(db, 'users', userId, 'programs');
        const programsQuery = query(userProgramsRef, orderBy('updatedAt', 'desc'));
        const programsSnapshot = await getDocs(programsQuery);
        
        programsSnapshot.forEach((doc) => {
          const programData = doc.data() as Program;
          
          // For PRO view, only show:
          // 1. Programs created by PRO/STAFF (original programs)
          // 2. Programs created by athletes (athlete-created programs)
          // Skip shared copies in athlete subcollections to avoid duplicates
          const shouldInclude = 
            !programData.isSharedProgram || // Include original programs and athlete-created programs
            userId === proId; // Always include programs from PRO's own subcollection
            

            
          if (shouldInclude) {
            allPrograms.push({ 
              id: doc.id, 
              userId: userId,
              ...programData 
            } as Program & { id: string; userId: string });
                      }
        });
      } catch (error) {
        console.warn(`Error fetching programs for user ${userId}:`, error);
        // Continue with other users even if one fails
      }
    }
    
    // Sort all programs by updated date (newest first)
    allPrograms.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.()?.getTime() || 0;
      const bTime = b.updatedAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
    

    
    return { success: true, programs: allPrograms };
  } catch (error) {
    console.error('Error fetching programs by PRO:', error);
    return { success: false, error };
  }
};

// Program Template Interface
export interface ProgramTemplate {
  id?: string;
  title: string;
  phases: Program['phases'];
  createdBy: string;
  proId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Program Template Management - Now using user subcollections
export const saveTemplate = async (userId: string, template: Omit<ProgramTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const userTemplatesRef = collection(db, 'users', userId, 'program_templates');
    const templateRef = doc(userTemplatesRef);
    const payload = { ...template, createdAt: serverTimestamp() };
    await addDoc(userTemplatesRef, payload);
    return { success: true, templateId: templateRef.id };
  } catch (error) {
    console.error('Error saving template:', error);
    return { success: false, error };
  }
};

export const getTemplates = async (userId: string) => {
  try {
    const userTemplatesRef = collection(db, 'users', userId, 'program_templates');
    const q = query(userTemplatesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const templates: Array<ProgramTemplate & { id: string }> = [];
    snapshot.forEach((doc) => {
      templates.push({ id: doc.id, ...doc.data() } as ProgramTemplate & { id: string });
    });
    
    return { success: true, templates };
  } catch (error) {
    console.error('Error fetching templates:', error);
    return { success: false, error };
  }
};

// Create program from template
export const createProgramFromTemplate = async (userId: string, templateId: string, athleteUid: string, customizations?: Partial<Program>) => {
  try {
    // Get the template from user's templates
    const templateRef = doc(db, 'users', userId, 'program_templates', templateId);
    const templateSnap = await getDoc(templateRef);
    
    if (!templateSnap.exists()) {
      return { success: false, error: 'Template not found' };
    }
    
    const template = templateSnap.data();
    
    // Create new program in the athlete's programs subcollection
    const userProgramsRef = collection(db, 'users', athleteUid, 'programs');
    const programRef = doc(userProgramsRef);
    const newProgram = {
      ...template,
      ...customizations,
      athleteUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await addDoc(userProgramsRef, newProgram);
    return { success: true, programId: programRef.id, program: newProgram };
  } catch (error) {
    console.error('Error creating program from template:', error);
    return { success: false, error };
  }
}; 