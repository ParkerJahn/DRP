/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";

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
  
  // Set expiry to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
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
      
      if (!userId) {
        logger.error('No userId in session metadata');
        response.status(400).send('Missing userId in metadata');
        return;
      }

      logger.info('Payment completed for user:', userId);
      
      // Update user to PRO status and set custom claims
      try {
        // Update Firestore user document
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
    
    // Generate invite URL
    const baseUrl = appBaseUrl.value();
    const inviteUrl = `${baseUrl}/join?token=${invite.token}`;

    logger.info('Invite created successfully:', { proId, role, inviteId: invite.inviteId });
    
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
    const { uid, token, userData } = request.body;
    
    if (!uid || !token || !userData) {
      response.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Verify the user is authenticated
    const authHeader = request.headers.authorization || '';
    const authenticatedUid = await verifyFirebaseToken(authHeader);
    
    if (authenticatedUid !== uid) {
      response.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // Hash the token to find the invite
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
      .then(hash => Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      );

    // Find and validate the invite
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
    
    if (!validation.valid) {
      response.status(400).json({ 
        valid: false, 
        error: validation.message 
      });
      return;
    }

    // Mark invite as claimed
    await inviteDoc.ref.update({ claimed: true, claimedBy: uid, claimedAt: new Date() });

    // Create or update user document with proper role and proId
    const userDoc = {
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

    await db.collection('users').doc(uid).set(userDoc, { merge: true });

    // Set custom claims for role-based access
    await getAuth().setCustomUserClaims(uid, {
      role: inviteData.role,
      proId: inviteData.proId
    });

    // Update team member count
    const teamRef = db.collection('teams').doc(inviteData.proId);
    await db.runTransaction(async (transaction) => {
      const teamDoc = await transaction.get(teamRef);
      if (teamDoc.exists) {
        const currentData = teamDoc.data();
        const memberType = inviteData.role === 'STAFF' ? 'staff' : 'athlete';
        const newCount = (currentData?.membersCount?.[memberType] || 0) + 1;
        
        transaction.update(teamRef, {
          [`membersCount.${memberType}`]: newCount,
          updatedAt: new Date()
        });
      } else {
        // Create team document if it doesn't exist
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

    logger.info('User successfully redeemed invite:', { uid, role: inviteData.role, proId: inviteData.proId });
    
    response.status(200).json({ 
      success: true, 
      message: 'Invite redeemed successfully',
      user: {
        role: inviteData.role,
        proId: inviteData.proId
      }
    });
    
  } catch (error) {
    logger.error('Error redeeming invite:', error);
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

