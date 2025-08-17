import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

interface TeamMember {
  uid: string;
  email: string;
  displayName: string;
  role: 'STAFF' | 'ATHLETE';
  joinedAt: Date;
  status: 'active' | 'pending';
}

interface SeatLimits {
  staffLimit: number;
  athleteLimit: number;
}

function TeamManagement() {
  const { user, role } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [seatLimits, setSeatLimits] = useState<SeatLimits>({ staffLimit: 5, athleteLimit: 20 }); // Default limits
  const [loading, setLoading] = useState(true);
  const [copiedRole, setCopiedRole] = useState<'STAFF' | 'ATHLETE' | null>(null);

  // Define loadTeamData function before using it in useEffect
  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      // Load team members
      const membersQuery = query(
        collection(db, 'users'),
        where('proId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      const members: TeamMember[] = [];
      membersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.role !== 'PRO') { // Don't include PRO users in team list
          members.push({
            uid: doc.id,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            joinedAt: data.createdAt?.toDate() || new Date(),
            status: 'active'
          });
        }
      });
      setTeamMembers(members);

      // Load seat limits from user document or use defaults
      if (user?.seats) {
        setSeatLimits({
          staffLimit: user.seats.staffLimit || 5,
          athleteLimit: user.seats.athleteLimit || 20
        });
      }

      // Load pending invites (this would come from your invites collection)
      // For now, we'll simulate this
      
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadTeamData();
    }
  }, [user?.uid]);

  // Only PRO users can access team management
  if (role !== 'PRO') {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800">Access Restricted</h2>
          <p className="text-yellow-700">Only PRO users can access team management features.</p>
        </div>
      </div>
    );
  }

  const generateInviteLink = (inviteRole: 'STAFF' | 'ATHLETE') => {
    if (!user?.uid) return '';
    
    // Generate a simple invite link (in production, this would be a signed token)
    const baseUrl = window.location.origin;
    const inviteData = {
      proId: user.uid,
      role: inviteRole,
      timestamp: Date.now()
    };
    
    // Encode the invite data (in production, this would be a secure token)
    const encodedData = btoa(JSON.stringify(inviteData));
    return `${baseUrl}/join?invite=${encodedData}`;
  };

  const copyToClipboard = async (text: string, inviteRole: 'STAFF' | 'ATHLETE') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRole(inviteRole);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedRole(null), 2000);
      
      console.log(`✅ Invite link copied for ${inviteRole}`);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedRole(inviteRole);
      setTimeout(() => setCopiedRole(null), 2000);
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

  const staffInviteLink = generateInviteLink('STAFF');
  const athleteInviteLink = generateInviteLink('ATHLETE');

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Your Team</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your team members and invite new Staff and Athletes
        </p>
      </div>

      {/* Invite Links Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Invite Links */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              👥 Staff Invite Links
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {getCurrentCount('STAFF')}/{seatLimits.staffLimit} used
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={staffInviteLink}
                readOnly
                className={`flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border rounded-md ${
                  isLimitReached('STAFF') 
                    ? 'border-red-300 dark:border-red-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                    : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                }`}
                placeholder={isLimitReached('STAFF') ? 'Staff limit reached' : 'Staff invite link'}
              />
              <button
                onClick={() => copyToClipboard(staffInviteLink, 'STAFF')}
                disabled={isLimitReached('STAFF')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isLimitReached('STAFF')
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : copiedRole === 'STAFF'
                    ? 'bg-green-600 text-white focus:ring-green-500'
                    : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                }`}
              >
                {isLimitReached('STAFF') ? '❌ Limit Reached' : copiedRole === 'STAFF' ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
            
            {isLimitReached('STAFF') ? (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                ⚠️ You've reached your Staff limit of {seatLimits.staffLimit}. Upgrade your plan for more seats.
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {getRemainingSeats('STAFF')} Staff seats remaining
              </div>
            )}
          </div>
        </div>

        {/* Athlete Invite Links */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              💪 Athlete Invite Links
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {getCurrentCount('ATHLETE')}/{seatLimits.athleteLimit} used
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={athleteInviteLink}
                readOnly
                className={`flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border rounded-md ${
                  isLimitReached('ATHLETE') 
                    ? 'border-red-300 dark:border-red-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                    : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                }`}
                placeholder={isLimitReached('ATHLETE') ? 'Athlete limit reached' : 'Athlete invite link'}
              />
              <button
                onClick={() => copyToClipboard(athleteInviteLink, 'ATHLETE')}
                disabled={isLimitReached('ATHLETE')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isLimitReached('ATHLETE')
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : copiedRole === 'ATHLETE'
                    ? 'bg-blue-600 text-white focus:ring-blue-500'
                    : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
                }`}
              >
                {isLimitReached('ATHLETE') ? '❌ Limit Reached' : copiedRole === 'ATHLETE' ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
            
            {isLimitReached('ATHLETE') ? (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                ⚠️ You've reached your Athlete limit of {seatLimits.athleteLimit}. Upgrade your plan for more seats.
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {getRemainingSeats('ATHLETE')} Athlete seats remaining
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Team Members</h3>
        </div>
        
        {teamMembers.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">👥</div>
            <p>No team members yet. Use the invite links above to start building your team!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {teamMembers.map((member) => (
              <div key={member.uid} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    member.role === 'STAFF' 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                      : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                  }`}>
                    {member.role === 'STAFF' ? '👥' : '💪'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{member.displayName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    member.role === 'STAFF' 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                      : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                  }`}>
                    {member.role}
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

      {/* How to Use */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">📋 How to Use Invite Links</h4>
        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <li>1. <strong>Copy the invite link</strong> for the role you want (Staff or Athlete)</li>
          <li>2. <strong>Send it to your team member</strong> via email, text, or any messaging app</li>
          <li>3. <strong>They click the link</strong> and create their account</li>
          <li>4. <strong>They're automatically added</strong> to your team with the correct role</li>
          <li>5. <strong>Monitor your seat usage</strong> - you have {seatLimits.staffLimit} Staff and {seatLimits.athleteLimit} Athlete seats</li>
        </ol>
      </div>
    </div>
  );
}

export default TeamManagement; 