import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../contexts/AuthContext';
import {
    createSurvey,
    deleteSurvey,
    duplicateSurvey,
    getSurvey,
    getSurveys,
    updateSurvey,
} from '../lib/firestore';
import type { CreateSurveyInput, UpdateSurveyInput } from '../types/survey';

// ──────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────
export const surveyKeys = {
    all: ['surveys'] as const,
    list: () => [...surveyKeys.all, 'list'] as const,
    detail: (id: string) => [...surveyKeys.all, 'detail', id] as const,
};

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

/** Fetch all surveys for the current user. */
export function useSurveys() {
    const { user } = useAuthContext();
    return useQuery({
        queryKey: surveyKeys.list(),
        queryFn: () => getSurveys(user!.uid),
        enabled: !!user,
    });
}

/** Fetch a single survey by id. */
export function useSurvey(id: string | undefined) {
    return useQuery({
        queryKey: surveyKeys.detail(id ?? ''),
        queryFn: () => getSurvey(id!),
        enabled: !!id,
    });
}

// ──────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────

/** Create a new survey and invalidate the list cache. */
export function useCreateSurvey() {
    const queryClient = useQueryClient();
    const { user } = useAuthContext();

    return useMutation({
        mutationFn: (input: CreateSurveyInput) => createSurvey(user!.uid, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: surveyKeys.list() });
        },
    });
}

/** Update an existing survey. Invalidates both list and detail caches. */
export function useUpdateSurvey() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateSurveyInput }) =>
            updateSurvey(id, data),
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: surveyKeys.list() });
            queryClient.invalidateQueries({
                queryKey: surveyKeys.detail(variables.id),
            });
        },
    });
}

/** Delete a survey and remove it from cache. */
export function useDeleteSurvey() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteSurvey(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: surveyKeys.list() });
        },
    });
}

/** Duplicate a survey and refresh the list. */
export function useDuplicateSurvey() {
    const queryClient = useQueryClient();
    const { user } = useAuthContext();

    return useMutation({
        mutationFn: (surveyId: string) => duplicateSurvey(user!.uid, surveyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: surveyKeys.list() });
        },
    });
}
