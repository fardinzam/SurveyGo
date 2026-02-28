import { useQuery } from '@tanstack/react-query';
import { getResponses } from '../lib/firestore';

// ──────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────
export const responseKeys = {
    all: ['responses'] as const,
    list: (surveyId: string) => [...responseKeys.all, 'list', surveyId] as const,
};

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

/** Fetch all responses for a specific survey. */
export function useResponses(surveyId: string | undefined) {
    return useQuery({
        queryKey: responseKeys.list(surveyId ?? ''),
        queryFn: () => getResponses(surveyId!),
        enabled: !!surveyId,
    });
}
