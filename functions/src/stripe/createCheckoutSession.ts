import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

// Price IDs — set these after creating products in the Stripe dashboard
// and update the values here (or move to Firebase config/secrets)
const PRICE_IDS: Record<string, Record<string, string>> = {
    standard: {
        monthly: 'price_standard_monthly', // replace with real Stripe price ID
        yearly: 'price_standard_yearly',
    },
    professional: {
        monthly: 'price_professional_monthly',
        yearly: 'price_professional_yearly',
    },
};

export const createCheckoutSession = onCall(
    { secrets: [stripeSecretKey] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be signed in.');
        }

        const { planId, billingPeriod } = request.data as {
            planId: 'standard' | 'professional';
            billingPeriod: 'monthly' | 'yearly';
        };

        if (!planId || !billingPeriod) {
            throw new HttpsError('invalid-argument', 'planId and billingPeriod are required.');
        }

        const priceId = PRICE_IDS[planId]?.[billingPeriod];
        if (!priceId) {
            throw new HttpsError('invalid-argument', 'Invalid planId or billingPeriod.');
        }

        const stripe = new Stripe(stripeSecretKey.value());
        const db = getFirestore();
        const uid = request.auth.uid;

        // Get or create a Stripe Customer for this user
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data() ?? {};
        let stripeCustomerId: string = userData.subscription?.stripeCustomerId ?? '';

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: userData.email ?? request.auth.token.email ?? undefined,
                metadata: { firebaseUid: uid },
            });
            stripeCustomerId = customer.id;
            // Persist immediately so webhook can look it up
            await db.collection('users').doc(uid).set(
                { subscription: { stripeCustomerId } },
                { merge: true }
            );
        }

        const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${appUrl}/app/plans/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/app/plans`,
            metadata: { firebaseUid: uid, planId },
            subscription_data: {
                metadata: { firebaseUid: uid, planId },
            },
            allow_promotion_codes: true,
        });

        return { url: session.url };
    }
);
