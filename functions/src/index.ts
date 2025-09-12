import { setGlobalOptions, logger } from "firebase-functions";
import { onRequest, onCall } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import Stripe from "stripe";
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
setGlobalOptions({maxInstances: 10});

/**
 * Verify Firebase Auth token from authorization header
 * @param {string} authHeader - Authorization header value
 * @return {Promise<string>} User ID from verified token
 */
async function verifyFirebaseToken(authHeader: string): Promise<string> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No valid authorization token");
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    logger.error("Failed to verify Firebase token:", error);
    throw new Error("Invalid authorization token");
  }
}

/**
 * Ensure PRO users always have proId set to their uid
 * @param {string} userId - User ID to fix consistency for
 * @return {Promise<void>}
 */
async function ensureProUserConsistency(userId: string): Promise<void> {
  try {
    // Update user document to ensure proId is set to their uid
    await db.collection("users").doc(userId).update({
      proId: userId,
      updatedAt: new Date(),
    });

    // Update custom claims to ensure consistency
    await getAuth().setCustomUserClaims(userId, {
      role: "PRO",
      proId: userId,
    });

    logger.info("✅ Ensured PRO user consistency for:", userId);
  } catch (error) {
    logger.error("❌ Error ensuring PRO user consistency for:", userId, error);
    throw error;
  }
}

/**
 * Validate invite and check seat availability
 * @param {string} proId PRO user ID
 * @param {string} role Role to validate
 * @return {Promise<object>} Validation result
 */
async function validateInviteAndSeats(
  proId: string,
  role: string
): Promise<{valid: boolean; message?: string}> {
  try {
    // Get the PRO user's seat limits
    const proUserDoc = await db.collection("users").doc(proId).get();
    if (!proUserDoc.exists) {
      return {valid: false, message: "PRO user not found"};
    }

    const proUserData = proUserDoc.data();
    if (proUserData?.proStatus !== "active") {
      return {valid: false, message: "PRO account is not active"};
    }

    // Get current team member counts
    const teamMembersQuery = await db.collection("users")
      .where("proId", "==", proId)
      .where("role", "==", role)
      .get();

    const currentCount = teamMembersQuery.size;
    const limit = role === "STAFF" ? 5 : 20; // Default limits

    if (currentCount >= limit) {
      return {valid: false, message: `${role} seat limit reached`};
    }

    return {valid: true};
  } catch (error) {
    logger.error("Error validating invite:", error);
    return {valid: false, message: "Error validating invite"};
  }
}

/**
 * Create secure invite tokens
 * @param {string} proId PRO user ID
 * @param {string} role Role for invite
 * @param {string} email Optional email
 * @return {Promise<object>} Invite object
 */
async function createSecureInvite(
  proId: string,
  role: string,
  email?: string
): Promise<{inviteId: string; token: string; expiresAt: Date}> {
  // Generate a secure random token
  const token = crypto.randomUUID();

  // Hash the token for storage (we only store the hash)
  const tokenHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  )
    .then((hash) => Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    );

  // Set expiry to 1 hour from now for security and storage savings
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  // Create invite document
  const inviteRef = db.collection("invites").doc();
  await inviteRef.set({
    proId,
    role,
    email: email || null,
    tokenHash,
    expiresAt,
    createdAt: new Date(),
    createdBy: proId,
    claimed: false,
  });

  return {
    inviteId: inviteRef.id,
    token: token, // Return plain token to client
    expiresAt,
  };
}

