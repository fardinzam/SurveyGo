"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSentiment = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const anthropicApiKey = (0, params_1.defineSecret)('ANTHROPIC_API_KEY');
exports.analyzeSentiment = (0, https_1.onCall)({ secrets: [anthropicApiKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { surveyId, questionId } = request.data;
    if (!surveyId || !questionId) {
        throw new https_1.HttpsError('invalid-argument', 'surveyId and questionId are required.');
    }
    const db = (0, firestore_1.getFirestore)();
    const uid = request.auth.uid;
    // Verify plan is Professional
    const userDoc = await db.collection('users').doc(uid).get();
    const plan = userDoc.data()?.subscription?.plan ?? 'basic';
    if (plan !== 'professional') {
        throw new https_1.HttpsError('permission-denied', 'Sentiment analysis requires a Professional plan.');
    }
    // Verify the survey belongs to this user
    const surveyDoc = await db.collection('surveys').doc(surveyId).get();
    if (!surveyDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Survey not found.');
    }
    if (surveyDoc.data()?.createdBy !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Access denied.');
    }
    // Fetch all text responses for this question
    const responsesSnap = await db
        .collection('responses')
        .where('surveyId', '==', surveyId)
        .get();
    const textAnswers = [];
    for (const doc of responsesSnap.docs) {
        const answers = doc.data().answers;
        const match = answers?.find((a) => a.questionId === questionId);
        if (match && typeof match.value === 'string' && match.value.trim()) {
            textAnswers.push(match.value.trim());
        }
    }
    if (textAnswers.length === 0) {
        throw new https_1.HttpsError('failed-precondition', 'No text responses found for this question.');
    }
    // Limit to 200 responses to control token cost
    const sample = textAnswers.slice(0, 200);
    const systemPrompt = `You are a sentiment analysis expert. Analyze the provided survey responses and return a JSON object with:
- "overall": "positive" | "neutral" | "negative" | "mixed"
- "score": number from -1.0 (very negative) to 1.0 (very positive)
- "distribution": { "positive": number, "neutral": number, "negative": number } (percentages, must sum to 100)
- "topThemes": array of 3-5 short theme strings (e.g. "easy to use", "pricing concerns")
- "summary": 2-3 sentence plain-English summary of the sentiment patterns

Return only valid JSON, no other text.`;
    const userMessage = `Analyze these ${sample.length} survey responses:\n\n${sample.map((r, i) => `${i + 1}. "${r}"`).join('\n')}`;
    const client = new sdk_1.default({ apiKey: anthropicApiKey.value() });
    const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
    });
    const rawText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    let result;
    try {
        const parsed = JSON.parse(rawText);
        result = { ...parsed, responseCount: sample.length };
    }
    catch {
        console.error('Failed to parse Claude sentiment response:', rawText);
        throw new https_1.HttpsError('internal', 'Failed to analyze sentiment. Please try again.');
    }
    return result;
});
//# sourceMappingURL=analyzeSentiment.js.map