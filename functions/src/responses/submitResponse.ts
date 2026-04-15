import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Plan response limits — keep in sync with src/lib/planLimits.ts on the client
const RESPONSE_LIMITS: Record<string, number> = {
    basic: 100,
    standard: 1000,
    professional: Infinity,
};

// ── Rate Limiting ────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;       // 1 minute
const RATE_LIMIT_MAX = 5;                  // max 5 submissions per IP per minute
const SURVEY_COOLDOWN_MS = 30_000;         // 30 seconds between submissions to the same survey per IP
const EMAIL_CAP_WINDOW_MS = 3_600_000;     // 1 hour
const EMAIL_CAP_MAX = 10;                  // max 10 notification emails per survey per hour
const CLEANUP_INTERVAL_MS = 300_000;       // clean up expired entries every 5 minutes

// In-memory rate limit stores (reset on cold start, which is fine for abuse protection)
const ipHits: Map<string, { count: number; resetAt: number }> = new Map();
const surveyCooldowns: Map<string, number> = new Map(); // key: `${ip}:${surveyId}` → expiry timestamp
const emailCounts: Map<string, { count: number; resetAt: number }> = new Map(); // key: surveyId

// Periodic cleanup of expired entries to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of ipHits) if (val.resetAt <= now) ipHits.delete(key);
    for (const [key, expiry] of surveyCooldowns) if (expiry <= now) surveyCooldowns.delete(key);
    for (const [key, val] of emailCounts) if (val.resetAt <= now) emailCounts.delete(key);
}, CLEANUP_INTERVAL_MS);

function getClientIp(req: import('firebase-functions/v2/https').Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        ?? req.ip
        ?? 'unknown';
}

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = ipHits.get(ip);
    if (!entry || entry.resetAt <= now) {
        ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }
    entry.count++;
    return entry.count > RATE_LIMIT_MAX;
}

function isSurveyCooldownActive(ip: string, surveyId: string): boolean {
    const key = `${ip}:${surveyId}`;
    const expiry = surveyCooldowns.get(key);
    if (expiry && expiry > Date.now()) return true;
    surveyCooldowns.set(key, Date.now() + SURVEY_COOLDOWN_MS);
    return false;
}

function canSendEmail(surveyId: string): boolean {
    const now = Date.now();
    const entry = emailCounts.get(surveyId);
    if (!entry || entry.resetAt <= now) {
        emailCounts.set(surveyId, { count: 1, resetAt: now + EMAIL_CAP_WINDOW_MS });
        return true;
    }
    if (entry.count >= EMAIL_CAP_MAX) return false;
    entry.count++;
    return true;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export const submitSurveyResponse = onRequest(
    {
        cors: true,
    },
    async (req, res) => {
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

        const {
            surveyId,
            answers,
            respondentEmail,
        } = req.body as {
            surveyId: string;
            answers: Array<{ questionId: string; value: unknown }>;
            respondentEmail?: string;
        };

        if (!surveyId || !answers) {
            res.status(400).json({ error: 'surveyId and answers are required.' });
            return;
        }

        if (isSurveyCooldownActive(clientIp, surveyId)) {
            res.status(429).json({ error: 'Please wait before submitting another response to this survey.' });
            return;
        }

        const db = getFirestore();

        // 1. Verify survey exists and is active
        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) {
            res.status(404).json({ error: 'Survey not found.' });
            return;
        }
        const survey = surveyDoc.data()!;
        if (survey.status !== 'active') {
            res.status(400).json({ error: 'Survey is not accepting responses.' });
            return;
        }

        // 2. Check response limit based on survey owner's plan
        const ownerUid = survey.createdBy as string;
        const userDoc = await db.collection('users').doc(ownerUid).get();
        const plan = (userDoc.data()?.subscription?.plan as string) ?? 'basic';
        const limit = RESPONSE_LIMITS[plan] ?? RESPONSE_LIMITS.basic;
        const currentCount = (survey.responseCount as number) ?? 0;

        if (currentCount >= limit) {
            res.status(429).json({ error: 'This survey has reached its response limit.' });
            return;
        }

        // 3. Write response to Firestore via Admin SDK
        const responseRef = await db.collection('responses').add({
            surveyId,
            answers,
            submittedAt: FieldValue.serverTimestamp(),
            ...(respondentEmail ? { respondentEmail } : {}),
            respondentMetadata: {
                userAgent: req.headers['user-agent'] ?? '',
            },
        });

        // 4. Increment survey response count
        await db.collection('surveys').doc(surveyId).update({
            responseCount: FieldValue.increment(1),
        });

        // 5. Trigger email notification if owner opted in (with email cap)
        const prefs = userDoc.data()?.preferences?.notifications;
        if (prefs?.emailNewResponses && userDoc.data()?.email && canSendEmail(surveyId)) {
            const { sendNewResponseEmail } = await import('../email/sendEmail');
            await sendNewResponseEmail({
                toEmail: userDoc.data()!.email as string,
                surveyTitle: survey.title as string,
                surveyId,
                responseId: responseRef.id,
                responseCount: currentCount + 1,
            }).catch((err: unknown) => {
                // Non-fatal — log but don't fail the submission
                console.error('Failed to send new response email:', err);
            });
        }

        // 6. Urgent alert: notify on response count milestones (with email cap)
        const newCount = currentCount + 1;
        const milestones = [100, 500, 1000, 5000];
        if (milestones.includes(newCount) && prefs?.urgentAlerts && userDoc.data()?.email && canSendEmail(surveyId)) {
            const { sendMilestoneEmail } = await import('../email/sendEmail');
            await sendMilestoneEmail({
                toEmail: userDoc.data()!.email as string,
                surveyTitle: survey.title as string,
                surveyId,
                milestoneCount: newCount,
            }).catch((err: unknown) => {
                console.error('Failed to send milestone email:', err);
            });
        }

        res.status(200).json({ success: true, responseId: responseRef.id });
    }
);
