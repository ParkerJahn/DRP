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

// Payment Management
export const createPayment = async (paymentData: Omit<Payment, 'createdAt'>) => {
  try {
    const paymentRef = await addDoc(collection(db, 'payments'), {
      ...paymentData,
      createdAt: serverTimestamp(),
    });
    
    return { success: true, paymentId: paymentRef.id };
  } catch (error) {
    console.error('Error creating payment:', error);
    return { success: false, error };
  }
};

export const getPayment = async (paymentId: string) => {
  try {
    const paymentRef = doc(db, 'payments', paymentId);
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

export const updatePayment = async (paymentId: string, updates: Partial<Payment>) => {
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating payment:', error);
    return { success: false, error };
  }
};

// Get payments by PRO
export const getPaymentsByPro = async (proId: string) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef, 
      where('proId', '==', proId)
      // Removed orderBy to avoid composite index requirement
    );
    const querySnapshot = await getDocs(q);
    
    const payments: Array<Payment & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() } as Payment & { id: string });
    });
    
    // Sort client-side instead
    payments.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, payments };
  } catch (error) {
    console.error('Error fetching payments by PRO:', error);
    return { success: false, error };
  }
};

// Get payments by payer
export const getPaymentsByPayer = async (payerUid: string) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef, 
      where('payerUid', '==', payerUid)
      // Removed orderBy to avoid composite index requirement
    );
    const querySnapshot = await getDocs(q);
    
    const payments: Array<Payment & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() } as Payment & { id: string });
    });
    
    // Sort client-side instead
    payments.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, payments };
  } catch (error) {
    console.error('Error fetching payments by payer:', error);
    return { success: false, error };
  }
};

// Get payments by status
export const getPaymentsByStatus = async (proId: string, status: PaymentStatus) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef, 
      where('proId', '==', proId),
      where('status', '==', status)
      // Removed orderBy to avoid composite index requirement
    );
    const querySnapshot = await getDocs(q);
    
    const payments: Array<Payment & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() } as Payment & { id: string });
    });
    
    // Sort client-side instead
    payments.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, payments };
  } catch (error) {
    console.error('Error fetching payments by status:', error);
    return { success: false, error };
  }
};

// Get payment analytics for PRO
export const getPaymentAnalytics = async (proId: string) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef, 
      where('proId', '==', proId),
      where('status', '==', 'succeeded')
    );
    const querySnapshot = await getDocs(q);
    
    let totalRevenue = 0;
    let totalPayments = 0;
    const monthlyRevenue: { [key: string]: number } = {};
    
    querySnapshot.forEach((doc) => {
      const payment = doc.data() as Payment;
      totalRevenue += payment.amount;
      totalPayments += 1;
      
      // Group by month
      const date = payment.createdAt.toDate ? payment.createdAt.toDate() : new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + payment.amount;
    });
    
    return { 
      success: true, 
      totalRevenue,
      totalPayments,
      monthlyRevenue,
      averagePayment: totalPayments > 0 ? totalRevenue / totalPayments : 0
    };
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    return { success: false, error };
  }
};

// Update payment status
export const updatePaymentStatus = async (paymentId: string, status: PaymentStatus) => {
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, { status });
    return { success: true };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error };
  }
};

// Get recent payments
export const getRecentPayments = async (proId: string, limit = 10) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef, 
      where('proId', '==', proId)
      // Removed orderBy to avoid composite index requirement
    );
    const querySnapshot = await getDocs(q);
    
    const payments: Array<Payment & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() } as Payment & { id: string });
    });
    
    // Sort client-side and limit
    payments.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, payments: payments.slice(0, limit) };
  } catch (error) {
    console.error('Error fetching recent payments:', error);
    return { success: false, error };
  }
};

// ===== NEW PAYMENT FUNCTIONS =====

// Create training session payment
export const createTrainingSessionPayment = async (paymentData: {
  proId: string;
  payerUid: string;
  amount: number;
  currency: string;
  sessionType: string;
  sessionDate: Date;
  description?: string;
}) => {
  try {
    const paymentRef = await addDoc(collection(db, 'payments'), {
      ...paymentData,
      stripePaymentIntentId: '', // Will be set after Stripe payment
      status: 'processing' as PaymentStatus,
      createdAt: serverTimestamp(),
    });
    
    return { success: true, paymentId: paymentRef.id };
  } catch (error) {
    console.error('Error creating training session payment:', error);
    return { success: false, error };
  }
};

// Create subscription payment
export const createSubscriptionPayment = async (paymentData: {
  proId: string;
  payerUid: string;
  amount: number;
  currency: string;
  subscriptionType: string;
  interval: 'monthly' | 'quarterly' | 'yearly';
  description?: string;
}) => {
  try {
    const paymentRef = await addDoc(collection(db, 'payments'), {
      ...paymentData,
      stripePaymentIntentId: '', // Will be set after Stripe payment
      status: 'processing' as PaymentStatus,
      createdAt: serverTimestamp(),
    });
    
    return { success: true, paymentId: paymentRef.id };
  } catch (error) {
    console.error('Error creating subscription payment:', error);
    return { success: false, error };
  }
};

// Get payments by date range
export const getPaymentsByDateRange = async (proId: string, startDate: Date, endDate: Date) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef, 
      where('proId', '==', proId),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate)
    );
    const querySnapshot = await getDocs(q);
    
    const payments: Array<Payment & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() } as Payment & { id: string });
    });
    
    // Sort client-side
    payments.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    return { success: true, payments };
  } catch (error) {
    console.error('Error fetching payments by date range:', error);
    return { success: false, error };
  }
};

// Get payment summary for dashboard
export const getPaymentSummary = async (proId: string) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef, 
      where('proId', '==', proId)
    );
    const querySnapshot = await getDocs(q);
    
    let totalRevenue = 0;
    let totalPayments = 0;
    let pendingPayments = 0;
    let failedPayments = 0;
    
    querySnapshot.forEach((doc) => {
      const payment = doc.data() as Payment;
      
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