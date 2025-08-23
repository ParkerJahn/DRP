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

// ===== PACKAGE MANAGEMENT (PRO USERS) =====

// Create a new training package
export const createTrainingPackage = async (packageData: Omit<TrainingPackage, 'id' | 'createdAt' | 'updatedAt' | 'currentPurchases'>) => {
  try {
    const packageRef = await addDoc(collection(db, 'trainingPackages'), {
      ...packageData,
      currentPurchases: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, packageId: packageRef.id };
  } catch (error) {
    console.error('Error creating training package:', error);
    return { success: false, error };
  }
};

// Get packages by PRO
export const getPackagesByPro = async (proId: string) => {
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
    
    // Sort by creation date (newest first)
    packages.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, packages };
  } catch (error) {
    console.error('Error fetching packages by PRO:', error);
    return { success: false, error };
  }
};

// Get package by ID
export const getPackageById = async (packageId: string) => {
  try {
    const packageRef = doc(db, 'trainingPackages', packageId);
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

// Update package
export const updateTrainingPackage = async (packageId: string, updates: Partial<TrainingPackage>) => {
  try {
    const packageRef = doc(db, 'trainingPackages', packageId);
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

// Delete package
export const deleteTrainingPackage = async (packageId: string) => {
  try {
    const packageRef = doc(db, 'trainingPackages', packageId);
    await deleteDoc(packageRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting training package:', error);
    return { success: false, error };
  }
};

// Get packages by status
export const getPackagesByStatus = async (proId: string, status: PackageStatus) => {
  try {
    const packagesRef = collection(db, 'trainingPackages');
    const q = query(
      packagesRef, 
      where('proId', '==', proId),
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

// ===== PACKAGE PURCHASES (ATHLETES) =====

// Get available packages for athletes to browse
export const getAvailablePackages = async (proId: string) => {
  try {
    const packagesRef = collection(db, 'trainingPackages');
    const q = query(
      packagesRef, 
      where('proId', '==', proId),
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

// Create package purchase record
export const createPackagePurchase = async (purchaseData: Omit<PackagePurchase, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const purchaseRef = await addDoc(collection(db, 'packagePurchases'), {
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

// Get athlete's purchased packages
export const getAthletePackages = async (athleteUid: string) => {
  try {
    const purchasesRef = collection(db, 'packagePurchases');
    const q = query(
      purchasesRef, 
      where('athleteUid', '==', athleteUid)
    );
    const querySnapshot = await getDocs(q);
    
    const purchases: Array<PackagePurchase & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      purchases.push({ id: doc.id, ...doc.data() } as PackagePurchase & { id: string });
    });
    
    // Sort by purchase date (newest first)
    purchases.sort((a, b) => b.purchaseDate.toDate().getTime() - a.purchaseDate.toDate().getTime());
    
    return { success: true, purchases };
  } catch (error) {
    console.error('Error fetching athlete packages:', error);
    return { success: false, error };
  }
};

// Update package purchase (e.g., mark session as used)
export const updatePackagePurchase = async (purchaseId: string, updates: Partial<PackagePurchase>) => {
  try {
    const purchaseRef = doc(db, 'packagePurchases', purchaseId);
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

// Get package purchase by ID
export const getPackagePurchaseById = async (purchaseId: string) => {
  try {
    const purchaseRef = doc(db, 'packagePurchases', purchaseId);
    const purchaseSnap = await getDoc(purchaseRef);
    
    if (purchaseSnap.exists()) {
      return { success: true, purchase: { id: purchaseSnap.id, ...purchaseSnap.data() } };
    } else {
      return { success: false, error: 'Package purchase not found' };
    }
  } catch (error) {
    console.error('Error fetching package purchase:', error);
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