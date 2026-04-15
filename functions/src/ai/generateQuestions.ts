import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

const MONTHLY_LIMIT_STANDARD = 10; // Standard plan: 10 AI requests per month

type QuestionType = 'multiple-choice' | 'checkbox' | 'short-answer' | 'long-answer' | 'rating' | 'yes-no';

interface GeneratedQuestion {
    type: QuestionType;
    text: string;
    required: boolean;
    options?: string[];
}

export const generateQuestions = onCall(
    { secrets: [anthropicApiKey], cors: true, invoker: 'public' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be signed in.');
        }

        const { surveyTitle, surveyDescription, existingQuestions, userPrompt } = request.data as {
            surveyTitle: string;
            surveyDescription?: string;
            existingQuestions?: Array<{ text: string; type: string }>;
            userPrompt: string;
        };

        if (!surveyTitle || !userPrompt) {
            throw new HttpsError('invalid-argument', 'surveyTitle and userPrompt are required.');
        }

        const db = getFirestore();
        const uid = request.auth.uid;

        // Check plan tier
        const userDoc = await db.collection('users').doc(uid).get();
        const plan = (userDoc.data()?.subscription?.plan as string) ?? 'basic';

        if (plan === 'basic') {
            throw new HttpsError('permission-denied', 'AI features require a Standard or Professional plan.');
        }

        // Enforce monthly usage cap for Standard plan
        if (plan === 'standard') {
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const usage = userDoc.data()?.aiUsage;
            const currentCount = (usage?.month === monthKey ? usage.count : 0) as number;

            if (currentCount >= MONTHLY_LIMIT_STANDARD) {
                throw new HttpsError(
                    'resource-exhausted',
                    `You've used all ${MONTHLY_LIMIT_STANDARD} AI requests for this month. Upgrade to Professional for unlimited access.`
                );
            }
        }

        // Build context for Claude
        const existingQuestionsText = existingQuestions?.length
            ? `\n\nExisting questions:\n${existingQuestions.map((q, i) => `${i + 1}. [${q.type}] ${q.text}`).join('\n')}`
            : '';

        const systemPrompt = `You are a survey design expert. Generate survey questions based on the user's request.
Return ONLY a valid JSON array of question objects. Each object must have:
- "type": one of "multiple-choice", "checkbox", "short-answer", "long-answer", "rating", "yes-no"
- "text": the question text
- "required": boolean
- "options": array of strings (required only for "multiple-choice" and "checkbox" types, 2-6 options)

Keep questions clear, concise, and unbiased. Match the tone to the survey context.`;

        const userMessage = `Survey title: ${surveyTitle}${surveyDescription ? `\nDescription: ${surveyDescription}` : ''}${existingQuestionsText}

User request: ${userPrompt}

Return only the JSON array, no other text.`;

        const client = new Anthropic({ apiKey: anthropicApiKey.value() });

        const message = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
        });

        const rawText = message.content[0].type === 'text' ? message.content[0].text : '[]';

        let questions: GeneratedQuestion[];
        try {
            questions = JSON.parse(rawText);
            if (!Array.isArray(questions)) throw new Error('Not an array');
        } catch {
            console.error('Failed to parse Claude response:', rawText);
            throw new HttpsError('internal', 'Failed to generate questions. Please try again.');
        }

        // Increment usage count
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const currentMonthKey = userDoc.data()?.aiUsage?.month;

        if (currentMonthKey === monthKey) {
            await db.collection('users').doc(uid).update({
                'aiUsage.count': FieldValue.increment(1),
            });
        } else {
            await db.collection('users').doc(uid).update({
                aiUsage: { month: monthKey, count: 1 },
            });
        }

        return { questions };
    }
);
