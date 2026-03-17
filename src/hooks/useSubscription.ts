import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';
import type { PlanId } from '../lib/planLimits';
import { getPlanLimits } from '../lib/planLimits';

export interface SubscriptionState {
    plan: PlanId;
    status: string | null; // 'active' | 'past_due' | 'canceled' | null
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    stripeCustomerId: string | null;
    loading: boolean;
}

export function useSubscription(): SubscriptionState & { limits: ReturnType<typeof getPlanLimits> } {
    const { user } = useAuth();
    const [state, setState] = useState<SubscriptionState>({
        plan: 'basic',
        status: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        stripeCustomerId: null,
        loading: true,
    });

    useEffect(() => {
        if (!user) {
            setState((s) => ({ ...s, loading: false }));
            return;
        }

        const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            const data = snap.data();
            const sub = data?.subscription;
            setState({
                plan: (sub?.plan as PlanId) ?? 'basic',
                status: sub?.status ?? null,
                cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
                currentPeriodEnd: sub?.currentPeriodEnd?.toDate?.() ?? null,
                stripeCustomerId: sub?.stripeCustomerId ?? null,
                loading: false,
            });
        });

        return unsub;
    }, [user]);

    return { ...state, limits: getPlanLimits(state.plan) };
}
