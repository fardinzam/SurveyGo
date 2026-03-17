"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitSurveyResponse = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
// Plan response limits — keep in sync with src/lib/planLimits.ts on the client
const RESPONSE_LIMITS = {
    basic: 100,
    standard: 1000,
    professional: Infinity,
};
exports.submitSurveyResponse = (0, https_1.onRequest)({
    cors: true,
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { surveyId, answers, respondentEmail, } = req.body;
    if (!surveyId || !answers) {
        res.status(400).json({ error: 'surveyId and answers are required.' });
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    // 1. Verify survey exists and is active
    const surveyDoc = await db.collection('surveys').doc(surveyId).get();
    if (!surveyDoc.exists) {
        res.status(404).json({ error: 'Survey not found.' });
        return;
    }
    const survey = surveyDoc.data();
    if (survey.status !== 'active') {
        res.status(400).json({ error: 'Survey is not accepting responses.' });
        return;
    }
    // 2. Check response limit based on survey owner's plan
    const ownerUid = survey.createdBy;
    const userDoc = await db.collection('users').doc(ownerUid).get();
    const plan = userDoc.data()?.subscription?.plan ?? 'basic';
    const limit = RESPONSE_LIMITS[plan] ?? RESPONSE_LIMITS.basic;
    const currentCount = survey.responseCount ?? 0;
    if (currentCount >= limit) {
        res.status(429).json({ error: 'This survey has reached its response limit.' });
        return;
    }
    // 3. Write response to Firestore via Admin SDK
    const responseRef = await db.collection('responses').add({
        surveyId,
        answers,
        submittedAt: firestore_1.FieldValue.serverTimestamp(),
        ...(respondentEmail ? { respondentEmail } : {}),
        respondentMetadata: {
            userAgent: req.headers['user-agent'] ?? '',
        },
    });
    // 4. Increment survey response count
    await db.collection('surveys').doc(surveyId).update({
        responseCount: firestore_1.FieldValue.increment(1),
    });
    // 5. Trigger email notification if owner opted in
    const prefs = userDoc.data()?.preferences?.notifications;
    if (prefs?.emailNewResponses && userDoc.data()?.email) {
        // Import inline to avoid circular dependency issues
        const { sendNewResponseEmail } = await Promise.resolve().then(() => __importStar(require('../email/sendEmail')));
        await sendNewResponseEmail({
            toEmail: userDoc.data().email,
            surveyTitle: survey.title,
            surveyId,
            responseId: responseRef.id,
            responseCount: currentCount + 1,
        }).catch((err) => {
            // Non-fatal — log but don't fail the submission
            console.error('Failed to send new response email:', err);
        });
    }
    // 6. Urgent alert: notify on response count milestones
    const newCount = currentCount + 1;
    const milestones = [100, 500, 1000, 5000];
    if (milestones.includes(newCount) && prefs?.urgentAlerts && userDoc.data()?.email) {
        const { sendMilestoneEmail } = await Promise.resolve().then(() => __importStar(require('../email/sendEmail')));
        await sendMilestoneEmail({
            toEmail: userDoc.data().email,
            surveyTitle: survey.title,
            surveyId,
            milestoneCount: newCount,
        }).catch((err) => {
            console.error('Failed to send milestone email:', err);
        });
    }
    res.status(200).json({ success: true, responseId: responseRef.id });
});
//# sourceMappingURL=submitResponse.js.map