"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPortalSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
exports.createPortalSession = (0, https_1.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const db = (0, firestore_1.getFirestore)();
    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const stripeCustomerId = userDoc.data()?.subscription?.stripeCustomerId;
    if (!stripeCustomerId) {
        throw new https_1.HttpsError('failed-precondition', 'No active subscription found.');
    }
    const stripe = new stripe_1.default(stripeSecretKey.value());
    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${appUrl}/app/settings`,
    });
    return { url: session.url };
});
//# sourceMappingURL=createPortalSession.js.map