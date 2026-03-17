/**
 * Typed wrappers around Firebase Callable Cloud Functions.
 * Using httpsCallable from firebase/functions (v9 modular SDK).
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app);

// ── Types ──────────────────────────────────────────────────────────────────

export interface CheckoutSessionRequest {
    planId: 'standard' | 'professional';
    billingPeriod: 'monthly' | 'yearly';
}
export interface CheckoutSessionResponse {
    url: string;
}

export interface PortalSessionResponse {
    url: string;
}

export interface GenerateQuestionsRequest {
    surveyTitle: string;
    surveyDescription?: string;
    existingQuestions?: Array<{ text: string; type: string }>;
    userPrompt: string;
}

export interface GeneratedQuestion {
    type: 'multiple-choice' | 'checkbox' | 'short-answer' | 'long-answer' | 'rating' | 'yes-no';
    text: string;
    required: boolean;
    options?: string[];
}

export interface GenerateQuestionsResponse {
    questions: GeneratedQuestion[];
}

export interface AnalyzeSentimentRequest {
    surveyId: string;
    questionId: string;
}

export interface SentimentResult {
    overall: 'positive' | 'neutral' | 'negative' | 'mixed';
    score: number;
    distribution: { positive: number; neutral: number; negative: number };
    topThemes: string[];
    summary: string;
    responseCount: number;
}

// ── Callable wrappers ──────────────────────────────────────────────────────

export const callCreateCheckoutSession = httpsCallable<CheckoutSessionRequest, CheckoutSessionResponse>(
    functions,
    'createCheckoutSession'
);

export const callCreatePortalSession = httpsCallable<void, PortalSessionResponse>(
    functions,
    'createPortalSession'
);

export const callGenerateQuestions = httpsCallable<GenerateQuestionsRequest, GenerateQuestionsResponse>(
    functions,
    'generateQuestions'
);

export const callAnalyzeSentiment = httpsCallable<AnalyzeSentimentRequest, SentimentResult>(
    functions,
    'analyzeSentiment'
);
