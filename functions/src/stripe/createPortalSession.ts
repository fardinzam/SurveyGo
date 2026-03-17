import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

export const createPortalSession = onCall(
    { secrets: [stripeSecretKey] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be signed in.');
        }

        const db = getFirestore();
        const uid = request.auth.uid;

        const userDoc = await db.collection('users').doc(uid).get();
        const stripeCustomerId = userDoc.data()?.subscription?.stripeCustomerId as string | undefined;

        if (!stripeCustomerId) {
            throw new HttpsError('failed-precondition', 'No active subscription found.');
        }

        const stripe = new Stripe(stripeSecretKey.value());
        const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${appUrl}/app/settings`,
        });

        return { url: session.url };
    }
);
