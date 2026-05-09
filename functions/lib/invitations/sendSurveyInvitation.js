"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSurveyInvitation = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const sendEmail_1 = require("../email/sendEmail");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 50;
exports.sendSurveyInvitation = (0, https_1.onCall)({ cors: true, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { surveyId, recipients, subject, body } = request.data;
    if (!surveyId || !Array.isArray(recipients) || recipients.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'surveyId and at least one recipient are required.');
    }
    const db = (0, firestore_1.getFirestore)();
    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const plan = userDoc.data()?.subscription?.plan ?? 'basic';
    if (plan === 'basic') {
        throw new https_1.HttpsError('permission-denied', 'Email invitations require a Standard or Professional plan.');
    }
    const surveyDoc = await db.collection('surveys').doc(surveyId).get();
    if (!surveyDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Survey not found.');
    }
    if (surveyDoc.data()?.createdBy !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Access denied.');
    }
    const surveyTitle = surveyDoc.data()?.title || 'Survey';
    const surveyUrl = `https://surveygo-effcc.web.app/s/${surveyId}`;
    const validRecipients = recipients
        .map(e => e.trim())
        .filter(e => EMAIL_RE.test(e))
        .slice(0, MAX_RECIPIENTS);
    if (validRecipients.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'No valid email addresses provided.');
    }
    const resolvedSubject = subject?.trim() || `You're invited: "${surveyTitle}"`;
    const resolvedBody = body?.trim() ||
        `Hello,\n\nYou've been invited to complete a survey: ${surveyTitle}.\n\nClick the link below to get started:\n${surveyUrl}\n\nThank you!`;
    for (const email of validRecipients) {
        await (0, sendEmail_1.sendInvitationEmail)({
            toEmail: email,
            surveyTitle,
            surveyUrl,
            subject: resolvedSubject,
            body: resolvedBody,
        });
    }
    return { sent: validRecipients.length };
});
//# sourceMappingURL=sendSurveyInvitation.js.map