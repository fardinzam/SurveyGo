import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { sendWeeklySummaryEmail } from './sendEmail';

// Runs every Monday at 8 AM UTC
export const weeklySummary = onSchedule('every monday 08:00', async () => {
    const db = getFirestore();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find all users who opted into weekly summaries
    const usersSnap = await db
        .collection('users')
        .where('preferences.notifications.weeklySummary', '==', true)
        .get();

    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const email = userData.email as string | undefined;
        if (!email) continue;

        // Get all surveys owned by this user
        const surveysSnap = await db
            .collection('surveys')
            .where('createdBy', '==', userDoc.id)
            .get();

        if (surveysSnap.empty) continue;

        const summaries: Array<{
            surveyTitle: string;
            surveyId: string;
            newResponses: number;
            totalResponses: number;
        }> = [];

        for (const surveyDoc of surveysSnap.docs) {
            const surveyData = surveyDoc.data();

            // Count responses submitted in the last 7 days
            const recentSnap = await db
                .collection('responses')
                .where('surveyId', '==', surveyDoc.id)
                .where('submittedAt', '>=', oneWeekAgo)
                .get();

            if (recentSnap.size === 0) continue; // skip surveys with no activity

            summaries.push({
                surveyTitle: surveyData.title as string,
                surveyId: surveyDoc.id,
                newResponses: recentSnap.size,
                totalResponses: (surveyData.responseCount as number) ?? 0,
            });
        }

        if (summaries.length === 0) continue;

        const weekLabel = oneWeekAgo.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        }) + ' – ' + new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });

        try {
            await sendWeeklySummaryEmail({ toEmail: email, summaries, weekLabel });
        } catch (err) {
            console.error(`Failed to send weekly summary to ${email}:`, err);
        }
    }
});
