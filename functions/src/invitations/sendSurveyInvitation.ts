import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { sendInvitationEmail } from '../email/sendEmail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 50;

export const sendSurveyInvitation = onCall(
    { cors: true, invoker: 'public' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be signed in.');
        }

        const { surveyId, recipients, subject, body } = request.data as {
            surveyId: string;
            recipients: string[];
            subject: string;
            body: string;
        };

        if (!surveyId || !Array.isArray(recipients) || recipients.length === 0) {
            throw new HttpsError('invalid-argument', 'surveyId and at least one recipient are required.');
        }

        const db = getFirestore();
        const uid = request.auth.uid;

        const userDoc = await db.collection('users').doc(uid).get();
        const plan = (userDoc.data()?.subscription?.plan as string) ?? 'basic';
        if (plan === 'basic') {
            throw new HttpsError('permission-denied', 'Email invitations require a Standard or Professional plan.');
        }

        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) {
            throw new HttpsError('not-found', 'Survey not found.');
        }
        if (surveyDoc.data()?.createdBy !== uid) {
            throw new HttpsError('permission-denied', 'Access denied.');
        }

        const surveyTitle = (surveyDoc.data()?.title as string) || 'Survey';
        const surveyUrl = `https://surveygo-effcc.web.app/s/${surveyId}`;

        const validRecipients = recipients
            .map(e => e.trim())
            .filter(e => EMAIL_RE.test(e))
            .slice(0, MAX_RECIPIENTS);

        if (validRecipients.length === 0) {
            throw new HttpsError('invalid-argument', 'No valid email addresses provided.');
        }

        const resolvedSubject = subject?.trim() || `You're invited: "${surveyTitle}"`;
        const resolvedBody = body?.trim() ||
            `Hello,\n\nYou've been invited to complete a survey: ${surveyTitle}.\n\nClick the link below to get started:\n${surveyUrl}\n\nThank you!`;

        for (const email of validRecipients) {
            await sendInvitationEmail({
                toEmail: email,
                surveyTitle,
                surveyUrl,
                subject: resolvedSubject,
                body: resolvedBody,
            });
        }

        return { sent: validRecipients.length };
    }
);
