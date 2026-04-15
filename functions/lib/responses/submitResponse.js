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
// ── Rate Limiting ────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX = 5; // max 5 submissions per IP per minute
const SURVEY_COOLDOWN_MS = 30000; // 30 seconds between submissions to the same survey per IP
const EMAIL_CAP_WINDOW_MS = 3600000; // 1 hour
const EMAIL_CAP_MAX = 10; // max 10 notification emails per survey per hour
const CLEANUP_INTERVAL_MS = 300000; // clean up expired entries every 5 minutes
// In-memory rate limit stores (reset on cold start, which is fine for abuse protection)
const ipHits = new Map();
const surveyCooldowns = new Map(); // key: `${ip}:${surveyId}` → expiry timestamp
const emailCounts = new Map(); // key: surveyId
// Periodic cleanup of expired entries to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of ipHits)
        if (val.resetAt <= now)
            ipHits.delete(key);
    for (const [key, expiry] of surveyCooldowns)
        if (expiry <= now)
            surveyCooldowns.delete(key);
    for (const [key, val] of emailCounts)
        if (val.resetAt <= now)
            emailCounts.delete(key);
}, CLEANUP_INTERVAL_MS);
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        ?? req.ip
        ?? 'unknown';
}
function isRateLimited(ip) {
    const now = Date.now();
    const entry = ipHits.get(ip);
    if (!entry || entry.resetAt <= now) {
        ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }
    entry.count++;
    return entry.count > RATE_LIMIT_MAX;
}
function isSurveyCooldownActive(ip, surveyId) {
    const key = `${ip}:${surveyId}`;
    const expiry = surveyCooldowns.get(key);
    if (expiry && expiry > Date.now())
        return true;
    surveyCooldowns.set(key, Date.now() + SURVEY_COOLDOWN_MS);
    return false;
}
function canSendEmail(surveyId) {
    const now = Date.now();
    const entry = emailCounts.get(surveyId);
    if (!entry || entry.resetAt <= now) {
        emailCounts.set(surveyId, { count: 1, resetAt: now + EMAIL_CAP_WINDOW_MS });
        return true;
    }
    if (entry.count >= EMAIL_CAP_MAX)
        return false;
    entry.count++;
    return true;
}
// ── Handler ──────────────────────────────────────────────────────────────────
exports.submitSurveyResponse = (0, https_1.onRequest)({
    cors: true,
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    // Rate limiting checks
    const clientIp = getClientIp(req);
    if (isRateLimited(clientIp)) {
        res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
        return;
    }
    const { surveyId, answers, respondentEmail, } = req.body;
    if (!surveyId || !answers) {
        res.status(400).json({ error: 'surveyId and answers are required.' });
        return;
    }
    if (isSurveyCooldownActive(clientIp, surveyId)) {
        res.status(429).json({ error: 'Please wait before submitting another response to this survey.' });
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
    // 5. Trigger email notification if owner opted in (with email cap)
    const prefs = userDoc.data()?.preferences?.notifications;
    if (prefs?.emailNewResponses && userDoc.data()?.email && canSendEmail(surveyId)) {
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
    // 6. Urgent alert: notify on response count milestones (with email cap)
    const newCount = currentCount + 1;
    const milestones = [100, 500, 1000, 5000];
    if (milestones.includes(newCount) && prefs?.urgentAlerts && userDoc.data()?.email && canSendEmail(surveyId)) {
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