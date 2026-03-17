import { initializeApp } from 'firebase-admin/app';

initializeApp();

// ── Stripe ──────────────────────────────────────────────────────────────────
export { createCheckoutSession } from './stripe/createCheckoutSession';
export { createPortalSession } from './stripe/createPortalSession';
export { stripeWebhook } from './stripe/webhookHandler';

// ── Responses ────────────────────────────────────────────────────────────────
export { submitSurveyResponse } from './responses/submitResponse';

// ── Email notifications ──────────────────────────────────────────────────────
export { weeklySummary } from './email/weeklySummary';

// ── AI ───────────────────────────────────────────────────────────────────────
export { generateQuestions } from './ai/generateQuestions';
export { analyzeSentiment } from './ai/analyzeSentiment';
