import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const appUrl = defineString('APP_URL', { default: 'https://surveygo-effcc.web.app' });

export const createPortalSession = onCall(
    { secrets: [stripeSecretKey], cors: true, invoker: 'public' },
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
        const resolvedAppUrl = appUrl.value();

        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${resolvedAppUrl}/app/settings`,
        });

        return { url: session.url };
    }
);
