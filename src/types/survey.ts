import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// ──────────────────────────────────────────
// Question types
// ──────────────────────────────────────────

export const QuestionTypeEnum = z.enum([
    'short',          // short text (single line)
    'long',           // long text / paragraph (multi-line)
    'multiple',       // multiple choice (radio — single select)
    'checkbox',       // checkboxes (multi select)
    'dropdown',       // dropdown select (single select)
    'rating',         // linear rating scale (1-N)
    'grid_multiple',  // grid — multiple choice (radio per row)
    'grid_checkbox',  // grid — checkbox (multi-select per row)
    'date',           // date picker
    'time',           // time picker
]);

export type QuestionType = z.infer<typeof QuestionTypeEnum>;

// ──────────────────────────────────────────
// Branching / conditional logic
// ──────────────────────────────────────────

export const LogicOperatorEnum = z.enum([
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'is_answered',
    'is_not_answered',
]);

export type LogicOperator = z.infer<typeof LogicOperatorEnum>;

export const LogicConditionSchema = z.object({
    questionId: z.string(),
    operator: LogicOperatorEnum,
    value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
});

export type LogicCondition = z.infer<typeof LogicConditionSchema>;

export const LogicRuleSchema = z.object({
    action: z.enum(['show', 'hide']),
    conjunction: z.enum(['and', 'or']),
    conditions: z.array(LogicConditionSchema),
});

export type LogicRule = z.infer<typeof LogicRuleSchema>;

// ──────────────────────────────────────────
// Question schema
// ──────────────────────────────────────────

export const QuestionSchema = z.object({
    id: z.string(),
    type: QuestionTypeEnum,
    text: z.string(),
    required: z.boolean().default(false),
    options: z
        .object({
            scale: z.number().optional(),              // for rating (default 5, max 10)
            choices: z.array(z.string()).optional(),    // for multiple / checkbox / dropdown
            charLimit: z.number().optional(),           // for short / long answer
            rows: z.array(z.string()).optional(),       // for grid types (row labels)
            columns: z.array(z.string()).optional(),    // for grid types (column labels)
            imageUrl: z.string().optional(),            // optional image attachment
            lowLabel: z.string().optional(),            // rating scale low endpoint label
            highLabel: z.string().optional(),           // rating scale high endpoint label
        })
        .optional(),
    logic: LogicRuleSchema.optional(),                 // conditional display rule
});

export type Question = z.infer<typeof QuestionSchema>;

// ──────────────────────────────────────────
// Survey Settings (Style / Logic / Settings)
// ──────────────────────────────────────────

export interface SurveySettings {
    // Style
    fontFamily: string;              // default 'Inter'
    accentColor: string;             // default '#E2F380' (primary)
    background: string;              // 'white' | 'lightGray' | 'pattern' | hex string
    logoPlacement: string;           // 'topLeft' | 'topCenter' | 'topRight' | 'hidden'
    // Logic
    shuffleQuestions: boolean;       // randomize question order for respondents
    // Settings
    collectEmail: string;            // 'none' | 'required' | 'optional'
    sendCopy: string;                // 'off' | 'always' | 'whenRequested'
    allowEditing: boolean;           // let respondents edit after submit
    limitOneResponse: boolean;       // one response per person
    showProgressBar: boolean;        // display completion progress
    confirmationMessage: string;     // custom message after submit
}

export const DEFAULT_SURVEY_SETTINGS: SurveySettings = {
    fontFamily: 'Inter',
    accentColor: '#E2F380',
    background: 'white',
    logoPlacement: 'hidden',
    shuffleQuestions: false,
    collectEmail: 'none',
    sendCopy: 'off',
    allowEditing: false,
    limitOneResponse: true,
    showProgressBar: true,
    confirmationMessage: '',
};

// ──────────────────────────────────────────
// Survey
// ──────────────────────────────────────────

