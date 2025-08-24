import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, getDoc, doc, setDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { getTeamAvailabilitySlots } from '../services/availability';
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
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [teamName, setTeamName] = useState<string>('');
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState<string>('');

  // Define role-based variables
  const isStaff = role === 'STAFF';
  const isAthlete = role === 'ATHLETE';

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
        const result = await getTeamAvailabilitySlots(user?.proId || user?.uid || '');
        if (result.success && result.slots) {
          // Filter availability slots for the specific staff member
          const memberSlots = result.slots.filter(slot => slot.userId === userId);
          setAvailabilitySlots(memberSlots);
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

            <div className="mt-6 flex justify-end">
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

  // Define loadTeamData function before using it in useEffect
  const loadTeamData = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // Determine the proId to query for team members
      let teamProId: string;
      if (role === 'PRO') {
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
      
      
      if (role === 'PRO') {
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

  const createInvite = async (role: 'STAFF' | 'ATHLETE', email?: string) => {
    if (!user?.uid) return null;
    
    try {
      setCreatingInvite(true);
      
      const response = await fetch('https://us-central1-drp-workshop.cloudfunctions.net/createInvite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseUser!.getIdToken()}`
        },
        body: JSON.stringify({ role, email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invite');
      }

      const result = await response.json();
      return result.invite;
    } catch (error) {
      console.error('Error creating invite:', error);
      throw error;
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCreateInvite = async (role: 'STAFF' | 'ATHLETE') => {
    try {
      const invite = await createInvite(role, undefined);
      if (invite) {
        // Generate QR code for the invite
        const qrCodeDataUrl = await QRCode.toDataURL(invite.inviteUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        // Store the QR code
        const newQRCode: InviteQRCode = {
          role: role,
          url: invite.inviteUrl,
          qrCodeDataUrl
        };
        
        setQrCodes(prev => [...prev, newQRCode]);
        
        // Copy the invite URL to clipboard
        await copyToClipboard(invite.inviteUrl);
        alert(`✅ ${role} invite created and copied to clipboard! QR code generated below.`);
        
        // Reload team data to show updated counts
        setTimeout(() => {
          loadTeamData();
        }, 1000);
      }
    } catch (error) {
      alert(`❌ Error creating invite: ${(error as Error).message}`);
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Name</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamName || 'Loading...'}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <span className="text-2xl">👑</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your team name
                </p>
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
        <p className="text-gray-600 dark:text-gray-400">
          Manage your team members and invite new Staff and Athletes
        </p>
      </div>

      {/* Team Name Section - PRO Users */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Your Team Name:</span>
            {isEditingTeamName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingTeamName}
                  onChange={(e) => setEditingTeamName(e.target.value)}
                  className="px-3 py-1 text-lg font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="Enter team name"
                  maxLength={30}
                  autoFocus
                />
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
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {teamName || 'My Team'}
                </span>
                <button
                  onClick={startEditingTeamName}
                  className="p-1 text-gray-500 hover:text-purple-600 transition-colors"
                  title="Edit team name"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
              <p className="text-sm mt-1">Perfect for sharing in person or on social media</p>
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
                    <button
                      onClick={() => copyToClipboard(qrCode.url)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      Copy Link
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <img 
                      src={qrCode.qrCodeDataUrl} 
                      alt={`QR Code for ${qrCode.role} invite`}
                      className="w-32 h-32 border border-gray-200 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                    Scan with any QR code app
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
    </div>
  );
}

export default TeamManagement; 