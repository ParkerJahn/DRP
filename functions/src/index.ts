/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest, onCall} from "firebase-functions/v2/https";

import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import Stripe from 'stripe';
import {defineString} from "firebase-functions/params";


// Initialize Firebase Admin
initializeApp();

// Define environment parameters
const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");
const appBaseUrl = defineString("APP_BASE_URL");

// Initialize Firestore
const db = getFirestore();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Helper function to verify Firebase Auth token
async function verifyFirebaseToken(authHeader: string): Promise<string> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization token');
  }
  
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    logger.error('Failed to verify Firebase token:', error);
    throw new Error('Invalid authorization token');
  }
}

// Helper function to validate invite and check seat availability
async function validateInviteAndSeats(proId: string, role: string): Promise<{ valid: boolean; message?: string }> {
  try {
    // Get the PRO user's seat limits
    const proUserDoc = await db.collection('users').doc(proId).get();
    if (!proUserDoc.exists) {
      return { valid: false, message: 'PRO user not found' };
    }

    const proUserData = proUserDoc.data();
    if (proUserData?.proStatus !== 'active') {
      return { valid: false, message: 'PRO account is not active' };
    }

    // Get current team member counts
    const teamMembersQuery = await db.collection('users')
      .where('proId', '==', proId)
      .where('role', '==', role)
      .get();

    const currentCount = teamMembersQuery.size;
    const limit = role === 'STAFF' ? 5 : 20; // Default limits

    if (currentCount >= limit) {
      return { valid: false, message: `${role} seat limit reached` };
    }

    return { valid: true };
  } catch (error) {
    logger.error('Error validating invite:', error);
    return { valid: false, message: 'Error validating invite' };
  }
}

// Helper function to create secure invite tokens
async function createSecureInvite(proId: string, role: string, email?: string): Promise<{ inviteId: string; token: string; expiresAt: Date }> {
  // Generate a secure random token
  const token = crypto.randomUUID();
  
  // Hash the token for storage (we only store the hash)
  const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    .then(hash => Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    );
  
  // Set expiry to 1 hour from now for security and storage savings
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  
  // Create invite document
  const inviteRef = db.collection('invites').doc();
  await inviteRef.set({
    proId,
    role,
    email: email || null,
    tokenHash,
    expiresAt,
    createdAt: new Date(),
    createdBy: proId,
    claimed: false
  });
  
  return {
    inviteId: inviteRef.id,
    token: token, // Return plain token to client
    expiresAt
  };
}

