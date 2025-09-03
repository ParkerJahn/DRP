import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getUserPackages,
  getAvailablePackages, 
  getUserPackagePurchases,
  getPackageAnalytics,
  createTrainingPackage,
  updateTrainingPackage,
  deleteTrainingPackage
} from '../services/packages';
import { createPackageCheckout, redirectToCheckout } from '../services/stripe';
import type { TrainingPackage, PackagePurchase, PackageStatus, PackageType } from '../types';
import { getTeamMembers } from '../services/firebase';
import type { User } from '../types';
import { useAsyncCallback } from '../hooks/useAsyncCallback';

const Packages: React.FC = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Array<TrainingPackage & { id: string }>>([]);
  const [athletePackages, setAthletePackages] = useState<Array<PackagePurchase & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);
  const [isEditingPackage, setIsEditingPackage] = useState<string | null>(null);
  const [packageAnalytics, setPackageAnalytics] = useState({
    totalPackages: 0,
    activePackages: 0,
    totalRevenue: 0,
    totalPurchases: 0
  });

  // State for team members (for display purposes)
  const [teamMembers, setTeamMembers] = useState<Array<{ uid: string; displayName: string; role: string }>>([]);

  // Helper function to get member name from UID
  const getMemberName = (uid: string): string => {
    const member = teamMembers.find(m => m.uid === uid);
    return member ? member.displayName : uid;
  };

  useEffect(() => {
    if (user) {
      loadPackages();
      if (user.role === 'PRO') {
        loadPackageAnalytics();
        loadTeamMembers();
      } else if (user.role === 'ATHLETE') {
        loadAthletePackages();
      }
    }
  }, [user]);

  const loadPackages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let result;
      
      if (user.role === 'PRO') {
        result = await getUserPackages(user.proId || user.uid);
      } else {
        // Athletes see available packages from their PRO
        result = await getAvailablePackages(user.proId || '');
      }
      
      if (result.success && 'packages' in result) {
        setPackages(result.packages || []);
      } else {
        console.error('Failed to load packages:', result.error);
        setPackages([]);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPackageAnalytics = async () => {
    if (!user || user.role !== 'PRO') return;
    
    try {
      const result = await getPackageAnalytics(user.proId || user.uid);
      if (result.success) {
        setPackageAnalytics({
          totalPackages: result.totalPackages || 0,
          activePackages: result.activePackages || 0,
          totalRevenue: result.totalRevenue || 0,
          totalPurchases: result.totalPurchases || 0
        });
      }
    } catch (error) {
      console.error('Error loading package analytics:', error);
    }
  };

  const loadTeamMembers = async () => {
    if (!user?.proId && user?.role === 'PRO') {
      // If user is PRO but no proId, use their uid
      const proId = user.uid;
      await fetchTeamMembers(proId);
    } else if (user?.proId) {
      await fetchTeamMembers(user.proId);
    }
  };

  const fetchTeamMembers = async (proId: string) => {
    try {
      const result = await getTeamMembers(proId);
      if (result.success && result.members) {
        // Filter to only PRO and STAFF members, and format for dropdown
        const members = result.members
          .filter((member: User) => member.role === 'PRO' || member.role === 'STAFF')
          .map((member: User) => ({
            uid: member.uid,
            displayName: member.displayName || member.email || 'Unknown User',
            role: member.role
          }));
        setTeamMembers(members);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const loadAthletePackages = async () => {
    if (!user || user.role !== 'ATHLETE') return;
    
    try {
      const result = await getUserPackagePurchases(user.uid);
      if (result.success) {
        setAthletePackages(result.purchases || []);
      }
    } catch (error) {
      console.error('Error loading athlete packages:', error);
    }
  };

  const handleCreatePackage = async (packageData: Omit<TrainingPackage, 'id' | 'createdAt' | 'updatedAt' | 'currentPurchases'>) => {
    try {
      console.log('Creating package with data:', packageData);
      console.log('Current user:', user);
      console.log('User proId:', user?.proId);
      console.log('User uid:', user?.uid);
      
      // Fix: Use user's UID if proId is null
      if (!packageData.proId || packageData.proId === '') {
        packageData.proId = user?.uid || '';
        console.log('Fixed proId to use user uid:', packageData.proId);
      }
      
      const result = await createTrainingPackage(user?.uid || '', packageData);
      if (result.success) {
        setIsCreatingPackage(false);
        loadPackages();
        loadPackageAnalytics();
      } else {
        throw new Error(result.error || 'Failed to create package');
      }
    } catch (error) {
      console.error('Error creating package:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create package. Please try again.';
      alert(errorMessage);
    }
  };

  const handleUpdatePackage = async (packageId: string, updates: Partial<TrainingPackage>) => {
    try {
      const result = await updateTrainingPackage(user?.uid || '', packageId, updates);
      if (result.success) {
        setIsEditingPackage(null);
        loadPackages();
        loadPackageAnalytics();
      } else {
        throw new Error('Failed to update package');
      }
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Failed to update package. Please try again.');
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteTrainingPackage(user?.uid || '', packageId);
      if (result.success) {
        loadPackages();
        loadPackageAnalytics();
      } else {
        throw new Error('Failed to delete package');
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package. Please try again.');
    }
  };

  const handlePurchasePackage = async (packageId: string) => {
    try {
      const result = await createPackageCheckout(packageId);
      
      if (result?.checkoutSession?.url) {
        redirectToCheckout(result.checkoutSession.url);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error purchasing package:', error);
      alert('Failed to purchase package. Please try again.');
    }
  };

  const { execute: purchasePackage, isPending: purchasing } = useAsyncCallback(handlePurchasePackage);
  const { execute: deletePackage, isPending: deleting } = useAsyncCallback(handleDeletePackage);

  const canManagePackages = user?.role === 'PRO';
  const canViewAnalytics = user?.role === 'PRO';
  const canPurchasePackages = user?.role === 'ATHLETE';

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: PackageStatus) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-yellow-500';
      case 'archived': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Training Packages</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {user.role === 'PRO' ? 'Create and manage your training packages' : 'Browse and purchase training packages'}
            </p>
          </div>
          {canManagePackages && (
            <button
              onClick={() => setIsCreatingPackage(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Create Package
            </button>
          )}
        </div>

        {/* Analytics Cards (PRO only) */}
        {canViewAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <span className="text-2xl">📦</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Packages</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {packageAnalytics.totalPackages}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Active Packages</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {packageAnalytics.activePackages}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {formatAmount(packageAnalytics.totalRevenue, 'usd')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                  <span className="text-2xl">🛒</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Total Purchases</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {packageAnalytics.totalPurchases}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Athlete's Purchased Packages */}
        {canPurchasePackages && athletePackages.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Purchased Packages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {athletePackages.map((purchase) => (
                <div key={purchase.id} className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {purchase.packageId}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${purchase.status === 'active' ? 'bg-green-500' : 'bg-gray-500'} text-white`}>
                      {purchase.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>Sessions Remaining: {purchase.sessionsRemaining}</p>
                    <p>Sessions Used: {purchase.sessionsUsed}</p>
                    <p>Purchase Date: {purchase.purchaseDate.toDate().toLocaleDateString()}</p>
                    {purchase.expiryDate && (
                      <p>Expires: {purchase.expiryDate.toDate().toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Packages */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {user.role === 'PRO' ? 'Your Packages' : 'Available Packages'}
          </h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-2">No packages found</h3>
              <p>
                {user.role === 'PRO' 
                  ? "You haven't created any training packages yet."
                  : "No training packages are currently available."
                }
              </p>
              {canManagePackages && (
                <button
                  onClick={() => setIsCreatingPackage(true)}
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Create Your First Package
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {pkg.name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pkg.status)} text-white`}>
                      {pkg.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {pkg.description}
                  </p>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <p>Sessions: {pkg.sessions}</p>
                    {pkg.sessionDuration && <p>Duration: {pkg.sessionDuration} min</p>}
                    {pkg.validDays && <p>Valid for: {pkg.validDays} days</p>}
                    {pkg.assignedTo && <p>Assigned to: {getMemberName(pkg.assignedTo)}</p>}
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatAmount(pkg.price, pkg.currency)}
                    </p>
                  </div>
                  

                  
                  <div className="flex gap-2">
                    {canPurchasePackages && pkg.status === 'active' && (
                      <button
                        onClick={() => purchasePackage(pkg.id!)}
                        disabled={purchasing}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Purchase
                      </button>
                    )}
                    
                    {canManagePackages && (
                      <>
                        <button
                          onClick={() => setIsEditingPackage(pkg.id!)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePackage(pkg.id!)}
                          disabled={deleting}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Package Modal */}
      {(isCreatingPackage || isEditingPackage) && (
        <PackageModal 
          onClose={() => {
            setIsCreatingPackage(false);
            setIsEditingPackage(null);
          }}
          onSubmit={isEditingPackage ? 
            (data) => handleUpdatePackage(isEditingPackage, data) : 
            handleCreatePackage
          }
          package={isEditingPackage ? packages.find(p => p.id === isEditingPackage) : undefined}
          currentUser={user}
        />
      )}
    </div>
  );
};

// Package Modal Component
interface PackageModalProps {
  onClose: () => void;
  onSubmit: (packageData: Omit<TrainingPackage, 'id' | 'createdAt' | 'updatedAt' | 'currentPurchases'>) => void;
  package?: TrainingPackage & { id: string };
  currentUser: { uid: string; role: string; proId?: string };
}

const PackageModal: React.FC<PackageModalProps> = ({ onClose, onSubmit, package: editPackage, currentUser }) => {
  const [formData, setFormData] = useState({
    name: editPackage?.name || '',
    description: editPackage?.description || '',
    type: editPackage?.type || 'multi_session' as PackageType,
    status: editPackage?.status || 'active' as PackageStatus,
    price: editPackage?.price ? (editPackage.price / 100).toString() : '',
    currency: editPackage?.currency || 'usd',
    sessions: editPackage?.sessions?.toString() || '1',
    sessionDuration: editPackage?.sessionDuration?.toString() || '',
    validDays: editPackage?.validDays?.toString() || '',
    maxPurchases: editPackage?.maxPurchases?.toString() || '',
    assignedTo: editPackage?.assignedTo || '' // New field for assigning PRO/STAFF
  });

  // State for team members dropdown
  const [teamMembers, setTeamMembers] = useState<Array<{ uid: string; displayName: string; role: string }>>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Fetch team members when modal opens
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!currentUser?.proId && currentUser?.role === 'PRO') {
        // If user is PRO but no proId, use their uid
        const proId = currentUser.uid;
        await fetchTeamMembers(proId);
      } else if (currentUser?.proId) {
        await fetchTeamMembers(currentUser.proId);
      }
    };

    loadTeamMembers();
  }, [currentUser]);

  const fetchTeamMembers = async (proId: string) => {
    setIsLoadingMembers(true);
    try {
      const result = await getTeamMembers(proId);
      if (result.success && result.members) {
        // Filter to only PRO and STAFF members, and format for dropdown
        const members = result.members
          .filter((member: User) => member.role === 'PRO' || member.role === 'STAFF')
          .map((member: User) => ({
            uid: member.uid,
            displayName: member.displayName || member.email || 'Unknown User',
            role: member.role
          }));
        setTeamMembers(members);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.price || !formData.sessions) {
      alert('Please fill in all required fields');
      return;
    }

    // Prepare package data, converting empty strings to appropriate values
    const packageData = {
      proId: editPackage?.proId || '',
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type,
      status: formData.status,
      price: Math.round(parseFloat(formData.price) * 100), // Convert to cents
      currency: formData.currency,
      sessions: parseInt(formData.sessions),
      sessionDuration: formData.sessionDuration ? parseInt(formData.sessionDuration) : undefined,
      validDays: formData.validDays ? parseInt(formData.validDays) : undefined,
      maxPurchases: formData.maxPurchases ? parseInt(formData.maxPurchases) : undefined,
      assignedTo: formData.assignedTo.trim() || undefined
    };

    onSubmit(packageData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {editPackage ? 'Edit Package' : 'Create New Package'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Package Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
                placeholder="e.g., Beginner Strength Package"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Package Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as PackageType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
              >
                <option value="single_session">Single Session</option>
                <option value="multi_session">Multi Session</option>
                <option value="subscription">Subscription</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
              placeholder="Describe what's included in this package..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Number of Sessions *
              </label>
              <input
                type="number"
                min="1"
                value={formData.sessions}
                onChange={(e) => setFormData({ ...formData, sessions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
                placeholder="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Session Duration (min)
              </label>
              <input
                type="number"
                min="15"
                step="15"
                value={formData.sessionDuration}
                onChange={(e) => setFormData({ ...formData, sessionDuration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
                placeholder="60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valid for (days)
              </label>
              <input
                type="number"
                min="1"
                value={formData.validDays}
                onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
                placeholder="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Purchases
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxPurchases}
                onChange={(e) => setFormData({ ...formData, maxPurchases: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assign To (PRO/STAFF Member)
            </label>
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
              disabled={isLoadingMembers}
            >
              <option value="">Select a member</option>
              {isLoadingMembers ? (
                <option value="">Loading members...</option>
              ) : teamMembers.length === 0 ? (
                <option value="">No PRO or STAFF members found.</option>
              ) : (
                teamMembers.map(member => (
                  <option key={member.uid} value={member.uid}>
                    {member.displayName} ({member.role})
                  </option>
                ))
              )}
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Leave blank to assign to yourself, or select a PRO or STAFF member
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {editPackage ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Packages; 