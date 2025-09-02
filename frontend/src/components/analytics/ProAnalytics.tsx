import React, { useState, useEffect, useCallback } from 'react';
import { getEventsByPro } from '../../services/calendar';
import { getPaymentsByPro } from '../../services/payments';
import { getUsersByRole, getTeamMembers } from '../../services/firebase';
import { RefreshIndicator } from '../RefreshIndicator';
import type { Payment } from '../../types';

interface ProAnalyticsProps {
  proId: string;
}

interface RevenueData {
  month: string;
  revenue: number;
  sessions: number;
  packages: number;
}

interface TeamPerformance {
  staffCount: number;
  athleteCount: number;
  activePrograms: number;
  completionRate: number;
}

export const ProAnalytics: React.FC<ProAnalyticsProps> = ({ proId }) => {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance>({
    staffCount: 0,
    athleteCount: 0,
    activePrograms: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Data loading function for smart polling
  const loadProAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load payments data
      const paymentsResult = await getPaymentsByPro(proId);
      const staffResult = await getUsersByRole(proId, 'STAFF');
      const athletesResult = await getUsersByRole(proId, 'ATHLETE');
      const eventsResult = await getEventsByPro(proId);

      // Fallback: if role-specific queries fail, try to get all team members
      let allUsers: Array<{ role: string; uid?: string; displayName?: string }> = [];
      if (staffResult.success && athletesResult.success) {
        allUsers = [
          ...(staffResult.users || []),
          ...(athletesResult.users || [])
        ];
      } else {
        // Fallback to get all team members
        const teamMembersResult = await getTeamMembers(proId);
        if (teamMembersResult.success) {
          allUsers = teamMembersResult.members || [];
        }
      }

      if (paymentsResult.success && 'payments' in paymentsResult && allUsers.length > 0) {
        // Process revenue data
        const revenue = processRevenueData(paymentsResult.payments as Payment[] || []);
        setRevenueData(revenue);

        // Debug logging
        console.log('🔍 Team Composition Debug:', {
          proId,
          staffCount: allUsers.filter(u => u.role === 'STAFF').length,
          athleteCount: allUsers.filter(u => u.role === 'ATHLETE').length,
          totalUsers: allUsers.length,
          allUsers: allUsers.map(u => ({ id: u.uid, role: u.role, name: u.displayName }))
        });
        
        const performance = processTeamPerformance(
          allUsers,
          (eventsResult.success && 'events' in eventsResult) ? (eventsResult.events as Array<{ type: string; status?: string }>) || [] : []
        );
        setTeamPerformance(performance);
      }
    } catch (error) {
      console.error('Error loading PRO analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [proId]);

  // Initial load
  useEffect(() => {
    loadProAnalytics();
  }, [loadProAnalytics]);

  const processRevenueData = (payments: Payment[]): RevenueData[] => {
    const now = new Date();
    const months: RevenueData[] = [];
    
    // Generate last 12 months of data
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthPayments = payments.filter(payment => {
        const paymentDate = payment.createdAt.toDate();
        return paymentDate.getMonth() === date.getMonth() && 
               paymentDate.getFullYear() === date.getFullYear();
      });

      const revenue = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const sessions = monthPayments.filter(p => p.sessionType === 'training').length;
      const packages = monthPayments.filter(p => p.packageId).length;

      months.push({
        month: monthKey,
        revenue,
        sessions,
        packages
      });
    }

    return months;
  };

  const processTeamPerformance = (users: Array<{ role: string }>, events: Array<{ type: string; status?: string }>) => {
    const staffCount = users.filter(u => u.role === 'STAFF').length;
    const athleteCount = users.filter(u => u.role === 'ATHLETE').length;
    const activePrograms = events.filter(e => e.type === 'session').length;
    
    // Calculate completion rate (simplified)
    const totalSessions = events.filter(e => e.type === 'session').length;
    const completedSessions = events.filter(e => e.type === 'session' && e.status === 'completed').length;
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    return {
      staffCount,
      athleteCount,
      activePrograms,
      completionRate: Math.round(completionRate)
    };
  };

  const getRevenueGrowth = () => {
    if (revenueData.length < 2) return 0;
    const current = revenueData[revenueData.length - 1].revenue;
    const previous = revenueData[revenueData.length - 2].revenue;
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-ethnocentric">📊 PRO Analytics</h3>
          <RefreshIndicator onRefresh={loadProAnalytics} interval={300000} /> {/* 5 minutes */}
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-ethnocentric">📊 PRO Analytics</h3>
        <RefreshIndicator onRefresh={loadProAnalytics} interval={300000} />
      </div>

      {/* Revenue Overview */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-ethnocentric">
            💰 Revenue Analytics
          </h3>
          <div className="flex space-x-2">
            {(['month', 'quarter', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
            <div className="text-sm font-medium opacity-90">Total Revenue</div>
            <div className="text-2xl font-bold">
              ${(revenueData.reduce((sum, month) => sum + month.revenue, 0) / 100).toLocaleString()}
            </div>
            <div className="text-sm opacity-90">
              {getRevenueGrowth() > 0 ? '+' : ''}{getRevenueGrowth().toFixed(1)}% from last period
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
            <div className="text-sm font-medium opacity-90">This Month</div>
            <div className="text-2xl font-bold">
              ${(revenueData[revenueData.length - 1]?.revenue / 100 || 0).toLocaleString()}
            </div>
            <div className="text-sm opacity-90">
              {revenueData[revenueData.length - 1]?.sessions || 0} sessions
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
            <div className="text-sm font-medium opacity-90">Active Packages</div>
            <div className="text-2xl font-bold">{teamPerformance.activePrograms}</div>
            <div className="text-sm opacity-90">
              {revenueData[revenueData.length - 1]?.packages || 0} sold this month
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg text-white">
            <div className="text-sm font-medium opacity-90">Completion Rate</div>
            <div className="text-2xl font-bold">{teamPerformance.completionRate}%</div>
            <div className="text-sm opacity-90">
              Session completion rate
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Revenue Trend</h4>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Last 12 months
            </span>
          </div>
          
          {/* Simple Bar Chart */}
          <div className="flex items-end justify-between h-32 space-x-1">
            {revenueData.map((month) => {
              const maxRevenue = Math.max(...revenueData.map(m => m.revenue));
              const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={month.month} className="flex flex-col items-center flex-1">
                  <div className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                       style={{ height: `${height}%` }}>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {month.month}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300 text-center">
                    ${(month.revenue / 100).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Performance */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-ethnocentric mb-6">
          👥 Team Performance
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Composition */}
          <div className="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Team Composition</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Staff Members</span>
                <span className="font-semibold text-gray-900 dark:text-white">{teamPerformance.staffCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Athletes</span>
                <span className="font-semibold text-gray-900 dark:text-white">{teamPerformance.athleteCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Active Programs</span>
                <span className="font-semibold text-gray-900 dark:text-white">{teamPerformance.activePrograms}</span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Key Metrics</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Session Completion</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${teamPerformance.completionRate}%` }}
                    ></div>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{teamPerformance.completionRate}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Team Growth</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  +{Math.round((teamPerformance.athleteCount / Math.max(teamPerformance.staffCount, 1)) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 