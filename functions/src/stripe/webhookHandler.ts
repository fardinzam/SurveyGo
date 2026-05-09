import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

type PlanId = 'basic' | 'standard' | 'professional';

// Map Stripe price IDs → plan names. Keep in sync with createCheckoutSession.ts.
// Replace these placeholder keys with your real Stripe price IDs (price_xxx, NOT prod_xxx).
// Keys = Stripe price IDs (price_xxx from your Stripe dashboard, NOT prod_xxx)
// Values = plan names in your app
const PRICE_TO_PLAN: Record<string, PlanId> = {
    'price_1TTpne3lLNQTzVc8hko3890u': 'standard',
    'price_1TTpqR3lLNQTzVc8MJfYM2cV': 'standard',
    'price_1TTpo23lLNQTzVc8krHpy1wv': 'professional',
    'price_1TTpqC3lLNQTzVc8pGBjXxh4': 'professional',
};

async function getUidByCustomerId(db: Firestore, customerId: string): Promise<string | null> {
    const snap = await db
        .collection('users')
        .where('subscription.stripeCustomerId', '==', customerId)
        .limit(1)
        .get();
    if (snap.empty) return null;
    return snap.docs[0].id;
}

export const stripeWebhook = onRequest(
    { secrets: [stripeSecretKey, stripeWebhookSecret] },
    async (req, res) => {
        const stripe = new Stripe(stripeSecretKey.value());
        const sig = req.headers['stripe-signature'] as string;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let event: any;
        try {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
        } catch (err) {
            console.error('Webhook signature verification failed:', err);
            res.status(400).send('Webhook signature verification failed');
            return;
        }

        const db = getFirestore();

        switch (event.type as string) {
            case 'checkout.session.completed': {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const session = event.data.object as any;
                if (session.mode !== 'subscription') break;

                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;
                const uid: string | null = session.metadata?.firebaseUid
                    ?? await getUidByCustomerId(db, customerId);

                if (!uid) {
                    console.error('checkout.session.completed: could not find uid for customer', customerId);
                    break;
                }

                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const priceId = subscription.items.data[0]?.price.id ?? '';
                const plan: PlanId = PRICE_TO_PLAN[priceId] ?? 'basic';

                await db.collection('users').doc(uid).set({
                    subscription: {
                        plan,
                        status: subscription.status,
                        stripeCustomerId: customerId,
                        stripeSubscriptionId: subscriptionId,
                        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    },
                }, { merge: true });

                break;
            }

            case 'customer.subscription.updated': {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const subscription = event.data.object as any;
                const customerId = subscription.customer as string;
                const uid: string | null = subscription.metadata?.firebaseUid
                    ?? await getUidByCustomerId(db, customerId);

                if (!uid) {
                    console.error('subscription.updated: could not find uid for customer', customerId);
                    break;
                }

                const priceId = subscription.items?.data[0]?.price?.id ?? '';
                const plan: PlanId = PRICE_TO_PLAN[priceId] ?? 'basic';

                await db.collection('users').doc(uid).set({
                    subscription: {
                        plan,
                        status: subscription.status,
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    },
                }, { merge: true });

                break;
            }

            case 'customer.subscription.deleted': {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const subscription = event.data.object as any;
                const customerId = subscription.customer as string;
                const uid: string | null = subscription.metadata?.firebaseUid
                    ?? await getUidByCustomerId(db, customerId);

                if (!uid) break;

                await db.collection('users').doc(uid).set({
                    subscription: {
                        plan: 'basic',
                        status: 'canceled',
                        stripeSubscriptionId: FieldValue.delete(),
                        currentPeriodEnd: FieldValue.delete(),
                        cancelAtPeriodEnd: FieldValue.delete(),
                    },
                }, { merge: true });

                break;
            }

            case 'invoice.payment_failed': {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const invoice = event.data.object as any;
                const customerId = invoice.customer as string;
                const uid = await getUidByCustomerId(db, customerId);
                if (!uid) break;

                await db.collection('users').doc(uid).set({
                    subscription: { status: 'past_due' },
                }, { merge: true });

                break;
            }

            default:
                console.log(`Unhandled Stripe event type: ${event.type}`);
        }

        res.json({ received: true });
    }
);
