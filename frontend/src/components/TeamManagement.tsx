import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
      
      console.log('🔍 Loading team data for PRO user:', user.uid);
      console.log('🔍 Current user data:', user);
      console.log('🔍 User proId:', user.proId);
      
      // Load team members
      const membersQuery = query(
        collection(db, 'users'),
        where('proId', '==', user.uid)
        // Removed orderBy to avoid composite index requirement
      );
      console.log('🔍 Executing query:', membersQuery);
      const membersSnapshot = await getDocs(membersQuery);
      
      console.log('🔍 Query result size:', membersSnapshot.size);
      console.log('🔍 Query result docs:', membersSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
      
      const members: TeamMember[] = [];
      membersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('🔍 Processing doc:', { id: doc.id, data });
        if (data.role !== 'PRO') { // Don't include PRO users in team list
          members.push({
            uid: doc.id,
            email: data.email || '',
            displayName: data.displayName || 'Unknown User',
            role: data.role,
            joinedAt: data.createdAt?.toDate() || new Date(),
            status: 'active'
          });
        }
      });
      
      // Sort by creation date (newest first) in memory
      members.sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
      
      console.log('✅ Team members loaded:', members);
      setTeamMembers(members);

      // Load seat limits from user document or use defaults
      if (user?.seats) {
        setSeatLimits({
          staffLimit: user.seats.staffLimit || 5,
          athleteLimit: user.seats.athleteLimit || 20
        });
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

  const handleCreateInvite = async () => {
    try {
      const invite = await createInvite(inviteRole, inviteEmail || undefined);
      if (invite) {
        // Copy the invite URL to clipboard
        await copyToClipboard(invite.inviteUrl);
        setInviteEmail('');
        alert(`✅ ${inviteRole} invite created and copied to clipboard!`);
        
        // Reload team data to show updated counts
        setTimeout(() => {
          loadTeamData();
        }, 1000);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Your Team</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your team members and invite new Staff and Athletes
          </p>
        </div>
        <button
          onClick={loadTeamData}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Loading...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </div>
          )}
        </button>
      </div>

      {/* Debug Information (temporary) */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3">🐛 Debug Information</h4>
        <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
          <p><strong>Current User ID:</strong> {user?.uid || 'None'}</p>
          <p><strong>User Role:</strong> {user?.role || 'None'}</p>
          <p><strong>User proId:</strong> {user?.proId || 'None'}</p>
          <p><strong>Team Members Found:</strong> {teamMembers.length}</p>
          <p><strong>Loading State:</strong> {loading ? 'Loading...' : 'Complete'}</p>
        </div>
        <button
          onClick={() => {
            console.log('🔍 Manual debug trigger');
            console.log('User:', user);
            console.log('Team Members:', teamMembers);
            loadTeamData();
          }}
          className="mt-3 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors duration-200"
        >
          Debug & Reload
        </button>
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