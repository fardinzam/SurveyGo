import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

interface SentimentResult {
    overall: 'positive' | 'neutral' | 'negative' | 'mixed';
    score: number; // -1.0 to 1.0
    distribution: { positive: number; neutral: number; negative: number }; // percentages
    topThemes: string[];
    summary: string;
    responseCount: number;
}

export const analyzeSentiment = onCall(
    { secrets: [anthropicApiKey] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be signed in.');
        }

        const { surveyId, questionId } = request.data as {
            surveyId: string;
            questionId: string;
        };

        if (!surveyId || !questionId) {
            throw new HttpsError('invalid-argument', 'surveyId and questionId are required.');
        }

        const db = getFirestore();
        const uid = request.auth.uid;

        // Verify plan is Professional
        const userDoc = await db.collection('users').doc(uid).get();
        const plan = (userDoc.data()?.subscription?.plan as string) ?? 'basic';
        if (plan !== 'professional') {
            throw new HttpsError('permission-denied', 'Sentiment analysis requires a Professional plan.');
        }

        // Verify the survey belongs to this user
        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) {
            throw new HttpsError('not-found', 'Survey not found.');
        }
        if (surveyDoc.data()?.createdBy !== uid) {
            throw new HttpsError('permission-denied', 'Access denied.');
        }

        // Fetch all text responses for this question
        const responsesSnap = await db
            .collection('responses')
            .where('surveyId', '==', surveyId)
            .get();

        const textAnswers: string[] = [];
        for (const doc of responsesSnap.docs) {
            const answers = doc.data().answers as Array<{ questionId: string; value: unknown }>;
            const match = answers?.find((a) => a.questionId === questionId);
            if (match && typeof match.value === 'string' && match.value.trim()) {
                textAnswers.push(match.value.trim());
            }
        }

        if (textAnswers.length === 0) {
            throw new HttpsError('failed-precondition', 'No text responses found for this question.');
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

        const client = new Anthropic({ apiKey: anthropicApiKey.value() });
        const message = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
        });

        const rawText = message.content[0].type === 'text' ? message.content[0].text : '{}';

        let result: SentimentResult;
        try {
            const parsed = JSON.parse(rawText);
            result = { ...parsed, responseCount: sample.length };
        } catch {
            console.error('Failed to parse Claude sentiment response:', rawText);
            throw new HttpsError('internal', 'Failed to analyze sentiment. Please try again.');
        }

        return result;
    }
);
