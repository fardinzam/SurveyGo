"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuestions = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const MONTHLY_LIMIT_STANDARD = 10;
// Deterministic mock — no AI API calls (sandbox portfolio mode).
// To swap in real Anthropic calls later, replace this function body with the
// SDK call and remove the stub.
function buildMockQuestions(surveyTitle, userPrompt) {
    const ctx = `${surveyTitle} ${userPrompt}`.toLowerCase();
    const has = (...words) => words.some(w => ctx.includes(w));
    if (has('satisf', 'happy', 'experienc', 'enjoy', 'feel')) {
        return [
            { type: 'rating', text: `How would you rate your overall experience with ${surveyTitle}?`, required: true },
            { type: 'multiple-choice', text: 'Which aspect matters most to you?', required: true, options: ['Quality', 'Speed', 'Support', 'Value', 'Ease of use'] },
            { type: 'yes-no', text: 'Would you recommend this to a colleague or friend?', required: true },
        ];
    }
    if (has('product', 'feature', 'software', 'app', 'tool', 'platform')) {
        return [
            { type: 'checkbox', text: 'Which features do you use regularly? (Select all that apply)', required: false, options: ['Dashboard', 'Reports', 'Integrations', 'Notifications', 'API'] },
            { type: 'rating', text: 'How easy is it to get started with the product?', required: true },
            { type: 'multiple-choice', text: 'How often do you use the product?', required: true, options: ['Daily', 'A few times a week', 'Once a week', 'A few times a month', 'Rarely'] },
        ];
    }
    if (has('feedback', 'improv', 'suggest', 'better', 'opinion')) {
        return [
            { type: 'rating', text: `On a scale of 1–10, how likely are you to recommend ${surveyTitle}?`, required: true },
            { type: 'multiple-choice', text: 'Which area needs the most improvement?', required: true, options: ['Performance', 'Usability', 'Support', 'Pricing', 'Documentation'] },
            { type: 'short-answer', text: 'What is the single biggest pain point you face?', required: false },
        ];
    }
    if (has('employee', 'team', 'staff', 'workplace', 'work', 'job', 'engag')) {
        return [
            { type: 'rating', text: 'How satisfied are you with your current role?', required: true },
            { type: 'multiple-choice', text: 'How would you describe your team environment?', required: true, options: ['Collaborative', 'Independent', 'Fast-paced', 'Structured', 'Flexible'] },
            { type: 'yes-no', text: 'Do you feel your contributions are recognized?', required: true },
        ];
    }
    if (has('event', 'conference', 'workshop', 'webinar', 'session', 'training')) {
        return [
            { type: 'rating', text: 'How would you rate the overall event?', required: true },
            { type: 'multiple-choice', text: 'Which session was most valuable to you?', required: false, options: ['Keynote', 'Workshops', 'Networking', 'Panels', 'Q&A'] },
            { type: 'yes-no', text: 'Would you attend a future event like this?', required: true },
        ];
    }
    return [
        { type: 'rating', text: 'How would you rate your overall experience?', required: true },
        { type: 'multiple-choice', text: 'How did you hear about us?', required: false, options: ['Social media', 'Word of mouth', 'Search engine', 'Advertisement', 'Other'] },
        { type: 'short-answer', text: 'What would make this better?', required: false },
    ];
}
exports.generateQuestions = (0, https_1.onCall)({ cors: true, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { surveyTitle, userPrompt } = request.data;
    if (!surveyTitle || !userPrompt) {
        throw new https_1.HttpsError('invalid-argument', 'surveyTitle and userPrompt are required.');
    }
    const db = (0, firestore_1.getFirestore)();
    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const plan = userDoc.data()?.subscription?.plan ?? 'basic';
    if (plan === 'basic') {
        throw new https_1.HttpsError('permission-denied', 'AI features require a Standard or Professional plan.');
    }
    if (plan === 'standard') {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const usage = userDoc.data()?.aiUsage;
        const currentCount = (usage?.month === monthKey ? usage.count : 0);
        if (currentCount >= MONTHLY_LIMIT_STANDARD) {
            throw new https_1.HttpsError('resource-exhausted', `You've used all ${MONTHLY_LIMIT_STANDARD} AI requests for this month. Upgrade to Professional for unlimited access.`);
        }
    }
    const questions = buildMockQuestions(surveyTitle, userPrompt);
    // Increment usage counter so the monthly cap UX demos correctly
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthKey = userDoc.data()?.aiUsage?.month;
    if (currentMonthKey === monthKey) {
        await db.collection('users').doc(uid).update({ 'aiUsage.count': firestore_1.FieldValue.increment(1) });
    }
    else {
        await db.collection('users').doc(uid).update({ aiUsage: { month: monthKey, count: 1 } });
    }
    return { questions };
});
//# sourceMappingURL=generateQuestions.js.map