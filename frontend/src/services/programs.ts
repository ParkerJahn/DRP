import { 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
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
    const categoryRef = doc(userExercisesRef);
    const newCategory = {
      ...categoryData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await addDoc(userExercisesRef, newCategory);
    return { success: true, categoryId: categoryRef.id, category: newCategory };
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
    const userProgramsRef = collection(db, 'users', userId, 'programs');
    const programRef = doc(userProgramsRef);
    const newProgram = {
      ...programData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await addDoc(userProgramsRef, newProgram);
    return { success: true, programId: programRef.id, program: newProgram };
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
    const programRef = doc(db, 'users', userId, 'programs', programId);
    await updateDoc(programRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating program:', error);
    return { success: false, error };
  }
};

export const deleteProgram = async (userId: string, programId: string) => {
  try {
    const programRef = doc(db, 'users', userId, 'programs', programId);
    await deleteDoc(programRef);
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
      programs.push({ id: doc.id, ...doc.data() } as Program & { id: string });
    });
    
    return { success: true, programs };
  } catch (error) {
    console.error('Error fetching user programs:', error);
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

// Get programs by PRO - needs redesign for subcollections
export const getProgramsByPro = async (proId: string) => {
  try {
    console.warn(`getProgramsByPro for ${proId} needs to be redesigned for subcollection architecture`);
    return { success: false, error: 'Method needs redesign for subcollections' };
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