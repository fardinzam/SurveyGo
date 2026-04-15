import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    onSnapshot,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Survey, SurveyClient, CreateSurveyInput, UpdateSurveyInput, SurveyResponse, SurveyResponseClient, UserPreferences } from '../types/survey';
import { toSurveyClient, toResponseClient, DEFAULT_USER_PREFERENCES } from '../types/survey';

// ──────────────────────────────────────────
// Surveys collection
// ──────────────────────────────────────────

const surveysCol = () => collection(db, 'surveys');

/**
 * Create a new survey for the given user.
 * Returns the Firestore document id.
 */
export async function createSurvey(
    uid: string,
    input: CreateSurveyInput
): Promise<string> {
    const docRef = await addDoc(surveysCol(), {
        title: input.title,
        description: input.description ?? '',
        status: 'draft',
        questions: input.questions ?? [],
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: null,
        responseCount: 0,
        lastReadResponseCount: 0,
        headerImageUrl: input.headerImageUrl ?? '',
        settings: input.settings ?? null,
    });
    return docRef.id;
}

/**
 * Get all surveys owned by the given user, ordered by most recently updated.
 *
 * If the composite index (createdBy + updatedAt) has not been created yet,
 * we fall back to a simple where-only query with client-side sorting.
 */
export async function getSurveys(uid: string): Promise<SurveyClient[]> {
    try {
        // Preferred: server-side ordering (requires composite index)
        const q = query(
            surveysCol(),
            where('createdBy', '==', uid),
            orderBy('updatedAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) =>
            toSurveyClient({ id: d.id, ...d.data() } as Survey)
        );
    } catch (err: unknown) {
        // Firestore missing-index errors contain a URL to create it
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('index') || msg.includes('requires an index')) {
            console.warn(
                '[SurveyGo] Firestore composite index required. Falling back to client-side sorting.\n' +
                'Create the index here: ' + (msg.match(/https:\/\/\S+/) ?? ['(URL in Firestore console)'])[0]
            );
        } else {
            console.error('[SurveyGo] Error fetching surveys:', msg);
        }

        // Fallback: fetch without orderBy, sort on the client
        const fallback = query(
            surveysCol(),
            where('createdBy', '==', uid)
        );
        const snap = await getDocs(fallback);
        const surveys = snap.docs.map((d) =>
            toSurveyClient({ id: d.id, ...d.data() } as Survey)
        );
        // Sort by updatedAt descending on the client
        return surveys.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
}

/**
 * Subscribe to real-time survey updates for a user.
 * Returns an unsubscribe function.
 */
export function subscribeSurveys(
    uid: string,
    onData: (surveys: SurveyClient[]) => void,
    onError?: (err: Error) => void,
): Unsubscribe {
    const q = query(
        surveysCol(),
        where('createdBy', '==', uid),
    );
    return onSnapshot(
        q,
        (snap) => {
            const surveys = snap.docs.map((d) =>
                toSurveyClient({ id: d.id, ...d.data() } as Survey)
            );
            surveys.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            onData(surveys);
        },
        (err) => {
            console.error('[SurveyGo] subscribeSurveys error:', err);
            onError?.(err);
        },
    );
}

/**
 * Get a single survey by id.
 */
export async function getSurvey(surveyId: string): Promise<SurveyClient | null> {
    const snap = await getDoc(doc(db, 'surveys', surveyId));
    if (!snap.exists()) return null;
    return toSurveyClient({ id: snap.id, ...snap.data() } as Survey);
}

/**
 * Update fields on an existing survey.
 */
export async function updateSurvey(
    surveyId: string,
    input: UpdateSurveyInput
): Promise<void> {
    const data: Record<string, unknown> = { ...input, updatedAt: serverTimestamp() };
    // If status is being set to 'active' for the first time, record publishedAt
    if (input.status === 'active') {
        const existing = await getSurvey(surveyId);
        if (existing && !existing.publishedAt) {
            data.publishedAt = serverTimestamp();
        }
    }
    await updateDoc(doc(db, 'surveys', surveyId), data);
}

/**
 * Delete a survey by id.
 */
export async function deleteSurvey(surveyId: string): Promise<void> {
    await deleteDoc(doc(db, 'surveys', surveyId));
}

/**
 * Duplicate an existing survey (creates a new draft copy).
 */
export async function duplicateSurvey(
    uid: string,
    surveyId: string
): Promise<string> {
    const original = await getSurvey(surveyId);
    if (!original) throw new Error('Survey not found');
    return createSurvey(uid, {
        title: `${original.title} (Copy)`,
        description: original.description,
        questions: original.questions,
        headerImageUrl: original.headerImageUrl,
        settings: original.settings,
    });
}

// ──────────────────────────────────────────
// Activity / Read state
// ──────────────────────────────────────────

/**
 * Mark a survey's responses as "read" by setting lastReadResponseCount
 * to the current responseCount.
 */
export async function markSurveyAsRead(surveyId: string): Promise<void> {
    const survey = await getSurvey(surveyId);
    if (!survey) return;
    await updateDoc(doc(db, 'surveys', surveyId), {
        lastReadResponseCount: survey.responseCount,
    });
}

// ──────────────────────────────────────────
// Responses collection
// ──────────────────────────────────────────

const responsesCol = () => collection(db, 'responses');

/**
 * Read a survey by id (public — used on the respondent page, no auth).
 * Returns the raw survey data if found, otherwise null.
 */
export async function getSurveyPublic(surveyId: string): Promise<SurveyClient | null> {
    return getSurvey(surveyId);
}

/**
 * Get all responses for a given survey, ordered by most recent first.
 */
export async function getResponses(surveyId: string): Promise<SurveyResponseClient[]> {
    const q = query(
        responsesCol(),
        where('surveyId', '==', surveyId),
        orderBy('submittedAt', 'desc')
    );
    try {
        const snap = await getDocs(q);
        return snap.docs.map((d) =>
            toResponseClient({ id: d.id, ...d.data() } as SurveyResponse)
        );
    } catch {
        // Fallback: no index — client-side sort
        const fallback = query(responsesCol(), where('surveyId', '==', surveyId));
        const snap = await getDocs(fallback);
        const results = snap.docs.map((d) =>
            toResponseClient({ id: d.id, ...d.data() } as SurveyResponse)
        );
        return results.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    }
}

/**
 * Subscribe to real-time response updates for a survey.
 * Returns an unsubscribe function.
 */
export function subscribeResponses(
    surveyId: string,
    onData: (responses: SurveyResponseClient[]) => void,
    onError?: (err: Error) => void,
): Unsubscribe {
    const q = query(
        responsesCol(),
        where('surveyId', '==', surveyId),
    );
    return onSnapshot(
        q,
        (snap) => {
            const responses = snap.docs.map((d) =>
                toResponseClient({ id: d.id, ...d.data() } as SurveyResponse)
            );
            responses.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
            onData(responses);
        },
        (err) => {
            console.error('[SurveyGo] subscribeResponses error:', err);
            onError?.(err);
        },
    );
}

// ──────────────────────────────────────────
// User preferences
// ──────────────────────────────────────────

/**
 * Get user notification preferences from Firestore.
 */
export async function getUserPreferences(uid: string): Promise<UserPreferences> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return DEFAULT_USER_PREFERENCES;
    const data = snap.data();
    return data.preferences ?? DEFAULT_USER_PREFERENCES;
}

/**
 * Update user notification preferences in Firestore.
 */
export async function updateUserPreferences(uid: string, prefs: UserPreferences): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
        preferences: prefs,
        updatedAt: serverTimestamp(),
    });
}
