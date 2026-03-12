import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getResponses, subscribeResponses } from '../lib/firestore';

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

/** Fetch all responses for a specific survey with real-time updates. */
export function useResponses(surveyId: string | undefined) {
    const queryClient = useQueryClient();

    // Initial fetch via queryFn (provides loading/error states)
    const result = useQuery({
        queryKey: responseKeys.list(surveyId ?? ''),
        queryFn: () => getResponses(surveyId!),
        enabled: !!surveyId,
    });

    // Real-time listener that pushes updates into the query cache
    useEffect(() => {
        if (!surveyId) return;
        const unsub = subscribeResponses(surveyId, (responses) => {
            queryClient.setQueryData(responseKeys.list(surveyId), responses);
        });
        return unsub;
    }, [surveyId, queryClient]);

    return result;
}