// PRO Upgrade Function - Creates Stripe checkout session
export const createProUpgradeCheckout = onRequest({
  cors: true,
  maxInstances: 5, // Reduced for cost control
  memory: "256MiB", // Minimal memory for cost control
  timeoutSeconds: 30,
}, async (request, response) => {
  // Handle CORS preflight
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET, POST");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  try {
    // Verify user is authenticated
    const userId = await verifyFirebaseToken(
      request.headers.authorization || ""
    );

    // Check if user already has PRO status
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists && userDoc.data()?.proStatus === "active") {
      response.status(400).json({error: "User already has PRO status"});
      return;
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: "2025-07-30.basil",
    });

    logger.info("Creating PRO upgrade checkout for user:", userId);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          // REPLACE WITH YOUR ACTUAL PRICE ID FROM STRIPE DASHBOARD
          price: "price_1Rx9BZKkXyY3p5G7ndKYsk6B",
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appBaseUrl.value()}/upgrade-success` +
        "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: `${appBaseUrl.value()}/upgrade-cancelled`,
      metadata: {
        userId: userId,
        upgradeType: "PRO",
      },
      // Don't set customer_email here - let Stripe handle it
    });

    logger.info("Stripe checkout session created successfully:", session.id);

    response.status(200).json({
      success: true,
      checkoutSession: {
        id: session.id,
        url: session.url,
        amount: session.amount_total || 2900,
        currency: session.currency || "usd",
      },
    });
  } catch (error) {
    logger.error("Error creating Stripe checkout session:", error);
    if (error instanceof Error && error.message.includes("authorization")) {
      response.status(401).json({error: error.message});
    } else {
      response.status(500).json({error: "Failed to create checkout session"});
    }
  }
});

// Training Session Payment Function - Creates Stripe checkout session
export const createTrainingSessionCheckout = onCall({
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 30,
}, async (request) => {
  try {
    // Verify user is authenticated
    const userId = request.auth?.uid;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Get request data
    const {
      proId,
      amount,
      currency,
      sessionType,
      sessionDate,
      description,
    } = request.data;

    if (!proId || !amount || !currency || !sessionType) {
      throw new Error("Missing required fields");
    }

    // Verify the PRO exists and is active
    const proDoc = await db.collection("users").doc(proId).get();
    if (!proDoc.exists || proDoc.data()?.proStatus !== "inactive") {
      throw new Error("PRO account not found or inactive");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: "2025-07-30.basil",
    });

    logger.info(
      "Creating training session checkout for user:",
      userId,
      "to PRO:",
      proId
    );

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `${sessionType} Session`,
              description: description ||
                `Training session with ${proDoc.data()?.displayName || "PRO"}`,
            },
            unit_amount: amount, // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment", // One-time payment
      success_url: `${appBaseUrl.value()}/app/payments` +
        "?session_id={CHECKOUT_SESSION_ID}&status=success",
      cancel_url: `${appBaseUrl.value()}/app/payments?status=cancelled`,
      metadata: {
        userId: userId,
        proId: proId,
        sessionType: sessionType,
        sessionDate: sessionDate || new Date().toISOString(),
        paymentType: "training_session",
      },
    });

    logger.info("Training session checkout created successfully:", session.id);

    return {
      success: true,
      checkoutSession: {
        id: session.id,
        url: session.url,
        amount: session.amount_total || amount,
        currency: session.currency || currency,
      },
    };
  } catch (error) {
    logger.error("Error creating training session checkout:", error);
    throw new Error(
      error instanceof Error ?
        error.message : "Failed to create checkout session"
    );
  }
});

// Training Package Payment Function - Creates Stripe checkout session
export const createPackageCheckout = onCall({
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 30,
}, async (request) => {
  try {
    // Verify user is authenticated
    const userId = request.auth?.uid;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Get request data
    const {packageId, proId} = request.data;

    if (!packageId || !proId) {
      throw new Error("Package ID and PRO ID are required");
    }

    // Get package details from PRO user's subcollection
    const packageDoc = await db.collection("users")
      .doc(proId)
      .collection("trainingPackages")
      .doc(packageId)
      .get();
    if (!packageDoc.exists) {
      throw new Error("Package not found");
    }

    const packageData = packageDoc.data();
    if (packageData?.status !== "active") {
      throw new Error("Package is not available for purchase");
    }

    // Check if package has reached max purchases
    if (packageData.maxPurchases &&
        packageData.currentPurchases >= packageData.maxPurchases) {
      throw new Error("Package is sold out");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: "2025-07-30.basil",
    });

    logger.info(
      "Creating package checkout for user:",
      userId,
      "package:",
      packageId
    );

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
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
      mode: "payment", // One-time payment
      success_url: `${appBaseUrl.value()}/app/packages` +
        "?session_id={CHECKOUT_SESSION_ID}&status=success",
      cancel_url: `${appBaseUrl.value()}/app/packages?status=cancelled`,
      metadata: {
        userId: userId,
        packageId: packageId,
        proId: proId,
        paymentType: "training_package",
      },
    });

    logger.info("Package checkout created successfully:", session.id);

    return {
      success: true,
      checkoutSession: {
        id: session.id,
        url: session.url,
        amount: session.amount_total || packageData.price,
        currency: session.currency || packageData.currency,
      },
    };
  } catch (error) {
    logger.error("Error creating package checkout:", error);
    throw new Error(
      error instanceof Error ?
        error.message : "Failed to create checkout session"
    );
  }
});

// Stripe Webhook Handler - Processes successful payments
export const stripeWebhook = onRequest({
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 30,
}, async (request, response) => {
  try {
    // Verify Stripe webhook signature for security
    const signature = request.headers["stripe-signature"] as string;
    if (!signature) {
      response.status(400).send("No signature provided");
      return;
    }

    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: "2025-07-30.basil",
    });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody || request.body,
        signature,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      logger.error("Webhook signature verification failed:", err);
      response.status(400).send("Invalid signature");
      return;
    }

    logger.info("Stripe webhook received:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const paymentType = session.metadata?.paymentType;

      if (!userId) {
        logger.error("No userId in session metadata");
        response.status(400).send("Missing userId in metadata");
        return;
      }

      logger.info("Payment completed for user:", userId, "type:", paymentType);

      if (paymentType === "training_session") {
        // Handle training session payment
        const proId = session.metadata?.proId;
        const sessionType = session.metadata?.sessionType;
        const sessionDate = session.metadata?.sessionDate;

        if (!proId) {
          logger.error("No proId in training session metadata");
          response.status(400).send("Missing proId in metadata");
          return;
        }

        try {
          // Create payment record in user's payments subcollection
          const userPaymentsRef = db.collection("users")
            .doc(userId)
            .collection("payments");
          await userPaymentsRef.add({
            proId: proId,
            payerUid: userId,
            amount: session.amount_total || 0,
            currency: session.currency || "usd",
            stripePaymentIntentId: session.payment_intent as string,
            status: "succeeded",
            sessionType: sessionType,
            sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
            description: `${sessionType} Session Payment`,
            createdAt: new Date(),
          });

          logger.info(
            "Training session payment recorded successfully for user:",
            userId
          );
        } catch (dbError) {
          logger.error("Failed to record training session payment:", dbError);
          // Don't fail the webhook - we can retry later
        }
      } else if (paymentType === "training_package") {
        // Handle training package payment
        const packageId = session.metadata?.packageId;
        const proId = session.metadata?.proId;

        if (!packageId || !proId) {
          logger.error(
            "Missing packageId or proId in training package metadata"
          );
          response.status(400).send("Missing package metadata");
          return;
        }

        try {
          // Get package details from PRO user's subcollection
          const packageDoc = await db.collection("users")
            .doc(proId)
            .collection("trainingPackages")
            .doc(packageId)
            .get();
          if (!packageDoc.exists) {
            logger.error("Package not found:", packageId);
            return;
          }

          const packageData = packageDoc.data();
          if (!packageData) {
            logger.error("Package data is undefined");
            return;
          }

          // Create payment record in user's payments subcollection
          const userPaymentsRef = db.collection("users")
            .doc(userId)
            .collection("payments");
          const paymentRef = await userPaymentsRef.add({
            proId: proId,
            payerUid: userId,
            amount: session.amount_total || 0,
            currency: session.currency || "usd",
            stripePaymentIntentId: session.payment_intent as string,
            status: "succeeded",
            description: packageData.name,
            packageId: packageId,
            packageName: packageData.name,
            createdAt: new Date(),
          });

          // Create package purchase record in user's subcollection
          const userPackagePurchasesRef = db.collection("users")
            .doc(userId)
            .collection("packagePurchases");
          await userPackagePurchasesRef.add({
            packageId: packageId,
            proId: proId,
            athleteUid: userId,
            purchaseDate: new Date(),
            expiryDate: packageData.validDays ?
              new Date(
                Date.now() + packageData.validDays * 24 * 60 * 60 * 1000
              ) :
              undefined,
            sessionsRemaining: packageData.sessions,
            status: "active",
            paymentId: paymentRef.id,
            amountPaid: session.amount_total || 0,
            sessionsUsed: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Update package purchase count in PRO user's subcollection
          const proUserPackagesRef = db.collection("users")
            .doc(proId)
            .collection("trainingPackages");
          const packageDocRef = proUserPackagesRef.doc(packageId);

          // Get the current package data to update the count
          const currentPackageDoc = await packageDocRef.get();
          if (currentPackageDoc.exists) {
            const currentData = currentPackageDoc.data();
            const newPurchaseCount = (currentData?.currentPurchases || 0) + 1;

            await packageDocRef.update({
              currentPurchases: newPurchaseCount,
              updatedAt: new Date(),
            });
          }

          logger.info(
            "Training package payment recorded successfully for user:",
            userId,
            "package:",
            packageId
          );
        } catch (dbError) {
          logger.error("Failed to record training package payment:", dbError);
          // Don't fail the webhook - we can retry later
        }
      } else {
        // Handle PRO upgrade payment
        try {
          // Update user to PRO status and set custom claims
          await db.collection("users").doc(userId).update({
            proStatus: "active",
            updatedAt: new Date(),
          });

          // Ensure PRO user consistency (proId and custom claims)
          await ensureProUserConsistency(userId);

          // Create team document
          await db.collection("teams").doc(userId).set({
            proId: userId,
            name: "My Team",
            membersCount: {staff: 0, athlete: 0},
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          logger.info("User successfully upgraded to PRO:", userId);
        } catch (dbError) {
          logger.error("Failed to update user data:", dbError);
          // Don't fail the webhook - we can retry later
        }
      }
    }

    response.status(200).send("Webhook processed");
  } catch (error) {
    logger.error("Error processing Stripe webhook:", error);
    response.status(400).send("Webhook processing failed");
  }
});

export const refreshCustomClaims = onRequest({
  cors: true,
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 30,
}, async (request, response) => {
  // Handle CORS preflight
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET, POST");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  try {
    // Verify user is authenticated
    const authHeader = request.headers.authorization || "";
    const userId = await verifyFirebaseToken(authHeader);

    logger.info(`Refreshing custom claims for user: ${userId}`);

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      response.status(404).json({error: "User document not found"});
      return;
    }

    const userData = userDoc.data();
    if (!userData) {
      response.status(404).json({error: "User data not found"});
      return;
    }

    const role = userData.role || "ATHLETE";
    const proId = userData.proId || userId;

    // Set custom claims
    const customClaims = {
      role: role,
      proId: proId,
      email: userData.email,
      emailVerified: userData.emailVerified || false,
    };

    await getAuth().setCustomUserClaims(userId, customClaims);

    logger.info(
      `Successfully refreshed custom claims for ${userId}:`,
      customClaims
    );

    // Update the user document
    await db.collection("users").doc(userId).update({
      customClaimsSet: true,
      customClaimsSetAt: new Date(),
      lastCustomClaimsRefresh: new Date(),
    });

    response.status(200).json({success: true, customClaims});
  } catch (error) {
    logger.error("Error refreshing custom claims:", error);
    if (error instanceof Error && error.message.includes("authorization")) {
      response.status(401).json({error: error.message});
    } else {
      response.status(500).json({error: "Failed to refresh custom claims"});
    }
  }
});

// Remove team member function
export const removeTeamMember = onCall(
  {maxInstances: 10},
  async (request) => {
    try {
      const {memberUid} = request.data;

      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const requesterUid = request.auth.uid;

      // Get the requester's user data to verify they're a PRO user
      const requesterDoc = await db.collection("users").doc(requesterUid).get();
      if (!requesterDoc.exists) {
        throw new Error("Requester not found");
      }

      const requesterData = requesterDoc.data();
      if (requesterData?.role !== "PRO") {
        throw new Error("Only PRO users can remove team members");
      }

      // Get the member to be removed
      const memberDoc = await db.collection("users").doc(memberUid).get();
      if (!memberDoc.exists) {
        throw new Error("Team member not found");
      }

      const memberData = memberDoc.data();

      // Verify the member belongs to the PRO's team
      if (memberData?.proId !== requesterUid) {
        throw new Error("Member does not belong to your team");
      }

      // Prevent PRO from removing themselves
      if (memberUid === requesterUid) {
        throw new Error("Cannot remove yourself from the team");
      }

      // Update the member's status to inactive and remove team association
      await db.collection("users").doc(memberUid).update({
        status: "inactive",
        proId: null,
        removedAt: new Date(),
        removedBy: requesterUid,
        removedFromTeam: requesterUid,
      });

      // Log the removal for audit purposes
      await db.collection("auditLogs").add({
        action: "remove_team_member",
        requesterUid,
        memberUid,
        memberRole: memberData?.role,
        memberEmail: memberData?.email,
        timestamp: new Date(),
        proId: requesterUid,
      });

      logger.info(
        `Team member ${memberUid} removed by PRO user ${requesterUid}`
      );

      return {
        success: true,
        message: `Successfully removed ${memberData?.displayName ||
          "team member"} from your team`,
      };
    } catch (error) {
      logger.error("Error removing team member:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to remove team member"
      );
    }
  }
);

// Clean up orphaned Firebase Auth users
export const cleanupOrphanedUsers = onCall(
  {maxInstances: 10},
  async (request) => {
    try {
      const {email} = request.data;

      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const requesterUid = request.auth.uid;

      // Get the requester's user data to verify they're a PRO user (admin)
      const requesterDoc = await db.collection("users").doc(requesterUid).get();
      if (!requesterDoc.exists) {
        throw new Error("Requester not found");
      }

      const requesterData = requesterDoc.data();
      if (requesterData?.role !== "PRO") {
        throw new Error("Only PRO users can clean up orphaned accounts");
      }

      if (!email) {
        throw new Error("Email is required");
      }

      // Check if user exists in Firestore
      const usersRef = db.collection("users");
      const q = usersRef.where("email", "==", email);
      const querySnapshot = await q.get();

      if (!querySnapshot.empty) {
        throw new Error("User exists in Firestore - no cleanup needed");
      }

      // Try to find the user in Firebase Auth by email
      try {
        const userRecord = await getAuth().getUserByEmail(email);

        // User exists in Auth but not in Firestore -
        // this is an orphaned account
        logger.info(
          `Found orphaned user in Auth: ${userRecord.uid} for email: ${email}`
        );

        // Delete the orphaned Firebase Auth user
        await getAuth().deleteUser(userRecord.uid);

        // Log the cleanup for audit purposes
        await db.collection("auditLogs").add({
          action: "cleanup_orphaned_user",
          requesterUid,
          orphanedUserUid: userRecord.uid,
          orphanedUserEmail: email,
          timestamp: new Date(),
          proId: requesterUid,
        });

        logger.info(
          `Successfully cleaned up orphaned user: ${userRecord.uid} ` +
          `for email: ${email}`
        );

        return {
          success: true,
          message: `Successfully cleaned up orphaned account for ${email}. ` +
            "You can now register with this email.",
          orphanedUid: userRecord.uid,
        };
      } catch (authError: any) {
        if (authError.code === "auth/user-not-found") {
          throw new Error("No user found with this email in Firebase Auth");
        } else {
          throw new Error(
            `Error accessing Firebase Auth: ${authError.message}`
          );
        }
      }
    } catch (error) {
      logger.error("Error cleaning up orphaned user:", error);
      throw new Error(
        error instanceof Error ?
          error.message : "Failed to clean up orphaned user"
      );
    }
  }
);

// Enhanced function to fix existing PRO user proId field
export const fixExistingProUser = onRequest({
  cors: true,
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 30,
}, async (request, response) => {
  // Handle CORS preflight
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  try {
    // Verify user is authenticated and is PRO
    const userId = await verifyFirebaseToken(
      request.headers.authorization || ""
    );

    // Check if user is PRO
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists || userDoc.data()?.role !== "PRO") {
      response.status(403).json({
        error: "Only PRO users can call this function",
      });
      return;
    }

    logger.info("Fixing existing PRO user proId for:", userId);

    // Update the PRO user to set proId to their own UID
    await db.collection("users").doc(userId).update({
      proId: userId,
      updatedAt: new Date(),
    });

    // Update their custom claims
    await getAuth().setCustomUserClaims(userId, {
      role: "PRO",
      proId: userId,
    });

    logger.info("Successfully fixed PRO user proId for:", userId);

    response.status(200).json({
      success: true,
      message: "PRO user proId fixed successfully",
      proId: userId,
    });
  } catch (error) {
    logger.error("Error fixing PRO user:", error);
    response.status(500).json({error: "Failed to fix PRO user"});
  }
});

// Firestore trigger to ensure PRO user consistency
export const onUserUpdate = onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    try {
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

      if (!beforeData || !afterData) {
        logger.info("No data available for user update trigger");
        return;
      }

      const userId = event.params.userId;

      // Check if user was upgraded to PRO
      const wasProBefore = beforeData.role === "PRO" ||
        beforeData.proStatus === "active";
      const isProAfter = afterData.role === "PRO" ||
        afterData.proStatus === "active";

      // If user became PRO, ensure consistency
      if (!wasProBefore && isProAfter) {
        logger.info("🔄 User upgraded to PRO, ensuring consistency:", userId);
        await ensureProUserConsistency(userId);
      }

      // If user is PRO but proId doesn't match uid, fix it
      if (isProAfter && afterData.proId !== userId) {
        logger.info("🔄 PRO user has incorrect proId, fixing:", userId);
        await ensureProUserConsistency(userId);
      }
    } catch (error) {
      logger.error("❌ Error in user update trigger:", error);
    }
  }
);

// Secure PRO Account Activation Function
// This function ensures PRO accounts can only be activated
// through proper validation
export const activateProAccount = onCall({
  maxInstances: 5,
  region: "us-central1",
}, async (request) => {
  try {
    // Verify the user is authenticated
    if (!request.auth) {
      throw new Error("User must be authenticated");
    }

    const userId = request.auth.uid;
    const {activationMethod, freeAccessCode, paymentIntentId} = request.data;

    // Validate required parameters
    if (!activationMethod ||
        !["free_access", "payment"].includes(activationMethod)) {
      throw new Error("Invalid activation method");
    }

    // Get user document with retry mechanism for timing issues
    let userDoc;
    let userData;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      userDoc = await db.collection("users").doc(userId).get();
      
      if (userDoc.exists) {
        userData = userDoc.data();
        break;
      }
      
      // Wait a bit before retrying (timing issue with document creation)
      if (retryCount < maxRetries - 1) {
        logger.info(`User document not found, retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      retryCount++;
    }
    
    if (!userDoc?.exists || !userData) {
      throw new Error("User document not found. Please wait a moment after registration and try again.");
    }

    if (userData?.role !== "PRO") {
      throw new Error(`Only PRO users can activate their accounts. Your role: ${userData?.role || 'not set'}`);
    }

    if (userData?.proStatus === "active") {
      throw new Error("PRO account is already active");
    }

    // Validate activation method
    if (activationMethod === "free_access") {
      // Validate free access code
      const expectedCode = process.env.FREE_ACCESS_CODE;
      if (!expectedCode) {
        throw new Error("Free access code not configured on server");
      }
      if (!freeAccessCode || freeAccessCode !== expectedCode) {
        throw new Error("Invalid free access code");
      }

      // Check if free access is already activated (prevent abuse)
      const existingFreeAccess = await db.collection("freeAccessActivations")
        .doc(userId).get();
      if (existingFreeAccess.exists) {
        throw new Error("Free access already activated for this user");
      }

      // Record free access activation
      await db.collection("freeAccessActivations").doc(userId).set({
        userId,
        activatedAt: new Date(),
        activationMethod: "free_access",
        code: freeAccessCode,
      });

      logger.info("✅ Free access activated for user:", userId);
    } else if (activationMethod === "payment") {
      // Validate payment (this would integrate with
      // Stripe webhook verification)
      if (!paymentIntentId) {
        throw new Error("Payment intent ID required for payment activation");
      }

      // Verify payment was successful (in production, this would check Stripe)
      // For now, we'll assume payment is valid if intent ID is provided
      logger.info(
        "✅ Payment activation for user:",
        userId,
        "with intent:",
        paymentIntentId
      );
    }

    // Activate PRO account
    await db.collection("users").doc(userId).update({
      proStatus: "active",
      proId: userId,
      activatedAt: new Date(),
      activationMethod,
      updatedAt: new Date(),
    });

    // Update custom claims
    await getAuth().setCustomUserClaims(userId, {
      role: "PRO",
      proId: userId,
      proStatus: "active",
    });

    logger.info(
      "✅ PRO account activated successfully for user:",
      userId,
      "via:",
      activationMethod
    );

    return {
      success: true,
      message: "PRO account activated successfully",
      activationMethod,
    };
  } catch (error) {
    logger.error("❌ Error activating PRO account:", error);
    const errorMessage = error instanceof Error ?
      error.message : "Unknown error";
    throw new Error(`Failed to activate PRO account: ${errorMessage}`);
  }
});

