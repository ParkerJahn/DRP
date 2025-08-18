import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Program, Phase } from '../types';

// Exercise and Category Management
export interface ExerciseCategory {
  id: string;
  name: string;
  exercises: string[];
  createdBy: string;
  proId: string;
  createdAt: any;
  updatedAt: any;
}

export const createExerciseCategory = async (categoryData: Omit<ExerciseCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const categoryRef = doc(collection(db, 'exercises'));
    const newCategory = {
      ...categoryData,
      id: categoryRef.id, // Generate ID automatically
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(categoryRef, newCategory);
    return { success: true, categoryId: categoryRef.id, category: newCategory };
  } catch (error) {
    console.error('Error creating exercise category:', error);
    return { success: false, error };
  }
};

export const getExerciseCategories = async () => {
  try {
    console.log('Fetching exercise categories...');
    const categoriesRef = collection(db, 'exercises');
    const querySnapshot = await getDocs(categoriesRef);
    
    console.log('Query snapshot size:', querySnapshot.size);
    
    const categories: ExerciseCategory[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Document data:', doc.id, data);
      // Only include documents that have the required fields
      if (data.name && data.exercises && Array.isArray(data.exercises)) {
        categories.push({ 
          id: doc.id, 
          ...data 
        } as ExerciseCategory);
      }
    });
    
    console.log('Filtered categories:', categories);
    return { success: true, categories };
  } catch (error) {
    console.error('Error fetching exercise categories:', error);
    return { success: false, error };
  }
};

export const addExerciseToCategory = async (categoryId: string, exerciseName: string) => {
  try {
    console.log('Adding exercise to category:', { categoryId, exerciseName });
    
    if (!categoryId || !exerciseName) {
      console.error('Invalid parameters:', { categoryId, exerciseName });
      return { success: false, error: 'Invalid parameters' };
    }
    
    const categoryRef = doc(db, 'exercises', categoryId);
    const categoryDoc = await getDoc(categoryRef);
    const currentExercises = categoryDoc.data()?.exercises || [];
    const updatedExercises = [...currentExercises, exerciseName];
    
    await updateDoc(categoryRef, {
      exercises: updatedExercises,
      updatedAt: serverTimestamp(),
    });
    return { success: true, exercise: { name: exerciseName } };
  } catch (error) {
    console.error('Error adding exercise to category:', error);
    return { success: false, error };
  }
};

export const deleteExerciseFromCategory = async (categoryId: string, exerciseName: string) => {
  try {
    const categoryRef = doc(db, 'exercises', categoryId);
    const categoryDoc = await getDoc(categoryRef);
    const currentExercises = categoryDoc.data()?.exercises || [];
    const updatedExercises = currentExercises.filter((ex: string) => ex !== exerciseName);
    
    await updateDoc(categoryRef, {
      exercises: updatedExercises,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting exercise from category:', error);
    return { success: false, error };
  }
};

export const deleteExerciseCategory = async (categoryId: string) => {
  try {
    const categoryRef = doc(db, 'exercises', categoryId);
    await deleteDoc(categoryRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting exercise category:', error);
    return { success: false, error };
  }
};

// Program Management
export const createProgram = async (programData: Omit<Program, 'createdAt' | 'updatedAt'>) => {
  try {
    const programRef = doc(collection(db, 'programs'));
    const newProgram = {
      ...programData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(programRef, newProgram);
    return { success: true, programId: programRef.id, program: newProgram };
  } catch (error) {
    console.error('Error creating program:', error);
    return { success: false, error };
  }
};

export const getProgram = async (programId: string) => {
  try {
    const programRef = doc(db, 'programs', programId);
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

export const updateProgram = async (programId: string, updates: Partial<Program>) => {
  try {
    const programRef = doc(db, 'programs', programId);
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

export const deleteProgram = async (programId: string) => {
  try {
    const programRef = doc(db, 'programs', programId);
    await deleteDoc(programRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting program:', error);
    return { success: false, error };
  }
};

// Get programs by PRO
export const getProgramsByPro = async (proId: string) => {
  try {
    const programsRef = collection(db, 'programs');
    const q = query(
      programsRef, 
      where('proId', '==', proId)
      // Removed orderBy to avoid requiring composite index
    );
    const querySnapshot = await getDocs(q);
    
    const programs: any[] = [];
    querySnapshot.forEach((doc) => {
      programs.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort in memory instead of requiring Firestore index
    programs.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
    
    return { success: true, programs };
  } catch (error) {
    console.error('Error fetching programs by PRO:', error);
    return { success: false, error };
  }
};

// Get programs by athlete
export const getProgramsByAthlete = async (athleteUid: string) => {
  try {
    const programsRef = collection(db, 'programs');
    const q = query(
      programsRef, 
      where('athleteUid', '==', athleteUid)
      // Removed orderBy to avoid requiring composite index
    );
    const querySnapshot = await getDocs(q);
    
    const programs: any[] = [];
    querySnapshot.forEach((doc) => {
      programs.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort in memory instead of requiring Firestore index
    programs.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
    
    return { success: true, programs };
  } catch (error) {
    console.error('Error fetching programs by athlete:', error);
    return { success: false, error };
  }
};

// Get programs by status
export const getProgramsByStatus = async (proId: string, status: Program['status']) => {
  try {
    const programsRef = collection(db, 'programs');
    const q = query(
      programsRef, 
      where('proId', '==', proId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const programs: any[] = [];
    querySnapshot.forEach((doc) => {
      programs.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, programs };
  } catch (error) {
    console.error('Error fetching programs by status:', error);
    return { success: false, error };
  }
};

// Assign program to athlete
export const assignProgramToAthlete = async (programId: string, athleteUid: string) => {
  try {
    const programRef = doc(db, 'programs', programId);
    await updateDoc(programRef, {
      athleteUid,
      status: 'current',
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error assigning program to athlete:', error);
    return { success: false, error };
  }
};

// Update program status
export const updateProgramStatus = async (programId: string, status: Program['status']) => {
  try {
    const programRef = doc(db, 'programs', programId);
    await updateDoc(programRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating program status:', error);
    return { success: false, error };
  }
};

// Batch operations for program creation with phases
export const createProgramWithPhases = async (
  programData: Omit<Program, 'createdAt' | 'updatedAt' | 'phases'>,
  phases: Phase[]
) => {
  try {
    const batch = writeBatch(db);
    const programRef = doc(collection(db, 'programs'));
    
    const newProgram = {
      ...programData,
      phases,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    batch.set(programRef, newProgram);
    await batch.commit();
    
    return { success: true, programId: programRef.id, program: newProgram };
  } catch (error) {
    console.error('Error creating program with phases:', error);
    return { success: false, error };
  }
}; 