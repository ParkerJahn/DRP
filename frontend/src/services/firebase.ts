import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User, Team } from '../types';

// User Management
export const createUserDocument = async (uid: string, userData: Partial<User>) => {
  try {
    const userRef = doc(db, 'users', uid);
    const newUser = {
      ...userData,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(userRef, newUser);
    return { success: true, user: newUser };
  } catch (error) {
    console.error('Error creating user document:', error);
    return { success: false, error };
  }
};

export const updateUserDocument = async (uid: string, updates: Partial<User>) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user document:', error);
    return { success: false, error };
  }
};

export const getUserDocument = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { success: true, user: userSnap.data() as User };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error fetching user document:', error);
    return { success: false, error };
  }
};

// Team Management
export const createTeamDocument = async (proId: string, teamData: Partial<Team>) => {
  try {
    const teamRef = doc(db, 'teams', proId);
    const newTeam = {
      proId,
      name: teamData.name || 'My Team',
      membersCount: {
        staff: 0,
        athlete: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(teamRef, newTeam);
    return { success: true, team: newTeam };
  } catch (error) {
    console.error('Error creating team document:', error);
    return { success: false, error };
  }
};

export const getTeamDocument = async (proId: string) => {
  try {
    const teamRef = doc(db, 'teams', proId);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
      return { success: true, team: teamSnap.data() as Team };
    } else {
      return { success: false, error: 'Team not found' };
    }
  } catch (error) {
    console.error('Error fetching team document:', error);
    return { success: false, error };
  }
};

export const updateTeamMemberCount = async (proId: string, role: 'STAFF' | 'ATHLETE', increment: boolean) => {
  try {
    const teamRef = doc(db, 'teams', proId);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
      const team = teamSnap.data() as Team;
      const currentCount = team.membersCount[role.toLowerCase() as keyof typeof team.membersCount] || 0;
      const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);
      
      await updateDoc(teamRef, {
        [`membersCount.${role.toLowerCase()}`]: newCount,
        updatedAt: serverTimestamp(),
      });
      
      return { success: true, newCount };
    } else {
      return { success: false, error: 'Team not found' };
    }
  } catch (error) {
    console.error('Error updating team member count:', error);
    return { success: false, error };
  }
};

// User Queries
export const getTeamMembers = async (proId: string) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('proId', '==', proId));
    const querySnapshot = await getDocs(q);
    
    const members: User[] = [];
    querySnapshot.forEach((doc) => {
      members.push(doc.data() as User);
    });
    
    return { success: true, members };
  } catch (error) {
    console.error('Error fetching team members:', error);
    return { success: false, error };
  }
};

export const getUsersByRole = async (proId: string, role: 'STAFF' | 'ATHLETE') => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('proId', '==', proId),
      where('role', '==', role)
    );
    const querySnapshot = await getDocs(q);
    
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as User);
    });
    
    return { success: true, users };
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return { success: false, error };
  }
};

// Utility Functions
export const generateULID = () => {
  // Simple ULID-like ID generation for development
  // In production, use a proper ULID library
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${timestamp}${random}`;
};

export const isTimestamp = (value: unknown): value is Timestamp => {
  return Boolean(value) && typeof value === 'object' && value !== null && 'seconds' in value && 'nanoseconds' in value;
}; 