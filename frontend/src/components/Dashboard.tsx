import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

import ProUpgrade from './ProUpgrade';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  limit, 
  getDocs,
  orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const Dashboard: React.FC = () => {
  const { user, role, proStatus, proId, signOut, loading } = useAuth();
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState({
    teamMembers: 0,
    activePrograms: 0,
    recentPayments: 0,
    upcomingEvents: 0
  });

  // Fetch dashboard stats efficiently (single query per role)
  useEffect(() => {
    const fetchDashboardStats = async () => {
      // Only fetch stats if we have a role and either proId (for team users) or role is PRO
      if (!role) return;
      
      // For new users without proId, skip stats fetching
      if (!proId && role !== 'PRO') {
        console.log('⏭️ Skipping stats fetch - no proId and not PRO role');
        return;
      }
      
      setLoadingStats(true);
      try {
        // Fetch team stats for PRO users
        if (role === 'PRO') {
          const teamDoc = await getDoc(doc(db, 'teams', proId || user?.uid || ''));
          if (teamDoc.exists()) {
            const teamData = teamDoc.data();
            setStats(prev => ({
              ...prev,
              teamMembers: (teamData.membersCount?.staff || 0) + (teamData.membersCount?.athlete || 0)
            }));
          }
        }

        // Only fetch other stats if we have a proId
        if (proId) {
          // Fetch recent programs count
          const programsQuery = query(
            collection(db, 'programs'),
            where('proId', '==', proId),
            where('status', '==', 'current'),
            limit(5)
          );
          const programsSnapshot = await getDocs(programsQuery);
          setStats(prev => ({ ...prev, activePrograms: programsSnapshot.size }));

          // Fetch upcoming events count
          const now = new Date();
          const eventsQuery = query(
            collection(db, 'events'),
            where('proId', '==', proId),
            where('startsAt', '>', now),
            orderBy('startsAt'),
            limit(5)
          );
          const eventsSnapshot = await getDocs(eventsQuery);
          setStats(prev => ({ ...prev, upcomingEvents: eventsSnapshot.size }));

          // Fetch recent payments count (PRO only)
          if (role === 'PRO') {
            const paymentsQuery = query(
              collection(db, 'payments'),
              where('proId', '==', proId),
              orderBy('createdAt', 'desc'),
              limit(5)
            );
            const paymentsSnapshot = await getDocs(paymentsQuery);
            setStats(prev => ({ ...prev, recentPayments: paymentsSnapshot.size }));
          }
        }

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, [role, proId, user?.uid]);

  // Debug logging
  console.log('🔍 Dashboard Debug:', { user, role, proStatus, proId, loading });

  // Show loading while auth is being determined
  if (loading || !user || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // For new users without proId, show a welcome message
  if (!proId && role !== 'PRO') {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to DRP Workshop!</h1>
        <p className="text-lg text-gray-600 mb-6">
          You've successfully signed in. To get started, you'll need to be invited by a PRO coach.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto mb-6">
          <p className="text-sm text-blue-800">
            Ask your coach to send you an invite link to join their team.
          </p>
        </div>
        
        {/* Show PRO upgrade option for ATHLETE users */}
        {role === 'ATHLETE' && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">Or become a PRO coach yourself:</p>
            <ProUpgrade />
          </div>
        )}
        
        <button
          onClick={signOut}
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Main dashboard content
  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {user.displayName || user.email}!
        </h1>
        <p className="text-gray-600">
          Role: {role} {proStatus && `(${proStatus})`}
        </p>
      </div>

      {/* Role-specific content */}
      {role === 'PRO' && (
        <div className="space-y-6">
          {/* PRO Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
              <div className="text-2xl font-bold">{stats.teamMembers}</div>
              <div className="text-blue-100">Team Members</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
              <div className="text-2xl font-bold">{stats.activePrograms}</div>
              <div className="text-green-100">Active Programs</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
              <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
              <div className="text-purple-100">Upcoming Events</div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
              <div className="text-2xl font-bold">{stats.recentPayments}</div>
              <div className="text-orange-100">Recent Payments</div>
            </div>
          </div>

          {/* Pro Status Warning */}
          {proStatus !== 'active' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Account Activation Required
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Complete your subscription to access all PRO features.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {role === 'STAFF' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
              <div className="text-2xl font-bold">{stats.activePrograms}</div>
              <div className="text-blue-100">Active Programs</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
              <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
              <div className="text-green-100">Upcoming Events</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Staff Dashboard</h3>
            <p className="text-gray-600">Support your PRO and athletes with program management and scheduling.</p>
          </div>
        </div>
      )}

      {role === 'ATHLETE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
              <div className="text-2xl font-bold">{stats.activePrograms}</div>
              <div className="text-blue-100">Current Programs</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
              <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
              <div className="text-green-100">Upcoming Sessions</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Athlete Dashboard</h3>
            <p className="text-gray-600">Track your progress and view your training programs.</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loadingStats && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      )}

      {/* Sign Out Button */}
      <div className="bg-white p-6 rounded-lg shadow">
        <button
          onClick={signOut}
          className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}; 