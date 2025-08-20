import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
// Temporarily disabled Firestore imports due to permission errors
// import { db } from '../config/firebase';
// import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

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
  const { user, firebaseUser, role } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [seatLimits, setSeatLimits] = useState<SeatLimits>({ staffLimit: 5, athleteLimit: 20 }); // Default limits
  const [loading, setLoading] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'STAFF' | 'ATHLETE'>('STAFF');

  // Define loadTeamData function before using it in useEffect
  const loadTeamData = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // TEMPORARILY DISABLED: Team data fetching causing Firestore permission errors
      // TODO: Fix Firestore rules to allow PRO users to read their team data
      console.log('🔍 Team data fetching temporarily disabled - fixing Firestore rules');
      
      // Set default data for now
      setTeamMembers([]);
      setSeatLimits({
        staffLimit: user.seats?.staffLimit || 5,
        athleteLimit: user.seats?.athleteLimit || 20
      });
      
      /* ORIGINAL CODE - ENABLE AFTER FIXING FIRESTORE RULES
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
      */

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

  const handleCreateInvite = async () => {
    try {
      const invite = await createInvite(inviteRole, inviteEmail || undefined);
      if (invite) {
        // Copy the invite URL to clipboard
        await copyToClipboard(invite.inviteUrl);
        setInviteEmail('');
        alert(`✅ ${inviteRole} invite created and copied to clipboard!`);
      }
    } catch (error) {
      alert(`❌ Error creating invite: ${(error as Error).message}`);
    }
  };

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('✅ Invite link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      console.log('✅ Invite link copied to clipboard (fallback)!');
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Your Team</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your team members and invite new Staff and Athletes
        </p>
      </div>

      {/* Invite Links Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Invite */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🚀 Create New Invite
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'STAFF' | 'ATHLETE')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="STAFF">👥 Staff Member</option>
                <option value="ATHLETE">💪 Athlete</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email (Optional)
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave blank for open invites, or specify to restrict to a specific email
              </p>
            </div>
            
            <button
              onClick={handleCreateInvite}
              disabled={creatingInvite || isLimitReached(inviteRole)}
              className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isLimitReached(inviteRole)
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : creatingInvite
                  ? 'bg-indigo-400 dark:bg-indigo-500 text-white cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500'
              }`}
            >
              {creatingInvite ? 'Creating...' : isLimitReached(inviteRole) ? '❌ Limit Reached' : `Create ${inviteRole} Invite`}
            </button>
            
            {isLimitReached(inviteRole) && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                ⚠️ You've reached your {inviteRole} limit of {inviteRole === 'STAFF' ? seatLimits.staffLimit : seatLimits.athleteLimit}. Upgrade your plan for more seats.
              </div>
            )}
          </div>
        </div>

        {/* Quick Invite Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ⚡ Quick Invites
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">👥 Staff</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {getCurrentCount('STAFF')}/{seatLimits.staffLimit} used
                </div>
              </div>
              <button
                onClick={() => {
                  setInviteRole('STAFF');
                  setInviteEmail('');
                  handleCreateInvite();
                }}
                disabled={creatingInvite || isLimitReached('STAFF')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isLimitReached('STAFF')
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                }`}
              >
                {isLimitReached('STAFF') ? 'Limit Reached' : 'Quick Invite'}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">💪 Athlete</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {getCurrentCount('ATHLETE')}/{seatLimits.athleteLimit} used
                </div>
              </div>
              <button
                onClick={() => {
                  setInviteRole('ATHLETE');
                  setInviteEmail('');
                  handleCreateInvite();
                }}
                disabled={creatingInvite || isLimitReached('ATHLETE')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isLimitReached('ATHLETE')
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
                }`}
              >
                {isLimitReached('ATHLETE') ? 'Limit Reached' : 'Quick Invite'}
              </button>
            </div>
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
        <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">📋 How to Use the New Invite System</h4>
        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <li>1. <strong>Create an invite</strong> by selecting the role (Staff or Athlete) and optionally specifying an email</li>
          <li>2. <strong>The invite link is automatically copied</strong> to your clipboard</li>
          <li>3. <strong>Send it to your team member</strong> via email, text, or any messaging app</li>
          <li>4. <strong>They click the link</strong> and create their account or sign in</li>
          <li>5. <strong>They're automatically added</strong> to your team with the correct role</li>
          <li>6. <strong>Monitor your seat usage</strong> - you have {seatLimits.staffLimit} Staff and {seatLimits.athleteLimit} Athlete seats</li>
        </ol>
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>🔒 Secure:</strong> Each invite is unique, single-use, and expires after 7 days. 
            Email restrictions can be added for extra security.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TeamManagement; 