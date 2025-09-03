import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TrainingPackage, PackagePurchase, PackageStatus } from '../types';

// ===== PACKAGE MANAGEMENT (PRO USERS) - Now using user subcollections =====

// Create a new training package in user's subcollection
export const createTrainingPackage = async (userId: string, packageData: Omit<TrainingPackage, 'id' | 'createdAt' | 'updatedAt' | 'currentPurchases'>) => {
  try {
    // Validate required fields
    if (!packageData.proId) {
      return { success: false, error: 'PRO ID is required' };
    }
    
    // Clean up the data to remove undefined values
    const cleanPackageData = Object.fromEntries(
      Object.entries(packageData).filter(([, value]) => value !== undefined)
    );
    
    console.log('Clean package data:', cleanPackageData);
    
    const userPackagesRef = collection(db, 'users', userId, 'trainingPackages');
    const packageRef = await addDoc(userPackagesRef, {
      ...cleanPackageData,
      currentPurchases: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, packageId: packageRef.id };
  } catch (error) {
    console.error('Error creating training package:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
};

// Get packages for a specific user
export const getUserPackages = async (userId: string) => {
  try {
    const userPackagesRef = collection(db, 'users', userId, 'trainingPackages');
    const querySnapshot = await getDocs(userPackagesRef);
    
    const packages: Array<TrainingPackage & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      packages.push({ id: doc.id, ...doc.data() } as TrainingPackage & { id: string });
    });
    
    // Sort by creation date (newest first)
    packages.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, packages };
  } catch (error) {
    console.error('Error fetching user packages:', error);
    return { success: false, error };
  }
};

// Get packages by PRO - redesigned for subcollection architecture
export const getPackagesByPro = async (proId: string) => {
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
      return { success: true, packages: [] };
    }
    
    // Get packages from each team member's subcollection
    const allPackages: Array<TrainingPackage & { id: string; userId: string }> = [];
    
    for (const userId of userIds) {
      try {
        const userPackagesRef = collection(db, 'users', userId, 'trainingPackages');
        const packagesSnapshot = await getDocs(userPackagesRef);
        
        packagesSnapshot.forEach((doc) => {
          allPackages.push({ 
            id: doc.id, 
            userId: userId,
            ...doc.data() 
          } as TrainingPackage & { id: string; userId: string });
        });
      } catch (error) {
        console.warn(`Error fetching packages for user ${userId}:`, error);
        // Continue with other users even if one fails
      }
    }
    
    // Sort all packages by creation date (newest first)
    allPackages.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
      const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
    
    return { success: true, packages: allPackages };
  } catch (error) {
    console.error('Error fetching packages by PRO:', error);
    return { success: false, error };
  }
};

// Get package by ID from user's subcollection
export const getPackageById = async (userId: string, packageId: string) => {
  try {
    const packageRef = doc(db, 'users', userId, 'trainingPackages', packageId);
    const packageSnap = await getDoc(packageRef);
    
    if (packageSnap.exists()) {
      return { success: true, package: { id: packageSnap.id, ...packageSnap.data() } };
    } else {
      return { success: false, error: 'Package not found' };
    }
  } catch (error) {
    console.error('Error fetching package:', error);
    return { success: false, error };
  }
};

// Update package in user's subcollection
export const updateTrainingPackage = async (userId: string, packageId: string, updates: Partial<TrainingPackage>) => {
  try {
    const packageRef = doc(db, 'users', userId, 'trainingPackages', packageId);
    await updateDoc(packageRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating training package:', error);
    return { success: false, error };
  }
};

// Delete package from user's subcollection
export const deleteTrainingPackage = async (userId: string, packageId: string) => {
  try {
    const packageRef = doc(db, 'users', userId, 'trainingPackages', packageId);
    await deleteDoc(packageRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting training package:', error);
    return { success: false, error };
  }
};

// Get packages by status for a user
export const getPackagesByStatus = async (userId: string, status: PackageStatus) => {
  try {
    const userPackagesRef = collection(db, 'users', userId, 'trainingPackages');
    const q = query(
      userPackagesRef,
      where('status', '==', status)
    );
    const querySnapshot = await getDocs(q);
    
    const packages: Array<TrainingPackage & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      packages.push({ id: doc.id, ...doc.data() } as TrainingPackage & { id: string });
    });
    
    // Sort by creation date (newest first)
    packages.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, packages };
  } catch (error) {
    console.error('Error fetching packages by status:', error);
    return { success: false, error };
  }
};

// ===== PACKAGE PURCHASES (ATHLETES) - Now using user subcollections =====

