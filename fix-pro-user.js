// Script to fix existing PRO user by setting proId to their UID
// Run this in Firebase Console > Functions > Logs or deploy as a Cloud Function

const admin = require('firebase-admin');

// Initialize Firebase Admin (this would be done automatically in Cloud Functions)
// admin.initializeApp();

async function fixExistingProUser() {
  try {
    const db = admin.firestore();
    
    // Find the PRO user (assuming it's the one with role: 'PRO')
    const usersRef = db.collection('users');
    const proUserQuery = await usersRef.where('role', '==', 'PRO').get();
    
    if (proUserQuery.empty) {
      console.log('No PRO user found');
      return;
    }
    
    const proUserDoc = proUserQuery.docs[0];
    const proUserData = proUserDoc.data();
    const proUserId = proUserDoc.id;
    
    console.log('Found PRO user:', proUserId, proUserData);
    
    // Update the PRO user to set proId to their own UID
    await usersRef.doc(proUserId).update({
      proId: proUserId,
      updatedAt: new Date()
    });
    
    console.log('✅ Successfully updated PRO user proId to:', proUserId);
    
    // Also update their custom claims
    await admin.auth().setCustomUserClaims(proUserId, {
      role: 'PRO',
      proId: proUserId
    });
    
    console.log('✅ Successfully updated PRO user custom claims');
    
  } catch (error) {
    console.error('Error fixing PRO user:', error);
  }
}

// Export for Cloud Function use
exports.fixExistingProUser = fixExistingProUser; 