// ============================================================================
// PERSISTENT INVITE LINK SYSTEM
// ============================================================================

/**
 * Initialize or get persistent invite links for a PRO user
 * @param {string} proId PRO user ID
 * @return {Promise<object>} Object containing athlete and staff invite links
 */
async function initializePersistentInvites(proId: string): Promise<{
  athleteInvite: any;
  staffInvite: any;
}> {
  try {
    // Check if PRO user already has persistent invites
    const existingInvitesQuery = await db.collection("persistentInvites")
      .where("proId", "==", proId)
      .get();

    let athleteInvite: any = null;
    let staffInvite: any = null;

    if (existingInvitesQuery.empty) {
      // Create new persistent invites for this PRO
      logger.info("Creating new persistent invites for PRO:", proId);

      // Create athlete invite
      const athleteInviteRef = db.collection("persistentInvites").doc();
      const athleteToken = crypto.randomUUID();
      const athleteTokenHash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(athleteToken)
      ).then((hash) => Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      );

      const athleteInviteData = {
        proId,
        role: "ATHLETE",
        inviteCode: athleteToken,
        tokenHash: athleteTokenHash,
        maxRedemptions: 20, // Default athlete limit
        redeemedCount: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        redemptions: [],
      };

      await athleteInviteRef.set(athleteInviteData);
      athleteInvite = {id: athleteInviteRef.id, ...athleteInviteData};

      // Create staff invite
      const staffInviteRef = db.collection("persistentInvites").doc();
      const staffToken = crypto.randomUUID();
      const staffTokenHash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(staffToken)
      ).then((hash) => Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      );

      const staffInviteData = {
        proId,
        role: "STAFF",
        inviteCode: staffToken,
        tokenHash: staffTokenHash,
        maxRedemptions: 5, // Default staff limit
        redeemedCount: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        redemptions: [],
      };

      await staffInviteRef.set(staffInviteData);
      staffInvite = {id: staffInviteRef.id, ...staffInviteData};

      logger.info("✅ Persistent invites created for PRO:", proId);
    } else {
      // Get existing invites
      existingInvitesQuery.docs.forEach((doc) => {
        const data = doc.data();
        if (data.role === "ATHLETE") {
          athleteInvite = {id: doc.id, ...data};
        } else if (data.role === "STAFF") {
          staffInvite = {id: doc.id, ...data};
        }
      });

      // If any invite is missing, create it
      if (!athleteInvite) {
        const athleteInviteRef = db.collection("persistentInvites").doc();
        const athleteToken = crypto.randomUUID();
        const athleteTokenHash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(athleteToken)
        ).then((hash) => Array.from(new Uint8Array(hash))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
        );

        const athleteInviteData = {
          proId,
          role: "ATHLETE",
          inviteCode: athleteToken,
          tokenHash: athleteTokenHash,
          maxRedemptions: 20,
          redeemedCount: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          redemptions: [],
        };

        await athleteInviteRef.set(athleteInviteData);
        athleteInvite = {id: athleteInviteRef.id, ...athleteInviteData};
      }

      if (!staffInvite) {
        const staffInviteRef = db.collection("persistentInvites").doc();
        const staffToken = crypto.randomUUID();
        const staffTokenHash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(staffToken)
        ).then((hash) => Array.from(new Uint8Array(hash))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
        );

        const staffInviteData = {
          proId,
          role: "STAFF",
          inviteCode: staffToken,
          tokenHash: staffTokenHash,
          maxRedemptions: 5,
          redeemedCount: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          redemptions: [],
        };

        await staffInviteRef.set(staffInviteData);
        staffInvite = {id: staffInviteRef.id, ...staffInviteData};
      }
    }

    return {athleteInvite, staffInvite};
  } catch (error) {
    logger.error("Error initializing persistent invites:", error);
    throw error;
  }
}