// Get available packages for athletes to browse (from a specific PRO user)
export const getAvailablePackages = async (proUserId: string) => {
  try {
    const proPackagesRef = collection(db, 'users', proUserId, 'trainingPackages');
    const q = query(
      proPackagesRef,
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    
    const packages: Array<TrainingPackage & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      const packageData = doc.data() as TrainingPackage;
      // Check if package has reached max purchases
      if (!packageData.maxPurchases || packageData.currentPurchases < packageData.maxPurchases) {
        packages.push({ id: doc.id, ...packageData });
      }
    });
    
    // Sort by price (lowest first)
    packages.sort((a, b) => a.price - b.price);
    
    return { success: true, packages };
  } catch (error) {
    console.error('Error fetching available packages:', error);
    return { success: false, error };
  }
};

// Create package purchase record in athlete's subcollection
export const createPackagePurchase = async (athleteUserId: string, purchaseData: Omit<PackagePurchase, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const userPurchasesRef = collection(db, 'users', athleteUserId, 'packagePurchases');
    const purchaseRef = await addDoc(userPurchasesRef, {
      ...purchaseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, purchaseId: purchaseRef.id };
  } catch (error) {
    console.error('Error creating package purchase:', error);
    return { success: false, error };
  }
};

// Get package purchases for a specific user (athlete)
export const getUserPackagePurchases = async (userId: string) => {
  try {
    const userPurchasesRef = collection(db, 'users', userId, 'packagePurchases');
    const querySnapshot = await getDocs(userPurchasesRef);
    
    const purchases: Array<PackagePurchase & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      purchases.push({ id: doc.id, ...doc.data() } as PackagePurchase & { id: string });
    });
    
    // Sort by purchase date (newest first)
    purchases.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, purchases };
  } catch (error) {
    console.error('Error fetching user package purchases:', error);
    return { success: false, error };
  }
};

// Get package purchases by athlete (alias for getUserPackagePurchases)
export const getPackagePurchasesByAthlete = async (athleteUserId: string) => {
  return await getUserPackagePurchases(athleteUserId);
};

// Get package purchase by ID from user's subcollection
export const getPackagePurchaseById = async (userId: string, purchaseId: string) => {
  try {
    const purchaseRef = doc(db, 'users', userId, 'packagePurchases', purchaseId);
    const purchaseSnap = await getDoc(purchaseRef);
    
    if (purchaseSnap.exists()) {
      return { success: true, purchase: { id: purchaseSnap.id, ...purchaseSnap.data() } };
    } else {
      return { success: false, error: 'Purchase not found' };
    }
  } catch (error) {
    console.error('Error fetching package purchase:', error);
    return { success: false, error };
  }
};

// Update package purchase in user's subcollection
export const updatePackagePurchase = async (userId: string, purchaseId: string, updates: Partial<PackagePurchase>) => {
  try {
    const purchaseRef = doc(db, 'users', userId, 'packagePurchases', purchaseId);
    await updateDoc(purchaseRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating package purchase:', error);
    return { success: false, error };
  }
};

// ===== ANALYTICS & REPORTING =====

// Get package analytics for PRO
export const getPackageAnalytics = async (proId: string) => {
  try {
    const packagesRef = collection(db, 'trainingPackages');
    const q = query(
      packagesRef, 
      where('proId', '==', proId)
    );
    const querySnapshot = await getDocs(q);
    
    let totalPackages = 0;
    let activePackages = 0;
    let totalRevenue = 0;
    let totalPurchases = 0;
    
    querySnapshot.forEach((doc) => {
      const packageData = doc.data() as TrainingPackage;
      totalPackages += 1;
      
      if (packageData.status === 'active') {
        activePackages += 1;
      }
      
      totalRevenue += packageData.price * packageData.currentPurchases;
      totalPurchases += packageData.currentPurchases;
    });
    
    return { 
      success: true, 
      totalPackages,
      activePackages,
      totalRevenue,
      totalPurchases,
      averagePackagePrice: totalPackages > 0 ? totalRevenue / totalPackages : 0
    };
  } catch (error) {
    console.error('Error fetching package analytics:', error);
    return { success: false, error };
  }
};

// Get popular packages for PRO
export const getPopularPackages = async (proId: string, limit = 5) => {
  try {
    const packagesRef = collection(db, 'trainingPackages');
    const q = query(
      packagesRef, 
      where('proId', '==', proId)
    );
    const querySnapshot = await getDocs(q);
    
    const packages: Array<TrainingPackage & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      packages.push({ id: doc.id, ...doc.data() } as TrainingPackage & { id: string });
    });
    
    // Sort by number of purchases (most popular first)
    packages.sort((a, b) => b.currentPurchases - a.currentPurchases);
    
    return { success: true, packages: packages.slice(0, limit) };
  } catch (error) {
    console.error('Error fetching popular packages:', error);
    return { success: false, error };
  }
}; 