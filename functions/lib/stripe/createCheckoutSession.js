"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckoutSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const appUrl = (0, params_1.defineString)('APP_URL', { default: 'https://surveygo-effcc.web.app' });
// Price IDs — set these after creating products in the Stripe dashboard
// and update the values here (or move to Firebase config/secrets)
const PRICE_IDS = {
    standard: {
        monthly: 'price_standard_monthly', // replace with real Stripe price ID
        yearly: 'price_standard_yearly',
    },
    professional: {
        monthly: 'price_professional_monthly',
        yearly: 'price_professional_yearly',
    },
};
exports.createCheckoutSession = (0, https_1.onCall)({ secrets: [stripeSecretKey], cors: true, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { planId, billingPeriod } = request.data;
    if (!planId || !billingPeriod) {
        throw new https_1.HttpsError('invalid-argument', 'planId and billingPeriod are required.');
    }
    const priceId = PRICE_IDS[planId]?.[billingPeriod];
    if (!priceId) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid planId or billingPeriod.');
    }
    const stripe = new stripe_1.default(stripeSecretKey.value());
    const db = (0, firestore_1.getFirestore)();
    const uid = request.auth.uid;
    // Get or create a Stripe Customer for this user
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() ?? {};
    let stripeCustomerId = userData.subscription?.stripeCustomerId ?? '';
    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: userData.email ?? request.auth.token.email ?? undefined,
            metadata: { firebaseUid: uid },
        });
        stripeCustomerId = customer.id;
        // Persist immediately so webhook can look it up
        await db.collection('users').doc(uid).set({ subscription: { stripeCustomerId } }, { merge: true });
    }
    const resolvedAppUrl = appUrl.value();
    const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${resolvedAppUrl}/app/plans/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${resolvedAppUrl}/app/plans`,
        metadata: { firebaseUid: uid, planId },
        subscription_data: {
            metadata: { firebaseUid: uid, planId },
        },
        allow_promotion_codes: true,
    });
    return { url: session.url };
});
//# sourceMappingURL=createCheckoutSession.js.map