/**
 * Validate persistent invite link
 * @param {string} inviteCode The invite code from the URL
 * @return {Promise<object>} Validation result with invite data
 */
async function validatePersistentInvite(
  inviteCode: string
): Promise<{valid: boolean; invite?: any; message?: string}> {
  try {
    // Hash the invite code to compare with stored hash
    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(inviteCode)
    ).then((hash) => Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    );

    // Find the persistent invite
    const inviteQuery = await db.collection("persistentInvites")
      .where("tokenHash", "==", tokenHash)
      .limit(1)
      .get();

    if (inviteQuery.empty) {
      return {valid: false, message: "Invalid invite link"};
    }

    const inviteDoc = inviteQuery.docs[0];
    const inviteData = inviteDoc.data();

    // Check if invite is active
    if (!inviteData.active) {
      return {valid: false, message: "This invite link has been deactivated"};
    }

    // Check if redemption limit reached
    if (inviteData.redeemedCount >= inviteData.maxRedemptions) {
      return {valid: false, message: `${inviteData.role} invite limit reached`};
    }

    // Verify PRO user is still active
    const proUserDoc = await db.collection("users").doc(inviteData.proId).get();
    if (!proUserDoc.exists || proUserDoc.data()?.proStatus !== "active") {
      return {valid: false, message: "PRO account is no longer active"};
    }

    return {
      valid: true,
      invite: {id: inviteDoc.id, ...inviteData},
    };
  } catch (error) {
    logger.error("Error validating persistent invite:", error);
    return {valid: false, message: "Error validating invite"};
  }
}

