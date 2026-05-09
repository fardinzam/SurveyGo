"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const stripeWebhookSecret = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET');
// Map Stripe price IDs → plan names. Keep in sync with createCheckoutSession.ts.
// Replace these placeholder keys with your real Stripe price IDs (price_xxx, NOT prod_xxx).
// Keys = Stripe price IDs (price_xxx from your Stripe dashboard, NOT prod_xxx)
// Values = plan names in your app
const PRICE_TO_PLAN = {
    'price_1TTpne3lLNQTzVc8hko3890u': 'standard',
    'price_1TTpqR3lLNQTzVc8MJfYM2cV': 'standard',
    'price_1TTpo23lLNQTzVc8krHpy1wv': 'professional',
    'price_1TTpqC3lLNQTzVc8pGBjXxh4': 'professional',
};
async function getUidByCustomerId(db, customerId) {
    const snap = await db
        .collection('users')
        .where('subscription.stripeCustomerId', '==', customerId)
        .limit(1)
        .get();
    if (snap.empty)
        return null;
    return snap.docs[0].id;
}
exports.stripeWebhook = (0, https_1.onRequest)({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
    const stripe = new stripe_1.default(stripeSecretKey.value());
    const sig = req.headers['stripe-signature'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err);
        res.status(400).send('Webhook signature verification failed');
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    switch (event.type) {
        case 'checkout.session.completed': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const session = event.data.object;
            if (session.mode !== 'subscription')
                break;
            const customerId = session.customer;
            const subscriptionId = session.subscription;
            const uid = session.metadata?.firebaseUid
                ?? await getUidByCustomerId(db, customerId);
            if (!uid) {
                console.error('checkout.session.completed: could not find uid for customer', customerId);
                break;
            }
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0]?.price.id ?? '';
            const plan = PRICE_TO_PLAN[priceId] ?? 'basic';
            await db.collection('users').doc(uid).set({
                subscription: {
                    plan,
                    status: subscription.status,
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: subscriptionId,
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                },
            }, { merge: true });
            break;
        }
        case 'customer.subscription.updated': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subscription = event.data.object;
            const customerId = subscription.customer;
            const uid = subscription.metadata?.firebaseUid
                ?? await getUidByCustomerId(db, customerId);
            if (!uid) {
                console.error('subscription.updated: could not find uid for customer', customerId);
                break;
            }
            const priceId = subscription.items?.data[0]?.price?.id ?? '';
            const plan = PRICE_TO_PLAN[priceId] ?? 'basic';
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
            const subscription = event.data.object;
            const customerId = subscription.customer;
            const uid = subscription.metadata?.firebaseUid
                ?? await getUidByCustomerId(db, customerId);
            if (!uid)
                break;
            await db.collection('users').doc(uid).set({
                subscription: {
                    plan: 'basic',
                    status: 'canceled',
                    stripeSubscriptionId: firestore_1.FieldValue.delete(),
                    currentPeriodEnd: firestore_1.FieldValue.delete(),
                    cancelAtPeriodEnd: firestore_1.FieldValue.delete(),
                },
            }, { merge: true });
            break;
        }
        case 'invoice.payment_failed': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const invoice = event.data.object;
            const customerId = invoice.customer;
            const uid = await getUidByCustomerId(db, customerId);
            if (!uid)
                break;
            await db.collection('users').doc(uid).set({
                subscription: { status: 'past_due' },
            }, { merge: true });
            break;
        }
        default:
            console.log(`Unhandled Stripe event type: ${event.type}`);
    }
    res.json({ received: true });
});
//# sourceMappingURL=webhookHandler.js.map