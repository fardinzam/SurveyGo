"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingData = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
exports.getBillingData = (0, https_1.onCall)({ secrets: [stripeSecretKey], cors: true, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    let stripeCustomerId;
    try {
        const db = (0, firestore_1.getFirestore)();
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        stripeCustomerId = userDoc.data()?.subscription?.stripeCustomerId;
    }
    catch {
        throw new https_1.HttpsError('internal', 'Failed to load user data.');
    }
    if (!stripeCustomerId) {
        return { paymentMethod: null, invoices: [] };
    }
    const stripe = new stripe_1.default(stripeSecretKey.value());
    let paymentMethods;
    let invoiceList;
    try {
        [paymentMethods, invoiceList] = await Promise.all([
            stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card', limit: 1 }),
            stripe.invoices.list({ customer: stripeCustomerId, limit: 5 }),
        ]);
    }
    catch (err) {
        if (err instanceof stripe_1.default.errors.StripeError) {
            throw new https_1.HttpsError('internal', 'Failed to fetch billing data.');
        }
        throw err;
    }
    const pm = paymentMethods.data[0]?.card ?? null;
    const paymentMethod = pm
        ? {
            brand: pm.brand,
            last4: pm.last4,
            expMonth: pm.exp_month,
            expYear: pm.exp_year,
            name: paymentMethods.data[0].billing_details.name ?? null,
        }
        : null;
    const invoices = invoiceList.data.map((inv) => ({
        id: inv.id,
        date: inv.created,
        amount: inv.amount_paid,
        currency: inv.currency,
        status: inv.status ?? 'unknown',
        description: inv.description ?? inv.lines.data[0]?.description ?? null,
    }));
    return { paymentMethod, invoices };
});
//# sourceMappingURL=getBillingData.js.map