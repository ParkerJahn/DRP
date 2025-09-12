import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, getDoc, doc, setDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { getUserAvailabilitySlots } from '../services/availability';
import { removeTeamMember } from '../services/teamManagement';
import type { AvailabilitySlot } from '../services/availability';

interface TeamMember {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role: 'STAFF' | 'ATHLETE' | 'PRO';
  joinedAt: Date;
  status: 'active' | 'pending';
}

interface SeatLimits {
  staffLimit: number;
  athleteLimit: number;
}

interface InviteQRCode {
  role: 'STAFF' | 'ATHLETE';
  url: string;
  qrCodeDataUrl: string;
}

interface ProfileModalProps {
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
}


function TeamManagement() {
  const { user, firebaseUser, role } = useAuth();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [seatLimits, setSeatLimits] = useState<SeatLimits>({ staffLimit: 5, athleteLimit: 20 }); // Default limits
  const [loading, setLoading] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [qrCodes, setQrCodes] = useState<InviteQRCode[]>([]);
  const [currentInviteLink, setCurrentInviteLink] = useState<{url: string, role: 'STAFF' | 'ATHLETE', remaining: number} | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [teamName, setTeamName] = useState<string>('');
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState<string>('');
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  // Define role-based variables
  const isStaff = role === 'STAFF';
  const isAthlete = role === 'ATHLETE';
  const isPro = role === 'PRO';

  // Profile Modal Component
  const ProfileModal: React.FC<ProfileModalProps> = ({ member, isOpen, onClose }) => {
    const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    useEffect(() => {
      if (isOpen && member && member.role === 'STAFF') {
        loadMemberAvailability(member.uid);
      }
    }, [isOpen, member]);

    const loadMemberAvailability = async (userId: string) => {
      try {
        setLoadingAvailability(true);
        const result = await getUserAvailabilitySlots(userId);
        if (result.success && result.slots) {
          setAvailabilitySlots(result.slots);
        }
      } catch (error) {
        console.error('Error loading availability:', error);
      } finally {
        setLoadingAvailability(false);
      }
    };

    const getDayName = (dayOfWeek: number) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[dayOfWeek];
    };

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    if (!isOpen || !member) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-ethnocentric">
                👤 Member Profile
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium ${
                  member.role === 'STAFF' 
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                    : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                }`}>
                  {member.role === 'STAFF' ? '👥' : '💪'}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-lg">
                    {member.displayName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {member.role}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {member.firstName && member.lastName 
                      ? `${member.firstName} ${member.lastName}` 
                      : member.displayName || 'Not provided'
                    }
                  </p>
                </div>

                <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white">{member.email}</p>
                </div>

                <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {member.phoneNumber || 'Not provided'}
                  </p>
                </div>

                <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Type
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.role === 'STAFF' 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                      : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                  }`}>
                    {member.role}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Joined Date
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {member.joinedAt.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>

                {/* Weekly Availability for Staff Members */}
                {member.role === 'STAFF' && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      📅 Weekly Availability
                    </label>
                    
                    {loadingAvailability ? (
                      <div className="animate-pulse space-y-2">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div key={i} className="h-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        ))}
                      </div>
                    ) : availabilitySlots.length > 0 ? (
                      <div className="space-y-2">
                        {Array.from({ length: 7 }).map((_, dayOfWeek) => {
                          const daySlots = availabilitySlots.filter(slot => slot.dayOfWeek === dayOfWeek);
                          return (
                            <div key={dayOfWeek} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-20">
                                {getDayName(dayOfWeek)}
                              </span>
                              <div className="flex-1 ml-3">
                                {daySlots.length > 0 ? (
                                  daySlots.map((slot, index) => (
                                    <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                      {slot.isRecurring && (
                                        <span className="ml-2 text-green-600 dark:text-green-400">🔄</span>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">No availability</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        <div className="text-2xl mb-2">📅</div>
                        <p className="text-sm">No availability set</p>
                        <p className="text-xs mt-1">Staff member hasn't set their weekly schedule yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              {isPro && member.uid !== user?.uid && (
                <button
                  onClick={() => {
                    setMemberToRemove(member);
                    setShowRemoveConfirmation(true);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Remove Member</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Remove member function
  const handleRemoveMember = async (member: TeamMember) => {
    if (!user || role !== 'PRO') return;
    
    try {
      setIsRemovingMember(true);
      
      // Call the Cloud Function to remove the member
      const result = await removeTeamMember(member.uid);

      if (result.success) {
        // Reload team data to reflect the removal
        loadTeamData();
        alert(`✅ ${member.displayName} has been removed from your team.`);
      } else {
        throw new Error(result.error || 'Failed to remove team member.');
      }
      
      // Close modals
      setShowRemoveConfirmation(false);
      setMemberToRemove(null);
      setIsProfileModalOpen(false);
      
    } catch (error) {
      console.error('Error removing team member:', error);
      alert(`❌ Error removing team member: ${(error as Error).message}`);
    } finally {
      setIsRemovingMember(false);
    }
  };

  // Remove Confirmation Modal
  const RemoveConfirmationModal: React.FC = () => {
    if (!showRemoveConfirmation || !memberToRemove) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-ethnocentric">
                  Remove Team Member
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to remove <span className="font-semibold">{memberToRemove.displayName}</span> from your team?
              </p>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-600 dark:text-yellow-400">ℹ️</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      What happens next?
                    </h4>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Their account becomes inactive</li>
                        <li>They lose access to team resources</li>
                        <li>They'll need a new invite link to rejoin any team</li>
                        <li>All their data remains but is no longer accessible</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRemoveConfirmation(false);
                  setMemberToRemove(null);
                }}
                disabled={isRemovingMember}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveMember(memberToRemove)}
                disabled={isRemovingMember}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
              >
                {isRemovingMember ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <span>Remove Member</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Define loadTeamData function before using it in useEffect
  const loadTeamData = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // Determine the proId to query for team members
      let teamProId: string;
      if (isPro) {
        // PRO users are looking for their team members
        teamProId = user.uid;
      } else {
        // STAFF/ATHLETE users are looking for their team members (same proId as them)
        teamProId = user.proId || user.uid;
      }
      
      // Load team members
      const membersQuery = query(
        collection(db, 'users'),
        where('proId', '==', teamProId)
        // Removed orderBy to avoid composite index requirement
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      const members: TeamMember[] = [];
      membersSnapshot.forEach(doc => {
        const data = doc.data();
        // Include all team members including PRO users
        members.push({
          uid: doc.id,
          email: data.email || '',
          displayName: data.displayName || 'Unknown User',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phoneNumber: data.phoneNumber || '',
          role: data.role,
          joinedAt: data.createdAt?.toDate() || new Date(),
          status: 'active'
        });
      });
      
      // If this is a PRO user, also add themselves to the team list
      
      
      if (isPro) {
        // Check if PRO user is already in the list
        const proUserExists = members.some(member => member.uid === user.uid);
        if (!proUserExists) {
          members.push({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Unknown User',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phoneNumber: user.phoneNumber || '',
            role: 'PRO',
            joinedAt: user.createdAt?.toDate() || new Date(),
            status: 'active'
          });
        }
      } else if (role === 'STAFF' || role === 'ATHLETE') {
        // STAFF/ATHLETE users need to see their PRO user (team leader)
        // We need to find the PRO user who has the same proId as the current user
        
        // The PRO user should have uid == user.proId (since they're the team owner)
        const proUserId = user.proId;
        if (proUserId) {
          // Check if PRO user is already in the list
          const proUserExists = members.some(member => member.uid === proUserId);
          if (!proUserExists) {
            // We need to fetch the PRO user's data from Firestore
            try {
              const proUserDoc = await getDoc(doc(db, 'users', proUserId));
              if (proUserDoc.exists()) {
                const proUserData = proUserDoc.data();
                members.push({
                  uid: proUserId,
                  email: proUserData.email || '',
                  displayName: proUserData.displayName || 'Unknown User',
                  firstName: proUserData.firstName || '',
                  lastName: proUserData.lastName || '',
                  phoneNumber: proUserData.phoneNumber || '',
                  role: 'PRO',
                  joinedAt: proUserData.createdAt?.toDate() || new Date(),
                  status: 'active'
                });
              }
            } catch (error) {
              console.error('Error fetching PRO user data:', error);
            }
          }
        }
      }
      
      // Sort by creation date (newest first) in memory
      members.sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
      
      setTeamMembers(members);

      // Load seat limits from user document or use defaults
      if (user?.seats) {
        setSeatLimits({
          staffLimit: user.seats.staffLimit || 5,
          athleteLimit: user.seats.athleteLimit || 20
        });
      }
      
      // Load team name for all users (so they can see their team's name)
      try {
        let proUserId = user.uid;
        if (role === 'STAFF' || role === 'ATHLETE') {
          proUserId = user.proId || user.uid;
        }
        
        const teamDoc = await getDoc(doc(db, 'teams', proUserId));
        if (teamDoc.exists()) {
          const teamData = teamDoc.data();
          setTeamName(teamData.teamName || 'My Team');
        } else {
          setTeamName('My Team');
        }
      } catch (error) {
        console.error('Error loading team name:', error);
        setTeamName('My Team');
      }
      
    } catch (error) {
      console.error('Error loading team data:', error);
      // Set default data on error
      setTeamMembers([]);
      setSeatLimits({
        staffLimit: user.seats?.staffLimit || 5,
        athleteLimit: user.seats?.athleteLimit || 20
      });
      
      // Show error to user
      alert(`❌ Error loading team data: ${(error as Error).message}. Please check the console for details.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadTeamData();
    }
  }, [user?.uid]);

  const getBaseOrigin = (): string => {
    // Prefer explicit env var when provided
    const envBase = (import.meta as { env?: { VITE_APP_BASE_URL?: string } })?.env?.VITE_APP_BASE_URL;
    if (envBase) {
      try { return new URL(envBase).origin; } catch { /* ignore */ }
    }
    // Fallback to the current site origin
    return window.location.origin;
  };

  const normalizeInviteUrl = (rawUrl: string): string => {
    try {
      const incoming = new URL(rawUrl);
      const desiredOrigin = getBaseOrigin();
      const desired = new URL(desiredOrigin);
      // Preserve path and query from the incoming link but swap origin
      return `${desired.origin}${incoming.pathname}${incoming.search}${incoming.hash}`;
    } catch {
      // If parsing fails, fallback to joining with /join route and token if present
      const base = getBaseOrigin();
      return rawUrl.startsWith('/') ? `${base}${rawUrl}` : `${base}/join`;
    }
  };

  const getPersistentInvites = async () => {
    try {
      setCreatingInvite(true);
      // Include Firebase ID token for auth
      if (!firebaseUser) {
        throw new Error('User not authenticated');
      }
      const token = await firebaseUser.getIdToken();
      const response = await fetch('https://us-central1-drp-workshop.cloudfunctions.net/getPersistentInvites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get invite links (HTTP ${response.status})`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting persistent invites:', error);
      alert('Failed to get invite links. Please sign in again and try once more.');
      return null;
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCreateInvite = async (role: 'STAFF' | 'ATHLETE') => {
    try {
      const invites = await getPersistentInvites();
      if (invites && invites.success) {
        // Get the appropriate invite URL based on role from the correct response structure
        const inviteUrl = role === 'STAFF' 
          ? invites.invites.staff.inviteUrl 
          : invites.invites.athlete.inviteUrl;
        
        // Safely handle URL normalization
        const normalizedUrl = inviteUrl ? normalizeInviteUrl(inviteUrl) : null;
        
        if (!normalizedUrl) {
          throw new Error('Invalid invite URL received from server');
        }
        
        // Generate QR code for the invite URL
        const qrCodeDataUrl = await QRCode.toDataURL(normalizedUrl, {
          errorCorrectionLevel: 'M',
          margin: 1,
          scale: 6,
          color: { dark: '#111827', light: '#ffffff' }
        });

        const newQRCode: InviteQRCode = {
          role,
          url: normalizedUrl,
          qrCodeDataUrl
        };
        setQrCodes(prev => [newQRCode, ...prev].slice(0, 6));

        await copyToClipboard(normalizedUrl);
        
        // Get remaining invite count for display
        const inviteData = role === 'STAFF' ? invites.invites.staff : invites.invites.athlete;
        const remaining = inviteData.remainingInvites;
        
        // Store the current invite link info for display
        setCurrentInviteLink({
          url: normalizedUrl,
          role: role,
          remaining: remaining
        });
        
        // Show success notification
        const successMessage = `✅ ${role} invite link copied to clipboard and displayed below!\n\nThis is a permanent link that can be used multiple times.\nRemaining ${role.toLowerCase()} invites: ${remaining}`;
        
        // You can replace this alert with a toast notification if you have one
        alert(successMessage);
      }
    } catch (error) {
      console.error('Error getting invite link:', error);
      alert(`❌ Error getting invite link: ${(error as Error).message}`);
    }
  };

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedMember(null);
  };

  const saveTeamName = async () => {
    if (!user?.uid || !editingTeamName.trim()) return;
    
    try {
      await setDoc(doc(db, 'teams', user.uid), {
        teamName: editingTeamName.trim(),
        proId: user.uid,
        createdAt: new Date()
      }, { merge: true });
      
      setTeamName(editingTeamName.trim());
      setIsEditingTeamName(false);
    } catch (error) {
      console.error('Error saving team name:', error);
      alert('Failed to save team name. Please try again.');
    }
  };

  const startEditingTeamName = () => {
    setEditingTeamName(teamName);
    setIsEditingTeamName(true);
  };

  const cancelEditingTeamName = () => {
    setEditingTeamName(teamName);
    setIsEditingTeamName(false);
  };

  // Fix PRO user proId issues
  const fixProUserProId = async () => {
    if (!firebaseUser || role !== 'PRO') return;
    
    try {
      setLoading(true);
      const token = await firebaseUser.getIdToken();
      
      const response = await fetch('https://us-central1-drp-workshop.cloudfunctions.net/fixExistingProUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fix PRO user (HTTP ${response.status})`);
      }

      const result = await response.json();
      console.log('PRO user fixed:', result);
      
      // Reload team data to see the changes
      await loadTeamData();
      
      alert('✅ PRO user account fixed! Your team members should now appear.');
    } catch (error) {
      console.error('Error fixing PRO user:', error);
      alert(`❌ Error fixing PRO user: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Only PRO users can access team management
  if (role !== 'PRO') {
    // Handle STAFF and ATHLETE users
    
      return (
        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-ethnocentric">Your Team</h1>
              <div className="relative group">
                <button className="w-6 h-6 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-full flex items-center justify-center transition-colors duration-200">
                  <span className="text-gray-600 dark:text-gray-400 text-sm font-bold">?</span>
                </button>
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 w-80 lg:block hidden">
                  <div className="text-center">
                    <h4 className="font-semibold mb-2">👥 Team Information</h4>
                    <div className="text-left space-y-2 text-xs">
                      <p><strong>Team Overview:</strong> View your team members and understand your role</p>
                      <p><strong>Team Members:</strong> See other staff and athletes on your team</p>
                      <p><strong>Your Role:</strong> You're a {isStaff ? 'STAFF member with coaching responsibilities' : 'ATHLETE with training access'}</p>
                      <p><strong>Team Collaboration:</strong> Work together with PRO and other team members</p>
                    </div>
                  </div>
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900 dark:border-r-gray-800"></div>
                </div>
                {/* Mobile/Tablet tooltip - appears below */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 w-80 lg:hidden">
                  <div className="text-center">
                    <h4 className="font-semibold mb-2">👥 Team Information</h4>
                    <div className="text-left space-y-2 text-xs">
                      <p><strong>Team Overview:</strong> View your team members and understand your role</p>
                      <p><strong>Team Members:</strong> See other staff and athletes on your team</p>
                      <p><strong>Your Role:</strong> You're a {isStaff ? 'STAFF member with coaching responsibilities' : 'ATHLETE with training access'}</p>
                      <p><strong>Team Collaboration:</strong> Work together with PRO and other team members</p>
                    </div>
                  </div>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-b-4 border-l-4 border-r-4 border-transparent border-b-gray-900 dark:border-r-gray-800"></div>
                </div>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              View your team members and understand your role within the team
            </p>
          </div>

          {/* Team Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Your Role Card */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 ${isStaff ? 'border-green-500' : 'border-blue-500'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Your Role</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{role}</p>
                </div>
                <div className={`p-3 rounded-full ${isStaff ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                  <span className="text-2xl">{isStaff ? '👨‍💼' : '💪'}</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isStaff 
                    ? "You're a valued team member with coaching and support responsibilities"
                    : "You're an athlete with access to training programs and team support"
                  }
                </p>
              </div>
            </div>

            {/* Team Size Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Size</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(() => {
                      const proCount = teamMembers.filter(member => member.role === 'PRO').length;
                      const staffCount = teamMembers.filter(member => member.role === 'STAFF').length;
                      const athleteCount = teamMembers.filter(member => member.role === 'ATHLETE').length;
                      return proCount + staffCount + athleteCount;
                    })()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total team members
                </p>
              </div>
            </div>

            {/* Team Name Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full mb-3">
                  <span className="text-2xl">👑</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Name</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamName || 'Loading...'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff Members */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 flex items-center">
                  👥 Staff Members ({teamMembers.filter(member => member.role === 'PRO').length + teamMembers.filter(member => member.role === 'STAFF').length})
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* PRO user (Team Leader) */}
                {teamMembers
                  .filter(member => member.role === 'PRO')
                  .map((member) => (
                    <div key={member.uid} className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" onClick={() => handleMemberClick(member)}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                          👑
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{member.displayName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : 'Name not provided'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                          PRO (Team Leader)
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Joined {member.joinedAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                
                {/* Current STAFF user */}
                {isStaff && (
                  <div className="px-6 py-4 flex items-center justify-between bg-green-50 dark:bg-green-900/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                        👥
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{user?.displayName || 'You'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                        STAFF (You)
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Other STAFF members */}
                {teamMembers
                  .filter(member => member.role === 'STAFF' && member.uid !== user?.uid)
                  .map((member) => (
                    <div key={member.uid} className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" onClick={() => handleMemberClick(member)}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                          👥
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{member.displayName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : 'Name not provided'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                          STAFF
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Joined {member.joinedAt.toLocaleDateString()}
                        </span>
                        {isPro && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Click to manage
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Athletes */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 flex items-center">
                  💪 Athletes ({teamMembers.filter(member => member.role === 'ATHLETE').length + (isAthlete ? 1 : 0)})
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Current ATHLETE user */}
                {isAthlete && (
                  <div className="px-6 py-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/10">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                          💪
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{user?.displayName || 'You'}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                          ATHLETE (You)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Other ATHLETES */}
                {teamMembers
                  .filter(member => member.role === 'ATHLETE' && member.uid !== user?.uid)
                  .map((member) => (
                    <div key={member.uid} className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" onClick={() => handleMemberClick(member)}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                          💪
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{member.displayName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : 'Name not provided'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                          ATHLETE
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Joined {member.joinedAt.toLocaleDateString()}
                        </span>
                        {isPro && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Click to manage
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Team Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">{isStaff ? 'Staff Responsibilities' : 'Athlete Benefits'}</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {isStaff ? (
                    <>
                      <li>• Assist with coaching and training programs</li>
                      <li>• Support athletes in their fitness journey</li>
                      <li>• Collaborate with the PRO user</li>
                      <li>• Access to team resources and tools</li>
                    </>
                  ) : (
                    <>
                      <li>• Access to personalized training programs</li>
                      <li>• Support from coaching staff</li>
                      <li>• Team collaboration opportunities</li>
                      <li>• Progress tracking and analytics</li>
                    </>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Team Collaboration</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Work together with PRO and other team members to achieve your fitness goals. 
                  The team structure provides support, accountability, and shared resources.
                </p>
              </div>
            </div>
          </div>

          <ProfileModal member={selectedMember} isOpen={isProfileModalOpen} onClose={closeProfileModal} />
        </div>
      );
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const getCurrentCount = (memberRole: 'STAFF' | 'ATHLETE') => {
    return teamMembers.filter(member => member.role === memberRole).length;
  };

  const getRemainingSeats = (memberRole: 'STAFF' | 'ATHLETE') => {
    const currentCount = getCurrentCount(memberRole);
    const limit = memberRole === 'STAFF' ? seatLimits.staffLimit : seatLimits.athleteLimit;
    return Math.max(0, limit - currentCount);
  };

  const isLimitReached = (memberRole: 'STAFF' | 'ATHLETE') => {
    return getRemainingSeats(memberRole) === 0;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-ethnocentric">Your Team</h1>
          <div className="relative group">
            <button className="w-6 h-6 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-full flex items-center justify-center transition-colors duration-200">
              <span className="text-gray-600 dark:text-gray-400 text-sm font-bold">?</span>
            </button>
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 w-80 lg:block hidden">
              <div className="text-center">
                <h4 className="font-semibold mb-2">📧 How Invites Work</h4>
                <div className="text-left space-y-2 text-xs">
                  <p><strong>1.</strong> Click "Quick Invite Staff" or "Quick Invite Athlete"</p>
                  <p><strong>2.</strong> The invite link is automatically copied to your clipboard</p>
                  <p><strong>3.</strong> Share the link with your team member via email, text, or messaging</p>
                  <p><strong>4.</strong> They click the link and sign in with their Google account</p>
                  <p><strong>5.</strong> They're automatically added to your team with the correct role</p>
                  <p><strong>6.</strong> A QR code is generated for easy in-person sharing</p>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-700 text-center">
                  <p className="text-gray-300">💡 <strong>Pro Tip:</strong> Use QR codes for quick invites during in-person meetings!</p>
                </div>
              </div>
              <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900 dark:border-r-gray-800"></div>
            </div>
            {/* Mobile/Tablet tooltip - appears below */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 w-80 lg:hidden">
              <div className="text-center">
                <h4 className="font-semibold mb-2">📧 How Invites Work</h4>
                <div className="text-left space-y-2 text-xs">
                  <p><strong>1.</strong> Click "Quick Invite Staff" or "Quick Invite Athlete"</p>
                  <p><strong>2.</strong> The invite link is automatically copied to your clipboard</p>
                  <p><strong>3.</strong> Share the link with your team member via email, text, or messaging</p>
                  <p><strong>4.</strong> They click the link and sign in with their Google account</p>
                  <p><strong>5.</strong> They're automatically added to your team with the correct role</p>
                  <p><strong>6.</strong> A QR code is generated for easy in-person sharing</p>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-700 text-center">
                  <p className="text-gray-300">💡 <strong>Pro Tip:</strong> Use QR codes for quick invites during in-person meetings!</p>
                </div>
              </div>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-b-4 border-l-4 border-r-4 border-transparent border-b-gray-900 dark:border-r-gray-800"></div>
            </div>
          </div>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Manage your team members and invite new Staff and Athletes
        </p>
      </div>

      {/* Team Name Section - PRO Users */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center text-center space-y-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Your Team Name:</span>
          {isEditingTeamName ? (
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <input
                type="text"
                value={editingTeamName}
                onChange={(e) => setEditingTeamName(e.target.value)}
                className="px-3 py-1 text-base sm:text-lg font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 w-full sm:w-auto"
                placeholder="Enter team name"
                maxLength={30}
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={saveTeamName}
                  className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={cancelEditingTeamName}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {teamName || 'My Team'}
              </span>
              <button
                onClick={startEditingTeamName}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors duration-200 flex items-center space-x-1"
                title="Edit team name"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PRO User Fix Section - Show only if no team members are showing */}
      {teamMembers.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Team Members Not Showing?
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                If you're not seeing your team members, there might be an issue with your account setup. 
                Click the button below to fix this automatically.
              </p>
              <button
                onClick={fixProUserProId}
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Fixing...</span>
                  </>
                ) : (
                  <>
                    <span>🔧</span>
                    <span>Fix My Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Links Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff Quick Invite Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            👥 Staff Invites
          </h3>
          
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {getCurrentCount('STAFF')}/{seatLimits.staffLimit}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Staff Members
              </div>
            </div>
            
            <button
              onClick={() => handleCreateInvite('STAFF')}
              disabled={creatingInvite || isLimitReached('STAFF')}
              className={`w-full px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isLimitReached('STAFF')
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
              }`}
            >
              {isLimitReached('STAFF') ? 'Limit Reached' : 'Quick Invite Staff'}
            </button>
            
            {isLimitReached('STAFF') && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-md text-center">
                ⚠️ Staff limit reached
              </div>
            )}
            
            {/* Staff Invite Link Display */}
            {currentInviteLink && currentInviteLink.role === 'STAFF' && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                      STAFF
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Remaining: {currentInviteLink.remaining}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(currentInviteLink.url)}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                  >
                    📋 Copy Link
                  </button>
                </div>
                
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🔗 Invite Link (manually copy here):
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentInviteLink.url}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-full text-xs px-3 py-2 border border-green-300 dark:border-green-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  title="Click to select the full invite link"
                />
              </div>
            )}
          </div>
        </div>

        {/* Athlete Quick Invite Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            💪 Athlete Invites
          </h3>
          
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {getCurrentCount('ATHLETE')}/{seatLimits.athleteLimit}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Athletes
              </div>
            </div>
            
            <button
              onClick={() => handleCreateInvite('ATHLETE')}
              disabled={creatingInvite || isLimitReached('ATHLETE')}
              className={`w-full px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isLimitReached('ATHLETE')
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
              }`}
            >
              {isLimitReached('ATHLETE') ? 'Limit Reached' : 'Quick Invite Athlete'}
            </button>
            
            {isLimitReached('ATHLETE') && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-md text-center">
                ⚠️ Athlete limit reached
              </div>
            )}
            
            {/* Athlete Invite Link Display */}
            {currentInviteLink && currentInviteLink.role === 'ATHLETE' && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                      ATHLETE
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Remaining: {currentInviteLink.remaining}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(currentInviteLink.url)}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    📋 Copy Link
                  </button>
                </div>
                
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🔗 Invite Link (manually copy here):
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentInviteLink.url}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-full text-xs px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  title="Click to select the full invite link"
                />
              </div>
            )}
          </div>
        </div>


        {/* QR Codes Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📱 QR Codes
          </h3>
          
          {qrCodes.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <div className="text-4xl mb-2">📱</div>
              <p>Generate an invite to see the QR code here!</p>
              <p className="text-sm mt-1">Perfect for sharing in person</p>
            </div>
          ) : (
            <div className="space-y-4">
              {qrCodes.map((qrCode, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        qrCode.role === 'STAFF' 
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                          : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                      }`}>
                        {qrCode.role}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                                      </div>
                    
                    <div className="flex justify-center">
                    <img 
                      src={qrCode.qrCodeDataUrl} 
                      alt={`QR Code for ${qrCode.role} invite`}
                      className="w-32 h-32 border border-gray-200 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                    📱 Scan with any QR code app
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Members Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Members */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 flex items-center">
                             👥 Staff Members ({teamMembers.filter(member => member.role === 'PRO').length + teamMembers.filter(member => member.role === 'STAFF').length})
            </h3>
          </div>
          
          {getCurrentCount('STAFF') === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">👥</div>
              <p>No staff members yet.</p>
              <p className="text-sm mt-1">Use the Staff Invites card above to add team members</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {teamMembers
                .filter(member => member.role === 'STAFF')
                .map((member) => (
                  <div key={member.uid} className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" onClick={() => handleMemberClick(member)}>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                        👥
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{member.displayName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                        STAFF
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Joined {member.joinedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Athletes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 flex items-center">
              💪 Athletes ({teamMembers.filter(member => member.role === 'ATHLETE').length + (isAthlete ? 1 : 0)})
            </h3>
          </div>
          
          {getCurrentCount('ATHLETE') === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">💪</div>
              <p>No athletes yet.</p>
              <p className="text-sm mt-1">Use the Athlete Invites card above to add team members</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {teamMembers
                .filter(member => member.role === 'ATHLETE')
                .map((member) => (
                  <div key={member.uid} className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" onClick={() => handleMemberClick(member)}>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                        💪
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{member.displayName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                        ATHLETE
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Joined {member.joinedAt.toLocaleDateString()}
                    </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
      <ProfileModal member={selectedMember} isOpen={isProfileModalOpen} onClose={closeProfileModal} />
      <RemoveConfirmationModal />
    </div>
  );
}

export default TeamManagement; 