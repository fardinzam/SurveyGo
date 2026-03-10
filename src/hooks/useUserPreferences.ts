import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../contexts/AuthContext';
import { getUserPreferences, updateUserPreferences } from '../lib/firestore';
import type { UserPreferences } from '../types/survey';

export function useUserPreferences() {
    const { user } = useAuthContext();
    return useQuery({
        queryKey: ['userPreferences', user?.uid],
        queryFn: () => getUserPreferences(user!.uid),
        enabled: !!user,
    });
}

export function useUpdateUserPreferences() {
    const queryClient = useQueryClient();
    const { user } = useAuthContext();

    return useMutation({
        mutationFn: (prefs: UserPreferences) => updateUserPreferences(user!.uid, prefs),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
        },
    });
}
