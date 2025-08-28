import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import SEO from '../components/SEO';
import { getTeamAvailabilitySlots } from '../services/availability';
import type { AvailabilitySlot } from '../services/availability';

interface TeamMember {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'PRO' | 'STAFF' | 'ATHLETE';
  photoURL?: string;
  createdAt: Timestamp | null; // Allow null for minimal PRO user
}

interface TeamInfo {
  members: number;
  proInfo: boolean;
  staffCount: number;
  athleteCount: number;
}

interface ProfileModalProps {
  member: TeamMember;
  isOpen: boolean;
  onClose: () => void;
}

const AthleteTeam: React.FC = () => {
  const { user, proId } = useAuth(); // Get proId from auth context
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [proInfo, setProInfo] = useState<TeamMember | null>(null);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    // Check both user.proId and auth context proId
    const userProId = user?.proId || proId;
    
    if (user && userProId) {
      loadTeamData(userProId);
    } else {
      setLoading(false);
      setError('You are not currently part of a team');
    }
  }, [user, proId]);

  const loadTeamData = async (userProId: string) => {
    try {
      // First, fetch team members (this should now include the PRO user)
      const membersQuery = query(
        collection(db, 'users'),
        where('proId', '==', userProId)
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      const members: TeamMember[] = [];
      
      membersSnapshot.forEach(doc => {
        const data = doc.data();
        members.push({
          uid: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          role: data.role || 'ATHLETE',
          createdAt: data.createdAt || null
        });
      });
      
      // Look for PRO user in the team members first
      let proInfo: TeamMember | null = members.find(member => member.role === 'PRO') || null;
      
      if (!proInfo) {
        // Check if there's a user with the same UID as proId (this should work now after the fix)
        const proUserDoc = await getDoc(doc(db, 'users', userProId));
        
        if (proUserDoc.exists()) {
          const proUserData = proUserDoc.data();
          if (proUserData.role === 'PRO') {
            proInfo = {
              uid: proUserDoc.id,
              firstName: proUserData.firstName || '',
              lastName: proUserData.lastName || '',
              email: proUserData.email || '',
              role: 'PRO',
              createdAt: proUserData.createdAt || null
            };
          }
        }
      }
      
      // If still no PRO user found, create minimal placeholder
      if (!proInfo) {
        proInfo = {
          uid: userProId,
          firstName: 'Coach',
          lastName: 'User',
          email: 'coach@team.com',
          role: 'PRO',
          createdAt: null
        };
      }
      
      // Set team info
      const teamInfo = {
        members: members.length,
        proInfo: true,
        staffCount: members.filter(member => member.role === 'PRO' || member.role === 'STAFF').length,
        athleteCount: members.filter(member => member.role === 'ATHLETE').length
      };
      
      setTeamMembers(members);
      setProInfo(proInfo);
      setTeamInfo(teamInfo);
      setLoading(false);
      
    } catch (error) {
      console.error('Error loading team data:', error);
      setError('Failed to load team data');
      setLoading(false);
    }
  };

  // Profile Modal Component for viewing team member availability
  const ProfileModal: React.FC<ProfileModalProps> = ({ member, isOpen, onClose }) => {
    const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    useEffect(() => {
      if (isOpen && member && (member.role === 'STAFF' || member.role === 'PRO')) {
        loadMemberAvailability(member.uid);
      }
    }, [isOpen, member]);

    const loadMemberAvailability = async (userId: string) => {
      try {
        setLoadingAvailability(true);
        const userProId = user?.proId || proId;
        if (userProId) {
          const result = await getTeamAvailabilitySlots(userProId);
          if (result.success && result.slots) {
            // Filter availability slots for the specific member
            const memberSlots = result.slots.filter(slot => slot.userId === userId);
            setAvailabilitySlots(memberSlots);
          }
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
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {member.firstName} {member.lastName}'s Profile
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{member.email}</p>
            <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full mt-2 ${
              member.role === 'PRO' 
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                : member.role === 'STAFF'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {member.role}
            </span>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Availability Schedule
            </h3>
            
            {loadingAvailability ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : availabilitySlots.length > 0 ? (
              <div className="space-y-4">
                {availabilitySlots.map((slot) => (
                  <div key={slot.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getDayName(slot.dayOfWeek)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </span>
                      </div>
                      {slot.isRecurring && (
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
                          Weekly
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No availability slots found for this team member.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleMemberClick = (member: TeamMember) => {
    // Only allow Staff and PRO users to view profiles
    if (user?.role === 'STAFF' || user?.role === 'PRO') {
      setSelectedMember(member);
      setIsProfileModalOpen(true);
    }
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedMember(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading team information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Team Access Error</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Please contact your coach if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  if (!teamInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🏃‍♂️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Team Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You are not currently part of a team.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Please contact your coach to receive an invite.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Your Team - DRP Workshop"
        description="View your team information, teammates, and role in the DRP Workshop platform."
        keywords="team members, teammates, coach, staff, athletes, team information"
        url="/app/team"
      />
      
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Your Team
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View your team information and connect with teammates
            </p>
          </div>

          {/* Team Overview */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Team Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {teamInfo.members}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Total Members</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {teamInfo.staffCount}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Staff</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {teamInfo.athleteCount}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Athletes</div>
              </div>
            </div>
          </div>

          {/* PRO User Card */}
          {proInfo && (
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Team Owner
              </h2>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {proInfo.firstName.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {proInfo.firstName} {proInfo.lastName}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{proInfo.email}</p>
                  <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm rounded-full mt-2">
                    PRO
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Team Members */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="text-indigo-600 dark:text-indigo-400 mr-2">👥</span>
              Team Members ({teamMembers.length})
            </h2>
            
            {/* Staff Section (including PRO user) */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-purple-600 dark:text-purple-400 mr-2">👨‍💼</span>
                Staff ({teamInfo.staffCount})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers
                  .filter(member => member.role === 'PRO' || member.role === 'STAFF')
                  .map((member) => (
                    <div 
                      key={member.uid} 
                      className={`bg-white dark:bg-neutral-800 rounded-lg shadow p-4 ${
                        (user?.role === 'STAFF' || user?.role === 'PRO') 
                          ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' 
                          : ''
                      }`}
                      onClick={() => handleMemberClick(member)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                          <span className="text-xl">
                            {member.role === 'PRO' ? '👑' : '👨‍💼'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {member.firstName} {member.lastName}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                            member.role === 'PRO' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                      {(user?.role === 'STAFF' || user?.role === 'PRO') && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                          Click to view profile
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Athletes Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex flex-center">
                <span className="text-green-600 dark:text-green-400 mr-2">🏃‍♂️</span>
                Athletes ({teamInfo.athleteCount})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers
                  .filter(member => member.role === 'ATHLETE')
                  .map((member) => (
                    <div 
                      key={member.uid} 
                      className={`bg-white dark:bg-neutral-800 rounded-lg shadow p-4 ${
                        (user?.role === 'STAFF' || user?.role === 'PRO') 
                          ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' 
                          : ''
                      }`}
                      onClick={() => handleMemberClick(member)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                          <span className="text-xl">🏃‍♂️</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {member.firstName} {member.lastName}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            ATHLETE
                          </span>
                        </div>
                      </div>
                      {(user?.role === 'STAFF' || user?.role === 'PRO') && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                          Click to view profile
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Team Guidelines */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
              <span className="mr-2">📋</span>
              Team Guidelines
            </h3>
            <ul className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
              <li>• Communicate with your coach about any training concerns or questions</li>
              <li>• Complete your assigned programs and track your progress</li>
              <li>• Respect your teammates and maintain a positive team environment</li>
              <li>• Contact your coach if you need to modify your training schedule</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Profile Modal */}
      <ProfileModal 
        member={selectedMember!} 
        isOpen={isProfileModalOpen} 
        onClose={closeProfileModal} 
      />
    </>
  );
};

export default AthleteTeam; 