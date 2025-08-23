import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

const functions = getFunctions();
const auth = getAuth();

// Types for Stripe responses
export interface StripeCheckoutResponse {
  success: boolean;
  checkoutSession: {
    id: string;
    url: string;
    amount: number;
    currency: string;
  };
}

// Create training session payment checkout
export const createTrainingSessionCheckout = async (paymentData: {
  proId: string;
  amount: number;
  currency: string;
  sessionType: string;
  sessionDate?: Date;
  description?: string;
}): Promise<StripeCheckoutResponse> => {
  try {
    // Get current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Call Firebase function
    const createCheckout = httpsCallable(functions, 'createTrainingSessionCheckout');
    const result = await createCheckout({
      ...paymentData,
      sessionDate: paymentData.sessionDate?.toISOString()
    });

    return result.data as StripeCheckoutResponse;
  } catch (error) {
    console.error('Error creating training session checkout:', error);
    throw error;
  }
};

// Create training package checkout
export const createPackageCheckout = async (packageId: string): Promise<StripeCheckoutResponse> => {
  try {
    // Get current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Call Firebase function
    const createCheckout = httpsCallable(functions, 'createPackageCheckout');
    const result = await createCheckout({ packageId });

    return result.data as StripeCheckoutResponse;
  } catch (error) {
    console.error('Error creating package checkout:', error);
    throw error;
  }
};

// Create PRO upgrade checkout
export const createProUpgradeCheckout = async (): Promise<StripeCheckoutResponse> => {
  try {
    // Get current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Call Firebase function
    const createCheckout = httpsCallable(functions, 'createProUpgradeCheckout');
    const result = await createCheckout();

    return result.data as StripeCheckoutResponse;
  } catch (error) {
    console.error('Error creating PRO upgrade checkout:', error);
    throw error;
  }
};

// Redirect to Stripe checkout
export const redirectToCheckout = (checkoutUrl: string) => {
  if (checkoutUrl) {
    window.location.href = checkoutUrl;
  } else {
    throw new Error('No checkout URL provided');
  }
}; 