import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Remove team member function
export const removeTeamMember = async (memberUid: string) => {
  try {
    const removeTeamMemberFunction = httpsCallable(functions, 'removeTeamMember');
    const result = await removeTeamMemberFunction({ memberUid });
    
    return {
      success: true,
      data: result.data
    };
  } catch (error: unknown) {
    console.error('Error calling removeTeamMember function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove team member'
    };
  }
};

// Clean up orphaned Firebase Auth users
export const cleanupOrphanedUsers = async (email: string) => {
  try {
    const cleanupOrphanedUsersFunction = httpsCallable(functions, 'cleanupOrphanedUsers');
    const result = await cleanupOrphanedUsersFunction({ email });
    
    return {
      success: true,
      data: result.data
    };
  } catch (error: unknown) {
    console.error('Error calling cleanupOrphanedUsers function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clean up orphaned user'
    };
  }
}; 