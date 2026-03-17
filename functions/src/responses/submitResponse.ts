import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Plan response limits — keep in sync with src/lib/planLimits.ts on the client
const RESPONSE_LIMITS: Record<string, number> = {
    basic: 100,
    standard: 1000,
    professional: Infinity,
};

export const submitSurveyResponse = onRequest(
    {
        cors: true,
    },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
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

        // 5. Trigger email notification if owner opted in
        const prefs = userDoc.data()?.preferences?.notifications;
        if (prefs?.emailNewResponses && userDoc.data()?.email) {
            // Import inline to avoid circular dependency issues
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

        // 6. Urgent alert: notify on response count milestones
        const newCount = currentCount + 1;
        const milestones = [100, 500, 1000, 5000];
        if (milestones.includes(newCount) && prefs?.urgentAlerts && userDoc.data()?.email) {
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