export const SurveyStatusEnum = z.enum(['draft', 'active', 'closed']);
export type SurveyStatus = z.infer<typeof SurveyStatusEnum>;

/** Shape stored in Firestore (timestamps are Firestore Timestamp objects). */
export interface Survey {
    id: string;
    title: string;
    description: string;
    status: SurveyStatus;
    questions: Question[];
    createdBy: string;            // uid
    createdAt: Timestamp;
    updatedAt: Timestamp;
    publishedAt: Timestamp | null;
    responseCount: number;
    lastReadResponseCount: number;
    headerImageUrl?: string;       // base64 data URL
    settings?: SurveySettings;
}

/** Convenient client-side version with JS dates. */
export interface SurveyClient {
    id: string;
    title: string;
    description: string;
    status: SurveyStatus;
    questions: Question[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date | null;
    responseCount: number;
    lastReadResponseCount: number;
    headerImageUrl?: string;
    settings?: SurveySettings;
}

// ──────────────────────────────────────────
// Helpers to convert Firestore ↔ client
// ──────────────────────────────────────────

export function toSurveyClient(survey: Survey): SurveyClient {
    return {
        ...survey,
        createdAt: survey.createdAt.toDate(),
        updatedAt: survey.updatedAt.toDate(),
        publishedAt: survey.publishedAt?.toDate() ?? null,
        lastReadResponseCount: survey.lastReadResponseCount ?? 0,
        // Migrate legacy question types
        questions: (survey.questions ?? []).map((q) => {
            // Legacy 'rating' type → 'rating' (still valid, just ensure scale default)
            if (q.type === 'rating' && !q.options?.scale) {
                return { ...q, options: { ...q.options, scale: 5 } };
            }
            return q;
        }),
    };
}

// ──────────────────────────────────────────
// Schemas for create / update payloads
// ──────────────────────────────────────────

export const CreateSurveySchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().default(''),
    questions: z.array(QuestionSchema).default([]),
    headerImageUrl: z.string().optional(),
    settings: z.any().optional(),
});

export type CreateSurveyInput = z.infer<typeof CreateSurveySchema>;

export const UpdateSurveySchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: SurveyStatusEnum.optional(),
    questions: z.array(QuestionSchema).optional(),
    headerImageUrl: z.string().optional(),
    settings: z.any().optional(),
});

export type UpdateSurveyInput = z.infer<typeof UpdateSurveySchema>;

// ──────────────────────────────────────────
// Response types
// ──────────────────────────────────────────

export interface Answer {
    questionId: string;
    value: string | number | string[] | Record<string, string | string[]>;
}

/** Shape stored in Firestore (timestamps are Firestore Timestamp objects). */
export interface SurveyResponse {
    id: string;
    surveyId: string;
    answers: Answer[];
    submittedAt: Timestamp;
    respondentMetadata: {
        userAgent: string;
    };
}

/** Client-side version with JS Date. */
export interface SurveyResponseClient {
    id: string;
    surveyId: string;
    answers: Answer[];
    submittedAt: Date;
    respondentMetadata: {
        userAgent: string;
    };
}

export function toResponseClient(r: SurveyResponse): SurveyResponseClient {
    return {
        ...r,
        submittedAt: r.submittedAt.toDate(),
    };
}

/** Payload for submitting a response (public, no auth). */
export interface SubmitResponseInput {
    surveyId: string;
    answers: Answer[];
    respondentEmail?: string;
}

// ──────────────────────────────────────────
// User preferences (notification settings)
// ──────────────────────────────────────────

export interface UserPreferences {
    notifications: {
        emailNewResponses: boolean;
        weeklySummary: boolean;
        urgentAlerts: boolean;
        teamActivity: boolean;
        productUpdates: boolean;
    };
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
    notifications: {
        emailNewResponses: true,
        weeklySummary: true,
        urgentAlerts: true,
        teamActivity: false,
        productUpdates: false,
    },
};