/**
 * Redeem persistent invite and create user account
 * @param {string} inviteCode The invite code
 * @param {string} uid User ID from Firebase Auth
 * @param {object} userData User profile data
 * @return {Promise<object>} Redemption result
 */
async function redeemPersistentInvite(
  inviteCode: string,
  uid: string,
  userData: any
): Promise<{success: boolean; message: string; role: string; proId: string}> {
  try {
    // Validate the invite
    const validation = await validatePersistentInvite(inviteCode);
    if (!validation.valid || !validation.invite) {
      throw new Error(validation.message || "Invalid invite");
    }

    const invite = validation.invite;

    // Check if user already exists and has been invited
    const existingUserDoc = await db.collection("users").doc(uid).get();
    if (existingUserDoc.exists) {
      const existingData = existingUserDoc.data();
      if (existingData?.proId === invite.proId) {
        throw new Error("User already joined this team");
      }
    }

    // Create or update user document
    const userDoc: any = {
      uid: uid,
      email: userData.email,
      displayName: userData.displayName,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      role: invite.role,
      proId: invite.proId,
      joinedViaInvite: invite.id,
      joinedAt: new Date(),
      updatedAt: new Date(),
    };

    if (!existingUserDoc.exists) {
      userDoc.createdAt = new Date();
    }

    await db.collection("users").doc(uid).set(userDoc, {merge: true});

    // Update persistent invite with redemption info
    const inviteRef = db.collection("persistentInvites").doc(invite.id);
    await inviteRef.update({
      redeemedCount: invite.redeemedCount + 1,
      updatedAt: new Date(),
      redemptions: [
        ...invite.redemptions,
        {
          uid,
          email: userData.email,
          displayName: userData.displayName,
          redeemedAt: new Date(),
        },
      ],
    });

    // Set custom claims
    await getAuth().setCustomUserClaims(uid, {
      role: invite.role,
      proId: invite.proId,
    });

    // Update team member count
    const teamRef = db.collection("teams").doc(invite.proId);
    await db.runTransaction(async (transaction) => {
      const teamDoc = await transaction.get(teamRef);
      if (teamDoc.exists) {
        const currentData = teamDoc.data();
        const memberType = invite.role === "STAFF" ? "staff" : "athlete";
        const newCount = (currentData?.membersCount?.[memberType] || 0) + 1;

        transaction.update(teamRef, {
          [`membersCount.${memberType}`]: newCount,
          updatedAt: new Date(),
        });
      } else {
        transaction.set(teamRef, {
          proId: invite.proId,
          name: "My Team",
          membersCount: {
            staff: invite.role === "STAFF" ? 1 : 0,
            athlete: invite.role === "ATHLETE" ? 1 : 0,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    logger.info("✅ Persistent invite redeemed successfully:", {
      uid,
      role: invite.role,
      proId: invite.proId,
      inviteId: invite.id,
    });

    return {
      success: true,
      message: "Successfully joined team",
      role: invite.role,
      proId: invite.proId,
    };
  } catch (error) {
    logger.error("Error redeeming persistent invite:", error);
    throw error;
  }
}

/**
 * Clean up persistent invites with incorrect redemptions structure
 * @param {string} proId PRO user ID
 * @return {Promise<void>}
 */
async function cleanupPersistentInvitesStructure(proId: string): Promise<void> {
  try {
    const invitesQuery = await db.collection("persistentInvites")
      .where("proId", "==", proId)
      .get();

    const batch = db.batch();
    let needsUpdate = false;

    invitesQuery.docs.forEach((doc) => {
      const data = doc.data();
      
      // Check if redemptions is not an array or is malformed
      if (!Array.isArray(data.redemptions)) {
        logger.info(`Fixing redemptions structure for invite ${doc.id}`);
        batch.update(doc.ref, {
          redemptions: [],
          redeemedCount: 0, // Reset count since structure was wrong
          updatedAt: new Date(),
        });
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      await batch.commit();
      logger.info(`✅ Fixed redemptions structure for PRO ${proId}`);
    }
  } catch (error) {
    logger.error("Error cleaning up persistent invites structure:", error);
  }
}

// ============================================================================
// PERSISTENT INVITE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get persistent invite links for a PRO user
 */
export const getPersistentInvites = onRequest({
  cors: true,
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 30,
}, async (request, response) => {
  // Handle CORS preflight
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET, POST");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  try {
    // Verify user is authenticated and is PRO
    const authHeader = request.headers.authorization || "";
    const proId = await verifyFirebaseToken(authHeader);

    if (!proId) {
      response.status(401).json({error: "Unauthorized"});
      return;
    }

    // Verify user is PRO and has active status
    const proUserDoc = await db.collection("users").doc(proId).get();
    if (!proUserDoc.exists) {
      response.status(404).json({error: "PRO user not found"});
      return;
    }

    const proUserData = proUserDoc.data();
    if (proUserData?.role !== "PRO" || proUserData?.proStatus !== "active") {
      response.status(403).json({
        error: "Only active PRO users can access invite links",
      });
      return;
    }

    // Clean up any malformed redemptions data
    await cleanupPersistentInvitesStructure(proId);

    // Get or initialize persistent invites
    const {athleteInvite, staffInvite} =
      await initializePersistentInvites(proId);

    // Generate invite URLs
    const baseUrl = appBaseUrl.value();
    const cleanBaseUrl = baseUrl.endsWith("/") ?
      baseUrl.slice(0, -1) : baseUrl;

    const athleteInviteUrl =
      `${cleanBaseUrl}/join?token=${athleteInvite.inviteCode}`;
    const staffInviteUrl =
      `${cleanBaseUrl}/join?token=${staffInvite.inviteCode}`;

    response.status(200).json({
      success: true,
      invites: {
        athlete: {
          id: athleteInvite.id,
          role: athleteInvite.role,
          inviteUrl: athleteInviteUrl,
          inviteCode: athleteInvite.inviteCode,
          maxRedemptions: athleteInvite.maxRedemptions,
          redeemedCount: athleteInvite.redeemedCount,
          remainingInvites:
            athleteInvite.maxRedemptions - athleteInvite.redeemedCount,
          active: athleteInvite.active,
          createdAt: athleteInvite.createdAt,
          updatedAt: athleteInvite.updatedAt,
        },
        staff: {
          id: staffInvite.id,
          role: staffInvite.role,
          inviteUrl: staffInviteUrl,
          inviteCode: staffInvite.inviteCode,
          maxRedemptions: staffInvite.maxRedemptions,
          redeemedCount: staffInvite.redeemedCount,
          remainingInvites:
            staffInvite.maxRedemptions - staffInvite.redeemedCount,
          active: staffInvite.active,
          createdAt: staffInvite.createdAt,
          updatedAt: staffInvite.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error("Error getting persistent invites:", error);
    response.status(500).json({error: "Failed to get invite links"});
  }
});

/**
 * Regenerate invite link for a specific role
 */
/**
 * One-time cleanup function to fix all persistent invites with malformed redemptions
 */
export const cleanupAllPersistentInvites = onRequest({
  cors: true,
  maxInstances: 1,
  memory: "512MiB",
  timeoutSeconds: 60,
}, async (request, response) => {
  // Handle CORS preflight
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  try {
    // Get all persistent invites
    const allInvitesQuery = await db.collection("persistentInvites").get();
    
    if (allInvitesQuery.empty) {
      response.status(200).json({
        success: true,
        message: "No persistent invites found",
        fixed: 0
      });
      return;
    }

    const batch = db.batch();
    let fixedCount = 0;

    allInvitesQuery.docs.forEach((doc) => {
      const data = doc.data();
      
      // Check if redemptions is not an array or is malformed
      if (!Array.isArray(data.redemptions)) {
        logger.info(`Fixing redemptions structure for invite ${doc.id} (${data.role})`);
        batch.update(doc.ref, {
          redemptions: [],
          redeemedCount: 0, // Reset count since structure was wrong
          updatedAt: new Date(),
        });
        fixedCount++;
      }
    });

    if (fixedCount > 0) {
      await batch.commit();
      logger.info(`✅ Fixed ${fixedCount} persistent invites`);
    }

    response.status(200).json({
      success: true,
      message: `Fixed ${fixedCount} persistent invites with malformed redemptions`,
      fixed: fixedCount,
      total: allInvitesQuery.docs.length
    });

  } catch (error) {
    logger.error("Error cleaning up all persistent invites:", error);
    response.status(500).json({
      error: "Failed to cleanup persistent invites",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export const regenerateInviteLink = onRequest({
  cors: true,
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 30,
}, async (request, response) => {
  // Handle CORS preflight
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  try {
    // Verify user is authenticated and is PRO
    const authHeader = request.headers.authorization || "";
    const proId = await verifyFirebaseToken(authHeader);

    if (!proId) {
      response.status(401).json({error: "Unauthorized"});
      return;
    }

    // Verify user is PRO and has active status
    const proUserDoc = await db.collection("users").doc(proId).get();
    if (!proUserDoc.exists) {
      response.status(404).json({error: "PRO user not found"});
      return;
    }

    const proUserData = proUserDoc.data();
    if (proUserData?.role !== "PRO" || proUserData?.proStatus !== "active") {
      response.status(403).json({
        error: "Only active PRO users can regenerate invite links",
      });
      return;
    }

    const {role} = request.body;

    if (!role || !["ATHLETE", "STAFF"].includes(role)) {
      response.status(400).json({
        error: "Invalid role. Must be ATHLETE or STAFF",
      });
      return;
    }

    // Find existing invite for this role
    const existingInviteQuery = await db.collection("persistentInvites")
      .where("proId", "==", proId)
      .where("role", "==", role)
      .limit(1)
      .get();

    if (existingInviteQuery.empty) {
      response.status(404).json({error: "Invite not found for this role"});
      return;
    }

    const inviteDoc = existingInviteQuery.docs[0];
    const inviteData = inviteDoc.data();

    // Generate new invite code
    const newToken = crypto.randomUUID();
    const newTokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(newToken)
    ).then((hash) => Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    );

    // Update the invite with new code
    await inviteDoc.ref.update({
      inviteCode: newToken,
      tokenHash: newTokenHash,
      updatedAt: new Date(),
      // Reset redemption count and history when regenerating
      redeemedCount: 0,
      redemptions: [],
    });

    // Generate new invite URL
    const baseUrl = appBaseUrl.value();
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const newInviteUrl = `${cleanBaseUrl}/join?token=${newToken}`;

    logger.info("✅ Invite link regenerated:", {
      proId,
      role,
      oldInviteId: inviteData.id,
      newInviteCode: newToken,
    });

    response.status(200).json({
      success: true,
      message: `${role} invite link regenerated successfully`,
      invite: {
        id: inviteDoc.id,
        role: inviteData.role,
        inviteUrl: newInviteUrl,
        inviteCode: newToken,
        maxRedemptions: inviteData.maxRedemptions,
        redeemedCount: 0,
        remainingInvites: inviteData.maxRedemptions,
        active: inviteData.active,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("Error regenerating invite link:", error);
    response.status(500).json({error: "Failed to regenerate invite link"});
  }
});

/**
 * Toggle invite link active status
 */
export const toggleInviteStatus = onRequest({
  cors: true,
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 30,
}, async (request, response) => {
  // Handle CORS preflight
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  try {
    // Verify user is authenticated and is PRO
    const authHeader = request.headers.authorization || "";
    const proId = await verifyFirebaseToken(authHeader);

    if (!proId) {
      response.status(401).json({error: "Unauthorized"});
      return;
    }

    // Verify user is PRO and has active status
    const proUserDoc = await db.collection("users").doc(proId).get();
    if (!proUserDoc.exists) {
      response.status(404).json({error: "PRO user not found"});
      return;
    }

    const proUserData = proUserDoc.data();
    if (proUserData?.role !== "PRO" || proUserData?.proStatus !== "active") {
      response.status(403).json({
        error: "Only active PRO users can toggle invite status",
      });
      return;
    }

    const {role, active} = request.body;

    if (!role || !["ATHLETE", "STAFF"].includes(role)) {
      response.status(400).json({
        error: "Invalid role. Must be ATHLETE or STAFF",
      });
      return;
    }

    if (typeof active !== "boolean") {
      response.status(400).json({
        error: "Active status must be a boolean",
      });
      return;
    }

    // Find existing invite for this role
    const existingInviteQuery = await db.collection("persistentInvites")
      .where("proId", "==", proId)
      .where("role", "==", role)
      .limit(1)
      .get();

    if (existingInviteQuery.empty) {
      response.status(404).json({error: "Invite not found for this role"});
      return;
    }

    const inviteDoc = existingInviteQuery.docs[0];

    // Update the invite status
    await inviteDoc.ref.update({
      active,
      updatedAt: new Date(),
    });

    logger.info("✅ Invite status toggled:", {
      proId,
      role,
      active,
      inviteId: inviteDoc.id,
    });

    response.status(200).json({
      success: true,
      message: `${role} invite link ${
        active ? "activated" : "deactivated"
      } successfully`,
      active,
    });
  } catch (error) {
    logger.error("Error toggling invite status:", error);
    response.status(500).json({error: "Failed to toggle invite status"});
  }
});

/**
 * Validate persistent invite link (public endpoint)
 */
export const validatePersistentInviteLink = onRequest({
  cors: true,
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 30,
}, async (request, response) => {
  // Handle CORS preflight
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  try {
    const {inviteCode} = request.body;

    if (!inviteCode) {
      response.status(400).json({error: "Missing invite code"});
      return;
    }

    // Validate the invite
    const validation = await validatePersistentInvite(inviteCode);

    if (validation.valid && validation.invite) {
      response.status(200).json({
        valid: true,
        invite: {
          role: validation.invite.role,
          proId: validation.invite.proId,
          maxRedemptions: validation.invite.maxRedemptions,
          redeemedCount: validation.invite.redeemedCount,
          remainingInvites:
          validation.invite.maxRedemptions - validation.invite.redeemedCount,
        },
      });
    } else {
      response.status(400).json({
        valid: false,
        error: validation.message,
      });
    }
  } catch (error) {
    logger.error("Error validating persistent invite link:", error);
    response.status(500).json({error: "Internal server error"});
  }
});

/**
 * Redeem persistent invite link (public endpoint)
 */
export const redeemPersistentInviteLink = onRequest({
  cors: true,
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 30,
}, async (request, response) => {
  // Handle CORS preflight
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  try {
    const {inviteCode, uid, userData} = request.body;

    if (!inviteCode || !uid || !userData) {
      response.status(400).json({error: "Missing required fields"});
      return;
    }

    // Verify the user is authenticated
    const authHeader = request.headers.authorization || "";
    const authenticatedUid = await verifyFirebaseToken(authHeader);

    if (authenticatedUid !== uid) {
      response.status(403).json({error: "Unauthorized"});
      return;
    }

    // Redeem the invite
    const result = await redeemPersistentInvite(inviteCode, uid, userData);

    response.status(200).json({
      success: true,
      message: result.message,
      role: result.role,
      proId: result.proId,
    });
  } catch (error) {
    logger.error("Error redeeming persistent invite link:", error);
    response.status(500).json({
      error: error instanceof Error ? error.message : "Failed to redeem invite",
    });
  }
});

// ============================================================================
// MIGRATION FUNCTION FOR EXISTING USERS
// ============================================================================


