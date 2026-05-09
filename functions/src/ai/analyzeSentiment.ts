import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

interface SentimentResult {
    overall: 'positive' | 'neutral' | 'negative' | 'mixed';
    score: number;
    distribution: { positive: number; neutral: number; negative: number };
    topThemes: string[];
    summary: string;
    responseCount: number;
}

const POSITIVE_WORDS = [
    'good', 'great', 'excellent', 'love', 'amazing', 'fantastic', 'helpful',
    'easy', 'fast', 'perfect', 'best', 'wonderful', 'happy', 'satisfied',
    'recommend', 'awesome', 'outstanding', 'clear', 'simple', 'intuitive',
];

const NEGATIVE_WORDS = [
    'bad', 'poor', 'terrible', 'difficult', 'slow', 'confusing', 'frustrating',
    'broken', 'worse', 'hate', 'disappoint', 'issue', 'problem', 'fail',
    'horrible', 'awful', 'useless', 'complicated', 'unclear', 'annoying',
];

// Keyword-based sentiment analysis — no AI API calls (sandbox portfolio mode).
// To swap in real Anthropic calls later, replace this function body with the
// SDK call and remove the stub.
function computeMockSentiment(responses: string[]): SentimentResult {
    let posCount = 0;
    let negCount = 0;

    for (const r of responses) {
        const lower = r.toLowerCase();
        const hasPos = POSITIVE_WORDS.some(w => lower.includes(w));
        const hasNeg = NEGATIVE_WORDS.some(w => lower.includes(w));
        if (hasPos && !hasNeg) posCount++;
        else if (hasNeg && !hasPos) negCount++;
    }

    const total = responses.length;
    const posP = Math.round((posCount / total) * 100);
    const negP = Math.round((negCount / total) * 100);
    const neuP = Math.max(0, 100 - posP - negP);

    const score = parseFloat(((posCount - negCount) / total).toFixed(2));
    const overall: SentimentResult['overall'] =
        score >= 0.3 ? 'positive' :
        score <= -0.3 ? 'negative' :
        posP >= 25 && negP >= 25 ? 'mixed' : 'neutral';

    const sentimentLabel =
        overall === 'positive' ? 'largely positive' :
        overall === 'negative' ? 'largely negative' :
        overall === 'mixed' ? 'mixed' : 'neutral';

    const strengthNote = posCount > negCount
        ? 'Respondents highlight ease of use and positive interactions as key strengths.'
        : 'Common concerns include usability and feature gaps.';

    return {
        overall,
        score,
        distribution: { positive: posP, neutral: neuP, negative: negP },
        topThemes: ['User experience', 'Ease of use', 'Performance', 'Feature requests'],
        summary: `Across ${total} response${total === 1 ? '' : 's'}, feedback is ${sentimentLabel}. ${strengthNote} Review open-ended responses for more specific actionable insights.`,
        responseCount: total,
    };
}

export const analyzeSentiment = onCall(
    { cors: true, invoker: 'public' },
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

        const userDoc = await db.collection('users').doc(uid).get();
        const plan = (userDoc.data()?.subscription?.plan as string) ?? 'basic';
        if (plan !== 'professional') {
            throw new HttpsError('permission-denied', 'Sentiment analysis requires a Professional plan.');
        }

        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) {
            throw new HttpsError('not-found', 'Survey not found.');
        }
        if (surveyDoc.data()?.createdBy !== uid) {
            throw new HttpsError('permission-denied', 'Access denied.');
        }

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

        const sample = textAnswers.slice(0, 200);
        return computeMockSentiment(sample);
    }
);
