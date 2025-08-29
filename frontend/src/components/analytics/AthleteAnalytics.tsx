import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { getUserPackagePurchases } from '../../services/packages';
import { getEventsByAttendee } from '../../services/calendar';
import { getProgramsByAthlete } from '../../services/programs';
import type { Event, PackagePurchase, Program } from '../../types';
import { RefreshIndicator } from '../RefreshIndicator';

interface AthleteAnalyticsProps {
  userId: string;
}

interface WorkoutData {
  total: number;
  categories: Record<string, number>; // Dynamic categories from actual workout data
  weeklyProgress: Array<{
    week: string;
    workouts: number;
    duration: number;
  }>;
}

interface PackageData {
  active: number;
  total: number;
  sessionsRemaining: number;
  nextExpiry: Date | null;
}

export const AthleteAnalytics: React.FC<AthleteAnalyticsProps> = ({ userId }) => {
  const [workoutData, setWorkoutData] = useState<WorkoutData>({
    total: 0,
    categories: {},
    weeklyProgress: []
  });
  const [packageData, setPackageData] = useState<PackageData>({
    active: 0,
    total: 0,
    sessionsRemaining: 0,
    nextExpiry: null
  });
  const [loading, setLoading] = useState(true);

  // Data loading function for smart polling
  const loadAthleteAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load packages, events, and programs data
      const packagesResult = await getUserPackagePurchases(userId);
      const eventsResult = await getEventsByAttendee(userId);
      const programsResult = await getProgramsByAthlete(userId);

      if (packagesResult.success && eventsResult.success) {
        const packages = packagesResult.purchases || [];
        const events = eventsResult.events || [];
        const programs = programsResult.success ? programsResult.programs || [] : [];
        
        // Process workout data using actual programs data
        const workouts = processWorkoutData(events, programs);
        setWorkoutData(workouts);

        // Process package data
        const packagesInfo = processPackageData(packages);
        setPackageData(packagesInfo);
      }
    } catch (error) {
      console.error('Error loading athlete analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    loadAthleteAnalytics();
  }, [loadAthleteAnalytics]);

  const processWorkoutData = (events: Array<Event & { id: string }>, programs: Program[]): WorkoutData => {
    const workouts = events.filter(event => event.type === 'session');
    const now = new Date();
    
    // Extract real workout categories from SWEATsheet programs
    const categories: Record<string, number> = {};
    
    // Process each program to extract muscle groups and exercise categories
    programs.forEach(program => {
      if (program.phases) {
        program.phases.forEach(phase => {
          if (phase.blocks) {
            phase.blocks.forEach(block => {
              // Count exercises by muscle group
              if (block.muscleGroup) {
                const muscleGroup = block.muscleGroup;
                categories[muscleGroup] = (categories[muscleGroup] || 0) + block.exercises.length;
              }
              
              // Also count by exercise category if available
              if (block.exercises) {
                block.exercises.forEach(exercise => {
                  if (exercise.category) {
                    const category = exercise.category;
                    categories[category] = (categories[category] || 0) + 1;
                  }
                });
              }
            });
          }
        });
      }
    });
    
    // If no real categories found, fall back to mock data for demo purposes
    if (Object.keys(categories).length === 0) {
      categories['Strength Training'] = Math.floor(workouts.length * 0.4);
      categories['Cardio'] = Math.floor(workouts.length * 0.3);
      categories['Flexibility'] = Math.floor(workouts.length * 0.15);
      categories['Sports'] = Math.floor(workouts.length * 0.1);
      categories['Recovery'] = Math.floor(workouts.length * 0.05);
    }

    // Generate weekly progress for last 8 weeks
    const weeklyProgress = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() + i * 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const weekWorkouts = workouts.filter(workout => {
        const workoutDate = workout.startsAt.toDate();
        return workoutDate >= weekStart && workoutDate < weekEnd;
      });

      weeklyProgress.push({
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        workouts: weekWorkouts.length,
        duration: weekWorkouts.length * 60 // Assume 60 min per workout
      });
    }

    return {
      total: workouts.length,
      categories,
      weeklyProgress
    };
  };

  const processPackageData = (packages: PackagePurchase[]): PackageData => {
    const activePackages = packages.filter(pkg => pkg.status === 'active');
    const totalSessions = activePackages.reduce((sum, pkg) => sum + (pkg.sessionsRemaining + pkg.sessionsUsed), 0);
    const usedSessions = activePackages.reduce((sum, pkg) => sum + pkg.sessionsUsed, 0);
    
    // Find next expiry date
    const expiryDates = activePackages
      .map(pkg => pkg.expiryDate?.toDate())
      .filter(date => date && date > new Date())
      .sort((a, b) => a!.getTime() - b!.getTime());

    return {
      active: activePackages.length,
      total: packages.length,
      sessionsRemaining: totalSessions - usedSessions,
      nextExpiry: expiryDates[0] || null
    };
  };

  const getPieChartColors = (category: string) => {
    // Define a comprehensive color palette for workout categories
    const colorPalette = [
      '#ef4444', // Red - Strength
      '#3b82f6', // Blue - Cardio
      '#10b981', // Green - Flexibility
      '#8b5cf6', // Purple - Sports
      '#f97316', // Orange - Recovery
      '#06b6d4', // Cyan - Mobility
      '#84cc16', // Lime - Agility
      '#f59e0b', // Amber - Power
      '#ec4899', // Pink - Endurance
      '#6366f1', // Indigo - Balance
      '#14b8a6', // Teal - Core
      '#f43f5e', // Rose - Speed
      '#a855f7', // Violet - Coordination
      '#22c55e', // Emerald - Stability
      '#eab308'  // Yellow - Warm-up
    ];
    
    // Generate a consistent color for each category
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colorPalette.length;
    return colorPalette[index];
  };

  const preparePieChartData = () => {
    return Object.entries(workoutData.categories).map(([category, count]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: count,
      color: getPieChartColors(category)
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-ethnocentric">📊 Athlete Analytics</h3>
          <RefreshIndicator onRefresh={loadAthleteAnalytics} interval={300000} /> {/* 5 minutes */}
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-ethnocentric">📊 Athlete Analytics</h3>
        <RefreshIndicator onRefresh={loadAthleteAnalytics} interval={300000} />
      </div>

      {/* Package Overview */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-ethnocentric mb-6">
          📦 Package & Sessions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
            <div className="text-sm font-medium opacity-90">Active Packages</div>
            <div className="text-2xl font-bold">{packageData.active}</div>
            <div className="text-sm opacity-90">
              {packageData.total} total packages
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
            <div className="text-sm font-medium opacity-90">Sessions Remaining</div>
            <div className="text-2xl font-bold">{packageData.sessionsRemaining}</div>
            <div className="text-sm opacity-90">
              Available sessions
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
            <div className="text-sm font-medium opacity-90">Next Expiry</div>
            <div className="text-2xl font-bold">
              {packageData.nextExpiry 
                ? packageData.nextExpiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'N/A'
              }
            </div>
            <div className="text-sm opacity-90">
              Package expiration
            </div>
          </div>
        </div>

        {/* Package Status */}
        <div className="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Package Status</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Sessions</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {packageData.sessionsRemaining + (packageData.total - packageData.active) * 10}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Used Sessions</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {packageData.total - packageData.active > 0 ? (packageData.total - packageData.active) * 10 : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Remaining Sessions</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {packageData.sessionsRemaining}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Workout Analytics */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-ethnocentric mb-6">
          💪 Workout Analytics
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Workout Categories</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={preparePieChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {preparePieChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value, name]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Weekly Progress</h4>
            <div className="space-y-3">
              {workoutData.weeklyProgress.slice(-4).map((week, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{week.week}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {week.workouts} workouts
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {week.duration} min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Workout Summary */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-blue-900 dark:text-blue-100">Total Workouts</h5>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You've completed {workoutData.total} workouts across all categories
              </p>
            </div>
            <div className="text-3xl text-blue-600 dark:text-blue-400">🏋️</div>
          </div>
        </div>
      </div>
    </div>
  );
}; 