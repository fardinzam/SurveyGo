import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../contexts/AuthContext';
import {
    createSurvey,
    deleteSurvey,
    duplicateSurvey,
    getSurvey,
    getSurveys,
    subscribeSurveys,
    updateSurvey,
} from '../lib/firestore';
import type { CreateSurveyInput, UpdateSurveyInput } from '../types/survey';

export const surveyKeys = {
    all: ['surveys'] as const,
    list: () => [...surveyKeys.all, 'list'] as const,
    detail: (id: string) => [...surveyKeys.all, 'detail', id] as const,
};

/** Fetch all surveys for the current user with real-time updates. */
export function useSurveys() {
    const { user } = useAuthContext();
    const queryClient = useQueryClient();

    const result = useQuery({
        queryKey: surveyKeys.list(),
        queryFn: () => getSurveys(user!.uid),
        enabled: !!user,
    });

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeSurveys(user.uid, (surveys) => {
            queryClient.setQueryData(surveyKeys.list(), surveys);
        });
        return unsub;
    }, [user, queryClient]);

    return result;
}

export function useSurvey(id: string | undefined) {
    return useQuery({
        queryKey: surveyKeys.detail(id ?? ''),
        queryFn: () => getSurvey(id!),
        enabled: !!id,
    });
}

function invalidateAllLists(queryClient: ReturnType<typeof useQueryClient>) {
    queryClient.invalidateQueries({ queryKey: surveyKeys.all });
}

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

export function useDeleteSurvey() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteSurvey(id),
        onSuccess: () => invalidateAllLists(queryClient),
    });
}

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
