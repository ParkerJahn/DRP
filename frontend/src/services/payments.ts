import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Payment, PaymentStatus } from '../types';

// Payment Management - Now using user subcollections
export const createPayment = async (userId: string, paymentData: Omit<Payment, 'createdAt'>) => {
  try {
    const userPaymentsRef = collection(db, 'users', userId, 'payments');
    const paymentRef = await addDoc(userPaymentsRef, {
      ...paymentData,
      createdAt: serverTimestamp(),
    });
    
    return { success: true, paymentId: paymentRef.id };
  } catch (error) {
    console.error('Error creating payment:', error);
    return { success: false, error };
  }
};

export const getPayment = async (userId: string, paymentId: string) => {
  try {
    const paymentRef = doc(db, 'users', userId, 'payments', paymentId);
    const paymentSnap = await getDoc(paymentRef);
    
    if (paymentSnap.exists()) {
      return { success: true, payment: { id: paymentSnap.id, ...paymentSnap.data() } };
    } else {
      return { success: false, error: 'Payment not found' };
    }
  } catch (error) {
    console.error('Error fetching payment:', error);
    return { success: false, error };
  }
};

export const updatePayment = async (userId: string, paymentId: string, updates: Partial<Payment>) => {
  try {
    const paymentRef = doc(db, 'users', userId, 'payments', paymentId);
    await updateDoc(paymentRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating payment:', error);
    return { success: false, error };
  }
};

// Get payments for a specific user
export const getUserPayments = async (userId: string) => {
  try {
    const userPaymentsRef = collection(db, 'users', userId, 'payments');
    const querySnapshot = await getDocs(userPaymentsRef);
    
    const payments: Array<Payment & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() } as Payment & { id: string });
    });
    
    // Sort client-side by creation date (newest first)
    payments.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, payments };
  } catch (error) {
    console.error('Error fetching user payments:', error);
    return { success: false, error };
  }
};

// Get payments by PRO - needs redesign for subcollections
export const getPaymentsByPro = async (proId: string) => {
  try {
    console.warn(`getPaymentsByPro for ${proId} needs to be redesigned for subcollection architecture`);
    return { success: false, error: 'Method needs redesign for subcollections' };
  } catch (error) {
    console.error('Error fetching payments by PRO:', error);
    return { success: false, error };
  }
};

// Get payments by payer (for a specific user)
export const getPaymentsByPayer = async (payerUserId: string) => {
  try {
    return await getUserPayments(payerUserId);
  } catch (error) {
    console.error('Error fetching payments by payer:', error);
    return { success: false, error };
  }
};

// Get payments by status for a user
export const getPaymentsByStatus = async (userId: string, status: PaymentStatus) => {
  try {
    const userPaymentsRef = collection(db, 'users', userId, 'payments');
    const q = query(
      userPaymentsRef,
      where('status', '==', status)
    );
    const querySnapshot = await getDocs(q);
    
    const payments: Array<Payment & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() } as Payment & { id: string });
    });
    
    // Sort client-side by creation date (newest first)
    payments.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, payments };
  } catch (error) {
    console.error('Error fetching payments by status:', error);
    return { success: false, error };
  }
};

// Get payment analytics for a user
export const getPaymentAnalytics = async (userId: string) => {
  try {
    const payments = await getUserPayments(userId);
    
    if (!payments.success || !payments.payments) {
      return payments;
    }
    
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentYear = new Date(now.getFullYear(), 0, 1);
    
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let lastMonthRevenue = 0;
    let yearlyRevenue = 0;
    let successfulPayments = 0;
    let failedPayments = 0;
    let pendingPayments = 0;
    
    payments.payments.forEach((payment) => {
      const paymentDate = payment.createdAt.toDate();
      
      if (payment.status === 'succeeded') {
        totalRevenue += payment.amount;
        successfulPayments++;
        
        if (paymentDate >= currentMonth) {
          monthlyRevenue += payment.amount;
        }
        
        if (paymentDate >= lastMonth && paymentDate < currentMonth) {
          lastMonthRevenue += payment.amount;
        }
        
        if (paymentDate >= currentYear) {
          yearlyRevenue += payment.amount;
        }
      } else if (payment.status === 'failed') {
        failedPayments++;
      } else if (payment.status === 'processing' || payment.status === 'requires_action') {
        pendingPayments++;
      }
    });
    
    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;
    
    return {
      success: true,
      analytics: {
        totalRevenue,
        monthlyRevenue,
        lastMonthRevenue,
        yearlyRevenue,
        monthlyGrowth,
        successfulPayments,
        failedPayments,
        pendingPayments,
        totalPayments: payments.payments.length,
        averagePayment: successfulPayments > 0 ? totalRevenue / successfulPayments : 0
      }
    };
  } catch (error) {
    console.error('Error getting payment analytics:', error);
    return { success: false, error };
  }
};

// Get payment history with pagination for a user
export const getPaymentHistory = async (userId: string, limit = 20, startDate?: Date, endDate?: Date) => {
  try {
    const userPaymentsRef = collection(db, 'users', userId, 'payments');
    let q = query(userPaymentsRef);
    
    // Add date filters if provided
    if (startDate) {
      q = query(q, where('createdAt', '>=', startDate));
    }
    if (endDate) {
      q = query(q, where('createdAt', '<=', endDate));
    }
    
    const querySnapshot = await getDocs(q);
    
    const payments: Array<Payment & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() } as Payment & { id: string });
    });
    
    // Sort and limit client-side
    payments.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    const limitedPayments = payments.slice(0, limit);
    
    return { 
      success: true, 
      payments: limitedPayments,
      hasMore: payments.length > limit,
      total: payments.length
    };
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return { success: false, error };
  }
};

// Get payments by date range for a user
export const getPaymentsByDateRange = async (userId: string, startDate: Date, endDate: Date) => {
  try {
    return await getPaymentHistory(userId, 1000, startDate, endDate);
  } catch (error) {
    console.error('Error fetching payments by date range:', error);
    return { success: false, error };
  }
};

// Get payment summary for dashboard for a user
export const getPaymentSummary = async (userId: string) => {
  try {
    const payments = await getUserPayments(userId);
    
    if (!payments.success || !payments.payments) {
      return payments;
    }
    
    let totalRevenue = 0;
    let totalPayments = 0;
    let pendingPayments = 0;
    let failedPayments = 0;
    
    payments.payments.forEach((payment) => {
      if (payment.status === 'succeeded') {
        totalRevenue += payment.amount;
        totalPayments += 1;
      } else if (payment.status === 'processing' || payment.status === 'requires_action') {
        pendingPayments += payment.amount;
      } else if (payment.status === 'failed') {
        failedPayments += payment.amount;
      }
    });
    
    return { 
      success: true, 
      totalRevenue,
      totalPayments,
      pendingPayments,
      failedPayments
    };
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    return { success: false, error };
  }
}; 