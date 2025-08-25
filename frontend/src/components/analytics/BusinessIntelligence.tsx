import React, { useState, useEffect, useCallback } from 'react';
import { getPaymentsByPro } from '../../services/payments';
import { getUsersByRole } from '../../services/firebase';
import { RefreshIndicator } from '../RefreshIndicator';
import type { Payment } from '../../types';

interface BusinessIntelligenceProps {
  proId: string;
}

interface RevenueTrend {
  month: string;
  revenue: number;
  growth: number;
  sessions: number;
  averageTicket: number;
}

interface GoalData {
  revenueGoal: number;
  currentRevenue: number;
  progress: number;
  daysRemaining: number;
  projectedRevenue: number;
}

interface KPIData {
  customerLifetimeValue: number;
  averageSessionPrice: number;
  conversionRate: number;
  retentionRate: number;
  monthlyRecurringRevenue: number;
}

interface PredictiveInsight {
  type: 'revenue' | 'growth' | 'milestone';
  message: string;
  confidence: number;
  timeframe: string;
  value: number;
}

export const BusinessIntelligence: React.FC<BusinessIntelligenceProps> = ({ proId }) => {
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrend[]>([]);
  const [goals, setGoals] = useState<GoalData>({
    revenueGoal: 10000, // Default $10k goal
    currentRevenue: 0,
    progress: 0,
    daysRemaining: 30,
    projectedRevenue: 0
  });
  const [kpis, setKpis] = useState<KPIData>({
    customerLifetimeValue: 0,
    averageSessionPrice: 0,
    conversionRate: 0,
    retentionRate: 0,
    monthlyRecurringRevenue: 0
  });
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '12m'>('6m');

  // Data loading function for smart polling
  const loadBusinessIntelligence = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load payments and users data
      const paymentsResult = await getPaymentsByPro(proId);
      const athletesResult = await getUsersByRole(proId, 'ATHLETE');

      if (paymentsResult.success && athletesResult.success) {
        const payments = paymentsResult.payments || [];
        const athletes = athletesResult.users || [];

        // Process revenue trends
        const trends = processRevenueTrends(payments, selectedPeriod);
        setRevenueTrends(trends);

        // Process goals and projections
        const goalData = processGoalData(payments, goals.revenueGoal);
        setGoals(goalData);

        // Process KPIs
        const kpiData = processKPIData(payments, athletes);
        setKpis(kpiData);

        // Generate predictive insights
        const predictiveInsights = generatePredictiveInsights(trends, goalData, kpiData);
        setInsights(predictiveInsights);
      }
    } catch (error) {
      console.error('Error loading business intelligence:', error);
    } finally {
      setLoading(false);
    }
  }, [proId, selectedPeriod, goals.revenueGoal]);

  // Initial load
  useEffect(() => {
    loadBusinessIntelligence();
  }, [loadBusinessIntelligence]);

  const processRevenueTrends = (payments: Payment[], period: string): RevenueTrend[] => {
    const months = getMonthsForPeriod(period);
    const trends: RevenueTrend[] = [];

    months.forEach((month, index) => {
      const monthPayments = payments.filter(payment => {
        const paymentDate = payment.createdAt?.toDate() || new Date(0);
        return paymentDate.getMonth() === month.getMonth() && 
               paymentDate.getFullYear() === month.getFullYear() &&
               payment.status === 'succeeded';
      });

      const revenue = monthPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const sessions = monthPayments.length;
      const averageTicket = sessions > 0 ? revenue / sessions : 0;

      const previousMonth = index > 0 ? trends[index - 1] : null;
      const growth = previousMonth ? ((revenue - previousMonth.revenue) / previousMonth.revenue) * 100 : 0;

      trends.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        growth,
        sessions,
        averageTicket
      });
    });

    return trends;
  };

  const processGoalData = (payments: Payment[], goal: number): GoalData => {
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const currentMonthPayments = payments.filter(payment => {
      const paymentDate = payment.createdAt?.toDate() || new Date(0);
      return paymentDate >= monthStart && paymentDate <= monthEnd && payment.status === 'succeeded';
    });

    const currentRevenue = currentMonthPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const progress = goal > 0 ? (currentRevenue / goal) * 100 : 0;
    const daysRemaining = monthEnd.getDate() - currentMonth.getDate();

    // Project revenue based on current daily average
    const daysElapsed = currentMonth.getDate();
    const dailyAverage = daysElapsed > 0 ? currentRevenue / daysElapsed : 0;
    const projectedRevenue = currentRevenue + (dailyAverage * daysRemaining);

    return {
      revenueGoal: goal,
      currentRevenue,
      progress: Math.min(progress, 100),
      daysRemaining,
      projectedRevenue
    };
  };

  const processKPIData = (payments: Payment[], athletes: any[]): KPIData => {
    const successfulPayments = payments.filter(p => p.status === 'succeeded');
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalSessions = successfulPayments.length;
    const uniqueCustomers = new Set(successfulPayments.map(p => p.payerUid)).size;

    const averageSessionPrice = totalSessions > 0 ? totalRevenue / totalSessions : 0;
    const customerLifetimeValue = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;
    const conversionRate = athletes.length > 0 ? (uniqueCustomers / athletes.length) * 100 : 0;

    // Calculate retention rate (simplified - customers with multiple payments)
    const customerPaymentCounts = successfulPayments.reduce((acc, payment) => {
      acc[payment.payerUid] = (acc[payment.payerUid] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const repeatCustomers = Object.values(customerPaymentCounts).filter(count => count > 1).length;
    const retentionRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    // Monthly recurring revenue (simplified)
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const monthlyPayments = successfulPayments.filter(payment => {
      const paymentDate = payment.createdAt?.toDate() || new Date(0);
      return paymentDate >= monthStart && paymentDate <= monthEnd;
    });
    const monthlyRecurringRevenue = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      customerLifetimeValue,
      averageSessionPrice,
      conversionRate,
      retentionRate,
      monthlyRecurringRevenue
    };
  };

  const generatePredictiveInsights = (
    trends: RevenueTrend[], 
    goalData: GoalData, 
    kpiData: KPIData
  ): PredictiveInsight[] => {
    const insights: PredictiveInsight[] = [];

    // Revenue projection insight
    if (trends.length >= 2) {
      const recentGrowth = trends[trends.length - 1].growth;
      const currentRevenue = trends[trends.length - 1].revenue;
      const projectedRevenue = currentRevenue * (1 + (recentGrowth / 100));
      
      insights.push({
        type: 'revenue',
        message: `Based on current trends, you're projected to earn $${(projectedRevenue / 100).toLocaleString()} next month`,
        confidence: Math.min(Math.abs(recentGrowth) * 2, 95),
        timeframe: 'Next month',
        value: projectedRevenue
      });
    }

    // Goal achievement insight
    if (goalData.projectedRevenue > goalData.revenueGoal) {
      insights.push({
        type: 'milestone',
        message: `You're on track to exceed your $${(goalData.revenueGoal / 100).toLocaleString()} goal by $${((goalData.projectedRevenue - goalData.revenueGoal) / 100).toLocaleString()}`,
        confidence: 85,
        timeframe: 'This month',
        value: goalData.projectedRevenue
      });
    } else if (goalData.progress < 50) {
      insights.push({
        type: 'growth',
        message: `To reach your goal, you need to increase daily revenue by ${((goalData.revenueGoal - goalData.projectedRevenue) / goalData.daysRemaining / 100).toFixed(2)}%`,
        confidence: 75,
        timeframe: 'Remaining days',
        value: goalData.revenueGoal - goalData.projectedRevenue
      });
    }

    // Customer insights
    if (kpiData.customerLifetimeValue > 0) {
      insights.push({
        type: 'growth',
        message: `Your average customer spends $${(kpiData.customerLifetimeValue / 100).toFixed(2)}. Focus on retention to boost revenue.`,
        confidence: 90,
        timeframe: 'Ongoing',
        value: kpiData.customerLifetimeValue
      });
    }

    return insights;
  };

  const getMonthsForPeriod = (period: string): Date[] => {
    const months: Date[] = [];
    const currentDate = new Date();
    
    let monthCount: number;
    switch (period) {
      case '3m': monthCount = 3; break;
      case '6m': monthCount = 6; break;
      case '12m': monthCount = 12; break;
      default: monthCount = 6;
    }

    for (let i = monthCount - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push(date);
    }

    return months;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-ethnocentric">🧠 Business Intelligence</h3>
          <RefreshIndicator onRefresh={loadBusinessIntelligence} interval={300000} />
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-600 rounded"></div>
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-ethnocentric">🧠 Business Intelligence</h3>
        <RefreshIndicator onRefresh={loadBusinessIntelligence} interval={300000} />
      </div>

      {/* Period Selector */}
      <div className="flex justify-end">
        <div className="flex bg-gray-100 dark:bg-neutral-700 rounded-lg p-1">
          {(['3m', '6m', '12m'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-white dark:bg-neutral-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Trends Chart */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📈 Revenue Trends ({selectedPeriod})</h4>
        <div className="space-y-4">
          {revenueTrends.map((trend, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white w-20">{trend.month}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(trend.revenue)}
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className={`font-medium ${trend.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.growth >= 0 ? '+' : ''}{trend.growth.toFixed(1)}%
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {trend.sessions} sessions
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  Avg: {formatCurrency(trend.averageTicket)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goals & Projections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🎯 Monthly Goal Progress</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Goal</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(goals.revenueGoal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Current</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(goals.currentRevenue)}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${goals.progress}%` }}
              ></div>
            </div>
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {goals.progress.toFixed(1)}% complete • {goals.daysRemaining} days remaining
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">Projected</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(goals.projectedRevenue)}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Dashboard */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📊 Key Performance Indicators</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Customer Lifetime Value</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(kpis.customerLifetimeValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average Session Price</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(kpis.averageSessionPrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</span>
              <span className="font-semibold text-gray-900 dark:text-white">{kpis.conversionRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Retention Rate</span>
              <span className="font-semibold text-gray-900 dark:text-white">{kpis.retentionRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Recurring Revenue</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(kpis.monthlyRecurringRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🔮 Predictive Insights</h4>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex-shrink-0">
                {insight.type === 'revenue' && <span className="text-2xl">💰</span>}
                {insight.type === 'growth' && <span className="text-2xl">📈</span>}
                {insight.type === 'milestone' && <span className="text-2xl">🎯</span>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{insight.message}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Confidence: {insight.confidence}%</span>
                  <span>Timeframe: {insight.timeframe}</span>
                </div>
              </div>
            </div>
          ))}
          {insights.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">🔮</div>
              <p>No insights available yet. Continue building your business to unlock predictive analytics!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 