// PRO Upgrade Function - Creates Stripe checkout session
export const createProUpgradeCheckout = onRequest({
  cors: true,
  maxInstances: 5, // Reduced for cost control
  memory: '256MiB', // Minimal memory for cost control
  timeoutSeconds: 30
}, async (request, response) => {
  // Handle CORS preflight
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  try {
    // Verify user is authenticated
    const userId = await verifyFirebaseToken(request.headers.authorization || '');
    
    // Check if user already has PRO status
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.proStatus === 'active') {
      response.status(400).json({ error: 'User already has PRO status' });
      return;
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2025-07-30.basil',
    });

    logger.info('Creating PRO upgrade checkout for user:', userId);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1Rx9BZKkXyY3p5G7ndKYsk6B', // REPLACE WITH YOUR ACTUAL PRICE ID FROM STRIPE DASHBOARD
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appBaseUrl.value()}/upgrade-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl.value()}/upgrade-cancelled`,
      metadata: {
        userId: userId,
        upgradeType: 'PRO'
      },
      // Don't set customer_email here - let Stripe handle it
    });

    logger.info('Stripe checkout session created successfully:', session.id);
    
    response.status(200).json({
      success: true,
      checkoutSession: {
        id: session.id,
        url: session.url,
        amount: session.amount_total || 2900,
        currency: session.currency || 'usd'
      }
    });

  } catch (error) {
    logger.error('Error creating Stripe checkout session:', error);
    if (error instanceof Error && error.message.includes('authorization')) {
      response.status(401).json({ error: error.message });
    } else {
      response.status(500).json({ error: 'Failed to create checkout session' });
    }
  }
});

// Training Session Payment Function - Creates Stripe checkout session
export const createTrainingSessionCheckout = onCall({
  maxInstances: 5,
  memory: '256MiB',
  timeoutSeconds: 30
}, async (request) => {
  try {
    // Verify user is authenticated
    const userId = request.auth?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Get request data
    const { proId, amount, currency, sessionType, sessionDate, description } = request.data;
    
    if (!proId || !amount || !currency || !sessionType) {
      throw new Error('Missing required fields');
    }

    // Verify the PRO exists and is active
    const proDoc = await db.collection('users').doc(proId).get();
    if (!proDoc.exists || proDoc.data()?.proStatus !== 'active') {
      throw new Error('PRO account not found or inactive');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2025-07-30.basil',
    });

    logger.info('Creating training session checkout for user:', userId, 'to PRO:', proId);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `${sessionType} Session`,
              description: description || `Training session with ${proDoc.data()?.displayName || 'PRO'}`,
            },
            unit_amount: amount, // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment
      success_url: `${appBaseUrl.value()}/app/payments?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${appBaseUrl.value()}/app/payments?status=cancelled`,
      metadata: {
        userId: userId,
        proId: proId,
        sessionType: sessionType,
        sessionDate: sessionDate || new Date().toISOString(),
        paymentType: 'training_session'
      },
    });

    logger.info('Training session checkout created successfully:', session.id);
    
    return {
      success: true,
      checkoutSession: {
        id: session.id,
        url: session.url,
        amount: session.amount_total || amount,
        currency: session.currency || currency
      }
    };

  } catch (error) {
    logger.error('Error creating training session checkout:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create checkout session');
  }
});

// Training Package Payment Function - Creates Stripe checkout session
export const createPackageCheckout = onCall({
  maxInstances: 5,
  memory: '256MiB',
  timeoutSeconds: 30
}, async (request) => {
  try {
    // Verify user is authenticated
    const userId = request.auth?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Get request data
    const { packageId } = request.data;
    
    if (!packageId) {
      throw new Error('Package ID is required');
    }

    // Get package details
    const packageDoc = await db.collection('trainingPackages').doc(packageId).get();
    if (!packageDoc.exists) {
      throw new Error('Package not found');
    }

    const packageData = packageDoc.data();
    if (packageData?.status !== 'active') {
      throw new Error('Package is not available for purchase');
    }

    // Check if package has reached max purchases
    if (packageData.maxPurchases && packageData.currentPurchases >= packageData.maxPurchases) {
      throw new Error('Package is sold out');
    }

    // Verify the PRO exists and is active
    const proDoc = await db.collection('users').doc(packageData.proId).get();
    if (!proDoc.exists || proDoc.data()?.proStatus !== 'active') {
      throw new Error('PRO account not found or inactive');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2025-07-30.basil',
    });

    logger.info('Creating package checkout for user:', userId, 'package:', packageId);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: packageData.currency.toLowerCase(),
            product_data: {
              name: packageData.name,
              description: packageData.description,
              images: packageData.imageUrl ? [packageData.imageUrl] : undefined,
            },
            unit_amount: packageData.price, // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment
      success_url: `${appBaseUrl.value()}/app/packages?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${appBaseUrl.value()}/app/packages?status=cancelled`,
      metadata: {
        userId: userId,
        packageId: packageId,
        proId: packageData.proId,
        paymentType: 'training_package'
      },
    });

    logger.info('Package checkout created successfully:', session.id);
    
    return {
      success: true,
      checkoutSession: {
        id: session.id,
        url: session.url,
        amount: session.amount_total || packageData.price,
        currency: session.currency || packageData.currency
      }
    };

  } catch (error) {
    logger.error('Error creating package checkout:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create checkout session');
  }
});

// Stripe Webhook Handler - Processes successful payments
export const stripeWebhook = onRequest({
  maxInstances: 5,
  memory: '256MiB',
  timeoutSeconds: 30
}, async (request, response) => {
  try {
    // Verify Stripe webhook signature for security
    const signature = request.headers['stripe-signature'] as string;
    if (!signature) {
      response.status(400).send('No signature provided');
      return;
    }

    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2025-07-30.basil',
    });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody || request.body,
        signature,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      response.status(400).send('Invalid signature');
      return;
    }

    logger.info('Stripe webhook received:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const paymentType = session.metadata?.paymentType;
      
      if (!userId) {
        logger.error('No userId in session metadata');
        response.status(400).send('Missing userId in metadata');
        return;
      }

      logger.info('Payment completed for user:', userId, 'type:', paymentType);
      
      if (paymentType === 'training_session') {
        // Handle training session payment
        const proId = session.metadata?.proId;
        const sessionType = session.metadata?.sessionType;
        const sessionDate = session.metadata?.sessionDate;
        
        if (!proId) {
          logger.error('No proId in training session metadata');
          response.status(400).send('Missing proId in metadata');
          return;
        }

        try {
          // Create payment record in Firestore
          await db.collection('payments').add({
            proId: proId,
            payerUid: userId,
            amount: session.amount_total || 0,
            currency: session.currency || 'usd',
            stripePaymentIntentId: session.payment_intent as string,
            status: 'succeeded',
            sessionType: sessionType,
            sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
            description: `${sessionType} Session Payment`,
            createdAt: new Date()
          });

          logger.info('Training session payment recorded successfully for user:', userId);
        } catch (dbError) {
          logger.error('Failed to record training session payment:', dbError);
          // Don't fail the webhook - we can retry later
        }
      } else if (paymentType === 'training_package') {
        // Handle training package payment
        const packageId = session.metadata?.packageId;
        const proId = session.metadata?.proId;
        
        if (!packageId || !proId) {
          logger.error('Missing packageId or proId in training package metadata');
          response.status(400).send('Missing package metadata');
          return;
        }

        try {
          // Get package details
          const packageDoc = await db.collection('trainingPackages').doc(packageId).get();
          if (!packageDoc.exists) {
            logger.error('Package not found:', packageId);
            return;
          }

          const packageData = packageDoc.data();
          if (!packageData) {
            logger.error('Package data is undefined');
            return;
          }
          
          // Create payment record in Firestore
          const paymentRef = await db.collection('payments').add({
            proId: proId,
            payerUid: userId,
            amount: session.amount_total || 0,
            currency: session.currency || 'usd',
            stripePaymentIntentId: session.payment_intent as string,
            status: 'succeeded',
            description: packageData.name,
            packageId: packageId,
            packageName: packageData.name,
            createdAt: new Date()
          });

          // Create package purchase record
          const expiryDate = packageData.validDays 
            ? new Date(Date.now() + packageData.validDays * 24 * 60 * 60 * 1000)
            : undefined;

          await db.collection('packagePurchases').add({
            packageId: packageId,
            proId: proId,
            athleteUid: userId,
            purchaseDate: new Date(),
            expiryDate: expiryDate,
            sessionsRemaining: packageData.sessions,
            status: 'active',
            paymentId: paymentRef.id,
            amountPaid: session.amount_total || 0,
            sessionsUsed: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          // Update package purchase count
          await db.collection('trainingPackages').doc(packageId).update({
            currentPurchases: (packageData.currentPurchases || 0) + 1
          });

          logger.info('Training package payment recorded successfully for user:', userId, 'package:', packageId);
        } catch (dbError) {
          logger.error('Failed to record training package payment:', dbError);
          // Don't fail the webhook - we can retry later
        }
      } else {
        // Handle PRO upgrade payment
        try {
          // Update user to PRO status and set custom claims
          await db.collection('users').doc(userId).update({
            proStatus: 'active',
            updatedAt: new Date()
          });

          // Set custom claims for role-based access
          await getAuth().setCustomUserClaims(userId, {
            role: 'PRO',
            proId: userId
          });

          // Create team document
          await db.collection('teams').doc(userId).set({
            proId: userId,
            name: 'My Team',
            membersCount: { staff: 0, athlete: 0 },
            createdAt: new Date(),
            updatedAt: new Date()
          });

          logger.info('User successfully upgraded to PRO:', userId);
        } catch (dbError) {
          logger.error('Failed to update user data:', dbError);
          // Don't fail the webhook - we can retry later
        }
      }
    }

    response.status(200).send('Webhook processed');
    
  } catch (error) {
    logger.error('Error processing Stripe webhook:', error);
    response.status(400).send('Webhook processing failed');
  }
});

// Firebase Auth trigger - Creates user document when new user signs up
export const onUserCreate = onRequest({
  maxInstances: 5,
  memory: '256MiB',
  timeoutSeconds: 30
}, async (request, response) => {
  try {
    // This function will be triggered by Firebase Auth
    const { uid, email, displayName } = request.body;
    
    if (!uid) {
      response.status(400).send('No user ID provided');
      return;
    }

    // Create user document in Firestore
    await db.collection('users').doc(uid).set({
      uid: uid,
      email: email || '',
      displayName: displayName || '',
      role: 'ATHLETE', // Default role
      proStatus: 'inactive', // Default status
      createdAt: new Date(),
      updatedAt: new Date()
    });

    logger.info('User document created for:', uid);
    response.status(200).send('User created successfully');
    
  } catch (error) {
    logger.error('Error creating user document:', error);
    response.status(500).send('Failed to create user');
  }
});

// Invite validation function - Validates invite tokens and checks seat availability
export const validateInvite = onRequest({
  cors: true,
  maxInstances: 5,
  memory: '256MiB',
  timeoutSeconds: 30
}, async (request, response) => {
  // Handle CORS preflight
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  try {
    const { token } = request.body;
    
    if (!token) {
      response.status(400).json({ error: 'Missing invite token' });
      return;
    }

    // Hash the token to compare with stored hash
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
      .then(hash => Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      );

    // Find invite by token hash
    const invitesQuery = await db.collection('invites')
      .where('tokenHash', '==', tokenHash)
      .limit(1)
      .get();

    if (invitesQuery.empty) {
      response.status(404).json({ error: 'Invalid invite token' });
      return;
    }

    const inviteDoc = invitesQuery.docs[0];
    const inviteData = inviteDoc.data();

    // Check if invite is already claimed
    if (inviteData.claimed) {
      response.status(400).json({ error: 'Invite has already been claimed' });
      return;
    }

    // Check if invite is expired
    if (inviteData.expiresAt.toDate() < new Date()) {
      response.status(400).json({ error: 'Invite has expired' });
      return;
    }

    // Validate seat availability
    const validation = await validateInviteAndSeats(inviteData.proId, inviteData.role);
    
    if (validation.valid) {
      response.status(200).json({ 
        valid: true,
        invite: {
          id: inviteDoc.id,
          proId: inviteData.proId,
          role: inviteData.role,
          email: inviteData.email,
          expiresAt: inviteData.expiresAt
        }
      });
    } else {
      response.status(400).json({ 
        valid: false, 
        error: validation.message 
      });
    }
    
  } catch (error) {
    logger.error('Error validating invite:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
});

// Create invite function - Allows PRO users to create secure invite links
export const createInvite = onRequest({
  cors: true,
  maxInstances: 5,
  memory: '256MiB',
  timeoutSeconds: 30
}, async (request, response) => {
  // Handle CORS preflight
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  try {
    // Verify user is authenticated and is PRO
    const authHeader = request.headers.authorization || '';
    const proId = await verifyFirebaseToken(authHeader);
    
    if (!proId) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify user is PRO and has active status
    const proUserDoc = await db.collection('users').doc(proId).get();
    if (!proUserDoc.exists) {
      response.status(404).json({ error: 'PRO user not found' });
      return;
    }

    const proUserData = proUserDoc.data();
    if (proUserData?.role !== 'PRO' || proUserData?.proStatus !== 'active') {
      response.status(403).json({ error: 'Only active PRO users can create invites' });
      return;
    }

    const { role, email } = request.body;
    
    if (!role || !['STAFF', 'ATHLETE'].includes(role)) {
      response.status(400).json({ error: 'Invalid role. Must be STAFF or ATHLETE' });
      return;
    }

    // Check seat availability before creating invite
    const validation = await validateInviteAndSeats(proId, role);
    if (!validation.valid) {
      response.status(400).json({ error: validation.message });
      return;
    }

    // Create secure invite
    const invite = await createSecureInvite(proId, role, email);
    
    // Generate invite URL - fix double slash issue
    const baseUrl = appBaseUrl.value();
    // Remove trailing slash if present to prevent double slashes
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const inviteUrl = `${cleanBaseUrl}/join?token=${invite.token}`;

    logger.info('Invite created successfully:', { proId, role, inviteId: invite.inviteId, baseUrl, cleanBaseUrl, inviteUrl });
    // Configuration updated: APP_BASE_URL now points to production
    
    response.status(200).json({
      success: true,
      invite: {
        id: invite.inviteId,
        role,
        email: email || null,
        expiresAt: invite.expiresAt,
        inviteUrl
      }
    });
    
  } catch (error) {
    logger.error('Error creating invite:', error);
    response.status(500).json({ error: 'Failed to create invite' });
  }
});

// Invite redemption function - Processes invite redemption and sets up user
export const redeemInvite = onRequest({
  cors: true,
  maxInstances: 5,
  memory: '256MiB',
  timeoutSeconds: 30
}, async (request, response) => {
  // Handle CORS preflight
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  try {
    logger.info('🔄 redeemInvite function called');
    
    const { uid, token, userData } = request.body;
    logger.info('📥 Request body:', { uid, token: token ? token.substring(0, 20) + '...' : 'missing', userData });
    
    if (!uid || !token || !userData) {
      logger.error('❌ Missing required fields:', { uid: !!uid, token: !!token, userData: !!userData });
      response.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Verify the user is authenticated
    const authHeader = request.headers.authorization || '';
    logger.info('🔐 Auth header present:', !!authHeader);
    
    const authenticatedUid = await verifyFirebaseToken(authHeader);
    logger.info('✅ Firebase token verified, authenticated UID:', authenticatedUid);
    
    if (authenticatedUid !== uid) {
      logger.error('❌ UID mismatch:', { authenticatedUid, requestedUid: uid });
      response.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // Hash the token to find the invite
    logger.info('🔍 Hashing token to find invite...');
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
      .then(hash => Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      );
    logger.info('🔍 Token hash generated:', tokenHash.substring(0, 20) + '...');

    // Find and validate the invite
    logger.info('🔍 Searching for invite with token hash...');
    const invitesQuery = await db.collection('invites')
      .where('tokenHash', '==', tokenHash)
      .limit(1)
      .get();

    logger.info('🔍 Invite query result size:', invitesQuery.size);

    if (invitesQuery.empty) {
      logger.error('❌ No invite found with token hash');
      response.status(404).json({ error: 'Invalid invite token' });
      return;
    }

    const inviteDoc = invitesQuery.docs[0];
    const inviteData = inviteDoc.data();
    logger.info('✅ Invite found:', { 
      inviteId: inviteDoc.id, 
      proId: inviteData.proId, 
      role: inviteData.role,
      claimed: inviteData.claimed,
      expiresAt: inviteData.expiresAt
    });

    // Check if invite is already claimed
    if (inviteData.claimed) {
      logger.error('❌ Invite already claimed by:', inviteData.claimedBy);
      response.status(400).json({ error: 'Invite has already been claimed' });
      return;
    }

    // Check if invite is expired
    if (inviteData.expiresAt.toDate() < new Date()) {
      logger.error('❌ Invite expired at:', inviteData.expiresAt.toDate());
      response.status(400).json({ error: 'Invite has expired' });
      return;
    }

    // Validate seat availability
    logger.info('🔍 Validating seat availability...');
    const validation = await validateInviteAndSeats(inviteData.proId, inviteData.role);
    
    if (!validation.valid) {
      logger.error('❌ Seat validation failed:', validation.message);
      response.status(400).json({ 
        valid: false, 
        error: validation.message 
      });
      return;
    }

    logger.info('✅ Seat validation passed');

    // Mark invite as claimed
    logger.info('🔍 Marking invite as claimed...');
    await inviteDoc.ref.update({ claimed: true, claimedBy: uid, claimedAt: new Date() });
    logger.info('✅ Invite marked as claimed');

    // Create or update user document with proper role and proId
    logger.info('🔍 Creating/updating user document...');
    const userDoc: any = {
      uid: uid,
      email: userData.email,
      displayName: userData.displayName,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      role: inviteData.role,
      proId: inviteData.proId,
      updatedAt: new Date()
    };

    // Check if user document already exists to determine if we need createdAt
    const existingUserDoc = await db.collection('users').doc(uid).get();
    if (!existingUserDoc.exists) {
      // New user - add createdAt
      userDoc.createdAt = new Date();
      logger.info('✅ Adding createdAt for new user');
    } else {
      logger.info('✅ Updating existing user document');
    }

    await db.collection('users').doc(uid).set(userDoc, { merge: true });
    logger.info('✅ User document saved successfully');

    // Set custom claims for role-based access
    logger.info('🔍 Setting custom claims...');
    await getAuth().setCustomUserClaims(uid, {
      role: inviteData.role,
      proId: inviteData.proId
    });
    logger.info('✅ Custom claims set successfully');

    // Update team member count
    logger.info('🔍 Updating team member count...');
    const teamRef = db.collection('teams').doc(inviteData.proId);
    await db.runTransaction(async (transaction) => {
      const teamDoc = await transaction.get(teamRef);
      if (teamDoc.exists) {
        const currentData = teamDoc.data();
        const memberType = inviteData.role === 'STAFF' ? 'staff' : 'athlete';
        const newCount = (currentData?.membersCount?.[memberType] || 0) + 1;
        
        logger.info('✅ Updating existing team:', { memberType, oldCount: currentData?.membersCount?.[memberType] || 0, newCount });
        
        transaction.update(teamRef, {
          [`membersCount.${memberType}`]: newCount,
          updatedAt: new Date()
        });
      } else {
        // Create team document if it doesn't exist
        logger.info('✅ Creating new team document');
        transaction.set(teamRef, {
          proId: inviteData.proId,
          name: 'My Team',
          membersCount: {
            staff: inviteData.role === 'STAFF' ? 1 : 0,
            athlete: inviteData.role === 'ATHLETE' ? 1 : 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });
    logger.info('✅ Team member count updated successfully');

    logger.info('🎉 User successfully redeemed invite:', { uid, role: inviteData.role, proId: inviteData.proId });
    
    response.status(200).json({ 
      success: true, 
      message: 'Invite redeemed successfully',
      user: {
        role: inviteData.role,
        proId: inviteData.proId
      }
    });
    
  } catch (error) {
    logger.error('❌ Error redeeming invite:', error);
    response.status(500).json({ error: 'Failed to redeem invite' });
  }
});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Custom Claims Functions - Using onRequest pattern to match existing code
export const setCustomClaims = onRequest({
  maxInstances: 5,
  memory: '256MiB',
  timeoutSeconds: 30
}, async (request, response) => {
  try {
    const { uid, role, proId } = request.body;
    
    if (!uid) {
      response.status(400).json({ error: 'No user ID provided' });
      return;
    }

    logger.info(`Setting custom claims for user: ${uid}`);
    
    // Set custom claims
    const customClaims = {
      role: role || 'ATHLETE',
      proId: proId || uid,
      email: request.body.email,
      emailVerified: request.body.emailVerified || false
    };
    
    await getAuth().setCustomUserClaims(uid, customClaims);
    
    logger.info(`Successfully set custom claims for ${uid}:`, customClaims);
    
    // Update the user document with the custom claims info
    await db.collection('users').doc(uid).update({
      customClaimsSet: true,
      customClaimsSetAt: new Date()
    });
    
    response.status(200).json({ success: true, customClaims });
    
  } catch (error) {
    logger.error('Error setting custom claims:', error);
    response.status(500).json({ error: 'Failed to set custom claims' });
  }
});

export const refreshCustomClaims = onRequest({
  cors: true,
  maxInstances: 5,
  memory: '256MiB',
  timeoutSeconds: 30
}, async (request, response) => {
  // Handle CORS preflight
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  try {
    // Verify user is authenticated
    const authHeader = request.headers.authorization || '';
    const userId = await verifyFirebaseToken(authHeader);
    
    logger.info(`Refreshing custom claims for user: ${userId}`);
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      response.status(404).json({ error: 'User document not found' });
      return;
    }
    
    const userData = userDoc.data();
    if (!userData) {
      response.status(404).json({ error: 'User data not found' });
      return;
    }
    
    const role = userData.role || 'ATHLETE';
    const proId = userData.proId || userId;
    
    // Set custom claims
    const customClaims = {
      role: role,
      proId: proId,
      email: userData.email,
      emailVerified: userData.emailVerified || false
    };
    
    await getAuth().setCustomUserClaims(userId, customClaims);
    
    logger.info(`Successfully refreshed custom claims for ${userId}:`, customClaims);
    
    // Update the user document
    await db.collection('users').doc(userId).update({
      customClaimsSet: true,
      customClaimsSetAt: new Date(),
      lastCustomClaimsRefresh: new Date()
    });
    
    response.status(200).json({ success: true, customClaims });
    
  } catch (error) {
    logger.error('Error refreshing custom claims:', error);
    if (error instanceof Error && error.message.includes('authorization')) {
      response.status(401).json({ error: error.message });
    } else {
      response.status(500).json({ error: 'Failed to refresh custom claims' });
    }
  }
});

// Scheduled function to clean up expired invites every hour
export const cleanupExpiredInvites = onRequest({
  cors: true,
  maxInstances: 1, // Only need one instance for cleanup
  memory: '256MiB',
  timeoutSeconds: 60
}, async (request, response) => {
  // Handle CORS preflight
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  try {
    logger.info('Starting cleanup of expired invites...');
    
    const now = new Date();
    
    // Find all expired invites
    const expiredInvitesQuery = await db.collection('invites')
      .where('expiresAt', '<', now)
      .get();
    
    if (expiredInvitesQuery.empty) {
      logger.info('No expired invites found');
      response.status(200).json({ message: 'No expired invites found', deletedCount: 0 });
      return;
    }
    
    // Delete expired invites in batches
    const batch = db.batch();
    let deletedCount = 0;
    
    expiredInvitesQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });
    
    await batch.commit();
    
    logger.info(`Successfully deleted ${deletedCount} expired invites`);
    response.status(200).json({ 
      message: `Successfully deleted ${deletedCount} expired invites`,
      deletedCount 
    });
    
  } catch (error) {
    logger.error('Error cleaning up expired invites:', error);
    response.status(500).json({ error: 'Failed to cleanup expired invites' });
  }
});

// Remove team member function
export const removeTeamMember = onCall({ maxInstances: 10 }, async (request) => {
  try {
    const { memberUid } = request.data;
    
    if (!request.auth) {
      throw new Error('Authentication required');
    }

    const requesterUid = request.auth.uid;
    
    // Get the requester's user data to verify they're a PRO user
    const requesterDoc = await db.collection('users').doc(requesterUid).get();
    if (!requesterDoc.exists) {
      throw new Error('Requester not found');
    }

    const requesterData = requesterDoc.data();
    if (requesterData?.role !== 'PRO') {
      throw new Error('Only PRO users can remove team members');
    }

    // Get the member to be removed
    const memberDoc = await db.collection('users').doc(memberUid).get();
    if (!memberDoc.exists) {
      throw new Error('Team member not found');
    }

    const memberData = memberDoc.data();
    
    // Verify the member belongs to the PRO's team
    if (memberData?.proId !== requesterUid) {
      throw new Error('Member does not belong to your team');
    }

    // Prevent PRO from removing themselves
    if (memberUid === requesterUid) {
      throw new Error('Cannot remove yourself from the team');
    }

    // Update the member's status to inactive and remove team association
    await db.collection('users').doc(memberUid).update({
      status: 'inactive',
      proId: null,
      removedAt: new Date(),
      removedBy: requesterUid,
      removedFromTeam: requesterUid
    });

    // Log the removal for audit purposes
    await db.collection('auditLogs').add({
      action: 'remove_team_member',
      requesterUid,
      memberUid,
      memberRole: memberData?.role,
      memberEmail: memberData?.email,
      timestamp: new Date(),
      proId: requesterUid
    });

    logger.info(`Team member ${memberUid} removed by PRO user ${requesterUid}`);

    return {
      success: true,
      message: `Successfully removed ${memberData?.displayName || 'team member'} from your team`
    };

  } catch (error) {
    logger.error('Error removing team member:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to remove team member');
  }
});

// Clean up orphaned Firebase Auth users
export const cleanupOrphanedUsers = onCall({ maxInstances: 10 }, async (request) => {
  try {
    const { email } = request.data;
    
    if (!request.auth) {
      throw new Error('Authentication required');
    }

    const requesterUid = request.auth.uid;
    
    // Get the requester's user data to verify they're a PRO user (admin)
    const requesterDoc = await db.collection('users').doc(requesterUid).get();
    if (!requesterDoc.exists) {
      throw new Error('Requester not found');
    }

    const requesterData = requesterDoc.data();
    if (requesterData?.role !== 'PRO') {
      throw new Error('Only PRO users can clean up orphaned accounts');
    }

    if (!email) {
      throw new Error('Email is required');
    }

    // Check if user exists in Firestore
    const usersRef = db.collection('users');
    const q = usersRef.where('email', '==', email);
    const querySnapshot = await q.get();
    
    if (!querySnapshot.empty) {
      throw new Error('User exists in Firestore - no cleanup needed');
    }

    // Try to find the user in Firebase Auth by email
    try {
      const userRecord = await getAuth().getUserByEmail(email);
      
      // User exists in Auth but not in Firestore - this is an orphaned account
      logger.info(`Found orphaned user in Auth: ${userRecord.uid} for email: ${email}`);
      
      // Delete the orphaned Firebase Auth user
      await getAuth().deleteUser(userRecord.uid);
      
      // Log the cleanup for audit purposes
      await db.collection('auditLogs').add({
        action: 'cleanup_orphaned_user',
        requesterUid,
        orphanedUserUid: userRecord.uid,
        orphanedUserEmail: email,
        timestamp: new Date(),
        proId: requesterUid
      });

      logger.info(`Successfully cleaned up orphaned user: ${userRecord.uid} for email: ${email}`);

      return {
        success: true,
        message: `Successfully cleaned up orphaned account for ${email}. You can now register with this email.`,
        orphanedUid: userRecord.uid
      };

    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        throw new Error('No user found with this email in Firebase Auth');
      } else {
        throw new Error(`Error accessing Firebase Auth: ${authError.message}`);
      }
    }

  } catch (error) {
    logger.error('Error cleaning up orphaned user:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to clean up orphaned user');
  }
});

