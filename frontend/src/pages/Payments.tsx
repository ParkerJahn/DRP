import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFreeAccess } from '../hooks/useFreeAccess';
import { 
  getPaymentsByPro, 
  getPaymentsByPayer, 
  getPaymentSummary
} from '../services/payments';
import { createTrainingSessionCheckout, redirectToCheckout } from '../services/stripe';
import { BusinessIntelligence } from '../components/analytics/BusinessIntelligence';
import type { Payment, PaymentStatus } from '../types';

const Payments: React.FC = () => {
  const { user } = useAuth();
  const { hasFreeAccess } = useFreeAccess();
  const [payments, setPayments] = useState<Array<Payment & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState({
    totalRevenue: 0,
    totalPayments: 0,
    pendingPayments: 0,
    failedPayments: 0
  });

  useEffect(() => {
    if (user) {
      loadPayments();
      if (user.role === 'PRO') {
        loadPaymentSummary();
      }
    }
  }, [user]);

  const loadPayments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let result;
      
      if (user.role === 'PRO') {
        result = await getPaymentsByPro(user.proId || user.uid);
      } else {
        result = await getPaymentsByPayer(user.uid);
      }
      
      if (result.success) {
        setPayments(result.payments || []);
      } else {
        console.error('Failed to load payments:', result.error);
        setPayments([]);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentSummary = async () => {
    if (!user || user.role !== 'PRO') return;
    
    try {
      const result = await getPaymentSummary(user.proId || user.uid);
      if (result.success) {
        setPaymentSummary({
          totalRevenue: result.totalRevenue || 0,
          totalPayments: result.totalPayments || 0,
          pendingPayments: result.pendingPayments || 0,
          failedPayments: result.failedPayments || 0
        });
      }
    } catch (error) {
      console.error('Error loading payment summary:', error);
    }
  };

  const handleCreatePayment = async (paymentData: {
    proId: string;
    amount: number;
    currency: string;
    sessionType: string;
    sessionDate: Date;
    description?: string;
  }) => {
    try {
      setIsCreatingPayment(false);
      
      // Create checkout session
      const result = await createTrainingSessionCheckout(paymentData);
      
      if (result?.checkoutSession?.url) {
        // Redirect to Stripe checkout
        redirectToCheckout(result.checkoutSession.url);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to create payment. Please try again.');
    }
  };

  const canCreatePayment = user?.role === 'ATHLETE';
  const canViewAnalytics = user?.role === 'PRO';

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'succeeded': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'requires_action': return 'bg-orange-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'succeeded': return '✅';
      case 'processing': return '⏳';
      case 'requires_action': return '⚠️';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const filteredPayments = filter === 'all' 
    ? payments 
    : payments.filter(payment => payment.status === filter);

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payments</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {user.role === 'PRO' ? 'Track your revenue and payments' : 'Manage your training payments'}
            </p>
          </div>
          {canCreatePayment && (
            <button
              onClick={() => setIsCreatingPayment(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Make Payment
            </button>
          )}
        </div>

        {/* Free Access Indicator */}
        {hasFreeAccess && (
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                <span className="text-xl">🔓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Free Access Mode Active
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  You have indefinite free access to all features. No payments required.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Cards (PRO only) */}
        {canViewAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {formatAmount(paymentSummary.totalRevenue, 'usd')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Transactions</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {paymentSummary.totalPayments}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-lg">
                  <span className="text-2xl">⏳</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                    {formatAmount(paymentSummary.pendingPayments, 'usd')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
                  <span className="text-2xl">❌</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {formatAmount(paymentSummary.failedPayments, 'usd')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Business Intelligence (PRO only) */}
        {canViewAnalytics && (
          <div className="mb-8">
            <BusinessIntelligence proId={user.proId || user.uid} />
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex bg-gray-100 dark:bg-neutral-700 rounded-lg p-1 mb-6">
          {(['all', 'succeeded', 'processing', 'requires_action', 'failed'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === filterOption
                  ? 'bg-white dark:bg-neutral-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {filterOption === 'all' ? 'All Payments' : 
               filterOption === 'requires_action' ? 'Requires Action' :
               filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>

        {/* Payments Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-xl font-semibold mb-2">No payments found</h3>
            <p>
              {filter === 'all' 
                ? "You don't have any payment history yet."
                : `No ${filter} payments found.`
              }
            </p>
            {canCreatePayment && (
              <button
                onClick={() => setIsCreatingPayment(true)}
                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Make Your First Payment
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-neutral-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPayments.map((payment, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {payment.createdAt ? new Date(payment.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {payment.description || (user.role === 'PRO' ? 'Training Session Payment' : 'Training Session')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatAmount(payment.amount, payment.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)} text-white`}>
                        {getStatusIcon(payment.status)} {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {payment.stripePaymentIntentId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Payment Modal */}
      {isCreatingPayment && (
        <PaymentModal 
          onClose={() => setIsCreatingPayment(false)}
          onSubmit={handleCreatePayment}
          user={user}
        />
      )}
    </div>
  );
};

// Payment Modal Component
interface PaymentModalProps {
  onClose: () => void;
  onSubmit: (paymentData: {
    proId: string;
    amount: number;
    currency: string;
    sessionType: string;
    sessionDate: Date;
    description?: string;
  }) => void;
  user: { uid: string; role: string; proId?: string };
}

const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    proId: '',
    amount: '',
    currency: 'usd',
    sessionType: 'training',
    sessionDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.proId || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit({
      proId: formData.proId,
      amount: Math.round(parseFloat(formData.amount) * 100), // Convert to cents
      currency: formData.currency,
      sessionType: formData.sessionType,
      sessionDate: new Date(formData.sessionDate),
      description: formData.description || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-96 max-w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Make Payment
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              PRO ID *
            </label>
            <input
              type="text"
              value={formData.proId}
              onChange={(e) => setFormData({ ...formData, proId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
              placeholder="Enter PRO user ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Session Type
            </label>
            <select
              value={formData.sessionType}
              onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
            >
              <option value="training">Training Session</option>
              <option value="consultation">Consultation</option>
              <option value="assessment">Assessment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Session Date
            </label>
            <input
              type="date"
              value={formData.sessionDate}
              onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-700 dark:text-white"
              placeholder="Optional description"
              rows={2}
            />
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
              Proceed to Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Payments; 