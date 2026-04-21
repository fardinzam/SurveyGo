export type PlanId = 'basic' | 'standard' | 'professional';

export const PLAN_LIMITS = {
    basic: {
        maxSurveys: 3,
        maxResponsesPerSurvey: 100,
        maxQuestionsPerSurvey: 5,
        aiQuestionsPerMonth: 0,
        canExport: false,
        canRemoveBranding: false,
        canCustomTheme: false,
        canBranching: false,
        canConnectApps: false,
        canAiSentiment: false,
        canSendInvites: false,
    },
    standard: {
        maxSurveys: Infinity,
        maxResponsesPerSurvey: 1000,
        maxQuestionsPerSurvey: Infinity,
        aiQuestionsPerMonth: 10,
        canExport: true,
        canRemoveBranding: true,
        canCustomTheme: true,
        canBranching: true,
        canConnectApps: true, // up to 5 apps
        canAiSentiment: false,
        canSendInvites: true,
    },
    professional: {
        maxSurveys: Infinity,
        maxResponsesPerSurvey: Infinity,
        aiQuestionsPerMonth: Infinity,
        maxQuestionsPerSurvey: Infinity,
        canExport: true,
        canRemoveBranding: true,
        canCustomTheme: true,
        canBranching: true,
        canConnectApps: true,
        canAiSentiment: true,
        canSendInvites: true,
    },
} satisfies Record<PlanId, object>;

export function getPlanLimits(plan: PlanId | string) {
    return PLAN_LIMITS[(plan as PlanId) in PLAN_LIMITS ? (plan as PlanId) : 'basic'];
}

export function canUseAI(plan: PlanId | string): boolean {
    return plan === 'standard' || plan === 'professional';
}
