import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Loader2, AlertCircle, Calendar, Clock, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { getSurveyPublic } from '../../lib/firestore';
import { SurveyThankYou } from './SurveyThankYou';
import type { SurveyClient, Question, Answer, SurveySettings, LogicCondition } from '../../types/survey';
import { DEFAULT_SURVEY_SETTINGS } from '../../types/survey';
import { toast } from 'sonner';

interface SurveyRespondentPageProps {
    surveyId: string;
}

// ── localStorage draft key ───────────────────────
const draftKey = (surveyId: string) => `surveygo_draft_${surveyId}`;

// ── Skip-logic evaluation engine ─────────────────────

function evaluateCondition(cond: LogicCondition, answers: Record<string, unknown>): boolean {
    const val = answers[cond.questionId];
    switch (cond.operator) {
        case 'equals':
            return String(val) === String(cond.value);
        case 'not_equals':
            return String(val) !== String(cond.value);
        case 'contains':
            return Array.isArray(val) && val.includes(cond.value as string);
        case 'not_contains':
            return !Array.isArray(val) || !val.includes(cond.value as string);
        case 'is_answered':
            return val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);
        case 'is_not_answered':
            return val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
        default:
            return true;
    }
}

function isQuestionVisible(question: Question, answers: Record<string, unknown>): boolean {
    if (!question.logic || question.logic.conditions.length === 0) return true;
    const { action, conjunction, conditions } = question.logic;
    const results = conditions.map((c) => evaluateCondition(c, answers));
    const match = conjunction === 'and' ? results.every(Boolean) : results.some(Boolean);
    return action === 'show' ? match : !match;
}

const SUBMIT_FUNCTION_URL = import.meta.env.VITE_SUBMIT_FUNCTION_URL ?? '';

export function SurveyRespondentPage({ surveyId }: SurveyRespondentPageProps) {
    const [survey, setSurvey] = useState<SurveyClient | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [respondentEmail, setRespondentEmail] = useState('');
    const draftRestored = useRef(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load the survey
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getSurveyPublic(surveyId);
                if (cancelled) return;
                if (!data) {
                    setNotFound(true);
                } else {
                    setSurvey(data);
                    // Restore draft from localStorage after survey loads
                    if (!draftRestored.current) {
                        draftRestored.current = true;
                        try {
                            const saved = localStorage.getItem(draftKey(surveyId));
                            if (saved) {
                                const draft = JSON.parse(saved);
                                if (draft.answers && Object.keys(draft.answers).length > 0) {
                                    setAnswers(draft.answers);
                                    if (draft.email) setRespondentEmail(draft.email);
                                    toast.info('Draft restored', { description: 'Your previous answers have been loaded.' });
                                }
                            }
                        } catch { /* ignore corrupted draft */ }
                    }
                }
            } catch (err) {
                console.error('[SurveyGo] Error loading survey:', err);
                setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [surveyId]);

    // ── Auto-save draft to localStorage (debounced) ──
    const saveDraft = useCallback(() => {
        if (Object.keys(answers).length === 0 && !respondentEmail) return;
        try {
            localStorage.setItem(draftKey(surveyId), JSON.stringify({
                answers,
                email: respondentEmail,
                savedAt: Date.now(),
            }));
        } catch { /* localStorage full — silently ignore */ }
    }, [answers, respondentEmail, surveyId]);

    useEffect(() => {
        if (!survey || submitted) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(saveDraft, 500);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [answers, respondentEmail, survey, submitted, saveDraft]);

    // Set an answer value
    const setAnswer = (questionId: string, value: any) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
        if (errors[questionId]) {
            setErrors((prev) => { const next = { ...prev }; delete next[questionId]; return next; });
        }
    };

    // Toggle a checkbox value
    const toggleCheckbox = (questionId: string, choice: string) => {
        setAnswers((prev) => {
            const current = (prev[questionId] as string[]) || [];
            return {
                ...prev,
                [questionId]: current.includes(choice)
                    ? current.filter((c: string) => c !== choice)
                    : [...current, choice],
            };
        });
        if (errors[questionId]) {
            setErrors((prev) => { const next = { ...prev }; delete next[questionId]; return next; });
        }
    };

    // Set grid answer
    const setGridAnswer = (questionId: string, rowLabel: string, value: string | string[], isCheckbox: boolean) => {
        setAnswers((prev) => {
            const grid = { ...(prev[questionId] as Record<string, any> || {}) };
            if (isCheckbox) {
                const current = (grid[rowLabel] as string[]) || [];
                const choice = value as string;
                grid[rowLabel] = current.includes(choice)
                    ? current.filter((c: string) => c !== choice)
                    : [...current, choice];
            } else {
                grid[rowLabel] = value;
            }
            return { ...prev, [questionId]: grid };
        });
        if (errors[questionId]) {
            setErrors((prev) => { const next = { ...prev }; delete next[questionId]; return next; });
        }
    };

    // Validate required fields
    const validate = (): boolean => {
        if (!survey) return false;
        const newErrors: Record<string, string> = {};
        for (const q of survey.questions) {
            // Skip validation for hidden questions
            if (!isQuestionVisible(q, answers)) continue;
            if (!q.required) continue;
            const val = answers[q.id];
            if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
                newErrors[q.id] = 'This question is required';
            }
            // Grid validation
            if ((q.type === 'grid_multiple' || q.type === 'grid_checkbox') && q.options?.rows) {
                const grid = val as Record<string, any> || {};
                const unanswered = q.options.rows.some((row) => !grid[row] || (Array.isArray(grid[row]) && grid[row].length === 0));
                if (unanswered) {
                    newErrors[q.id] = 'Please answer all rows';
                }
            }
        }
        setErrors(newErrors);

        // Email validation
        if (survey.settings?.collectEmail === 'required' && !respondentEmail.trim()) {
            newErrors['__email'] = 'Email is required';
        } else if (respondentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(respondentEmail)) {
            newErrors['__email'] = 'Please enter a valid email';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit the response via Cloud Function
    const handleSubmit = async () => {
        if (!survey || !validate()) return;
        setSubmitting(true);
        try {
            const formattedAnswers: Answer[] = survey.questions
                .filter((q) => isQuestionVisible(q, answers) && answers[q.id] !== undefined && answers[q.id] !== '')
                .map((q) => ({
                    questionId: q.id,
                    value: answers[q.id],
                }));

            const res = await fetch(SUBMIT_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    surveyId,
                    answers: formattedAnswers,
                    ...(respondentEmail.trim() ? { respondentEmail: respondentEmail.trim() } : {}),
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
            }

            localStorage.removeItem(draftKey(surveyId));
            setSubmitted(true);
        } catch (err) {
            console.error('[SurveyGo] Error submitting response:', err);
            alert('Failed to submit response. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // --- States ---
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <Card className="max-w-md w-full p-10 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-3">Survey Not Found</h1>
                    <p className="text-muted-foreground">
                        This survey doesn't exist or is no longer available.
                    </p>
                </Card>
            </div>
        );
    }

    if (survey?.status === 'closed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <Card className="max-w-md w-full p-10 text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-orange-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-3">Form Closed</h1>
                    <p className="text-muted-foreground">
                        The form <span className="font-semibold text-foreground">{survey.title}</span> is no longer accepting responses.
                    </p>
                    <p className="text-muted-foreground text-sm mt-3">
                        Try contacting the owner of the form if you think this is a mistake.
                    </p>
                </Card>
            </div>
        );
    }

    if (submitted) {
        const accentColor = survey?.settings?.accentColor || '#E2F380';
        return <SurveyThankYou surveyTitle={survey?.title} accentColor={accentColor} />;
    }

    if (!survey) return null;

    const settings: SurveySettings = { ...DEFAULT_SURVEY_SETTINGS, ...survey.settings };
    const visibleQuestions = survey.questions.filter((q) => isQuestionVisible(q, answers));
    const answeredCount = visibleQuestions.filter(q => answers[q.id] !== undefined && answers[q.id] !== '' && answers[q.id] !== null).length;
    const progressPct = visibleQuestions.length > 0 ? (answeredCount / visibleQuestions.length) * 100 : 0;

    // Load Google Font
    const fontLink = document.querySelector('link[data-survey-font]') as HTMLLinkElement;
    const fontUrl = `https://fonts.googleapis.com/css2?family=${settings.fontFamily.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
    if (!fontLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontUrl;
        link.setAttribute('data-survey-font', 'true');
        document.head.appendChild(link);
    } else if (fontLink.href !== fontUrl) {
        fontLink.href = fontUrl;
    }

    return (
        <div
            className="min-h-screen py-12 px-4"
            style={{
                fontFamily: `'${settings.fontFamily}', sans-serif`,
                backgroundColor: settings.background.startsWith('#') ? settings.background : undefined,
                '--primary': settings.accentColor,
                '--ring': settings.accentColor,
            } as React.CSSProperties}
        >
            {/* Sticky Progress Bar */}
            {settings.showProgressBar && (
                <div
                    className="fixed top-0 left-0 right-0 z-10 px-4 pt-3 pb-2"
                    style={{ backgroundColor: settings.background.startsWith('#') ? settings.background : '#fff' }}
                >
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">{answeredCount} of {visibleQuestions.length} answered</span>
                            <span className="text-xs text-muted-foreground">{Math.round(progressPct)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                        </div>
                    </div>
                </div>
            )}

            <div className={`max-w-2xl mx-auto ${settings.showProgressBar ? 'mt-8' : ''}`}>

                {/* Header Image */}
                {survey.headerImageUrl && (
                    <div className="mb-6 rounded-xl overflow-hidden">
                        <img src={survey.headerImageUrl} alt="" className="w-full h-48 object-cover" />
                    </div>
                )}

                {/* Survey Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-3">{survey.title}</h1>
                    {survey.description && (
                        <p className="text-muted-foreground text-lg">{survey.description}</p>
                    )}
                </div>

                {/* Email collection */}
                {(settings.collectEmail === 'required' || settings.collectEmail === 'optional') && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Email address{settings.collectEmail === 'required' && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                            type="email"
                            value={respondentEmail}
                            onChange={(e) => { setRespondentEmail(e.target.value); if (errors['__email']) { setErrors((prev) => { const next = { ...prev }; delete next['__email']; return next; }); } }}
                            placeholder="Enter your email"
                            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                        {errors['__email'] && (
                            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors['__email']}
                            </p>
                        )}
                    </div>
                )}

                {/* Questions — only visible ones */}
                <div className="space-y-6">
                    {visibleQuestions.map((question, idx) => (
                        <Card key={question.id} className="p-6">
                            <div className="mb-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-sm font-medium text-muted-foreground leading-6 flex-shrink-0">{idx + 1}.</span>
                                    <div className="flex-1 min-w-0">
                                        {question.options?.imageUrl && (
                                            <img src={question.options.imageUrl} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />
                                        )}
                                        <h3 className="font-medium text-foreground break-words">
                                            {question.text}
                                            {question.required && (
                                                <span className="text-red-500 ml-1">*</span>
                                            )}
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            <QuestionInput
                                question={question}
                                value={answers[question.id]}
                                onChange={(val) => setAnswer(question.id, val)}
                                onToggleCheckbox={(choice) => toggleCheckbox(question.id, choice)}
                                onGridChange={(row, val, isCb) => setGridAnswer(question.id, row, val, isCb)}
                            />

                            {errors[question.id] && (
                                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors[question.id]}
                                </p>
                            )}
                        </Card>
                    ))}
                </div>

                {/* Submit */}
                <div className="mt-8 flex justify-center">
                    <button
                        className="px-12 py-3 bg-primary rounded-lg font-medium text-sm gap-2 inline-flex items-center transition-all hover:opacity-90 disabled:opacity-50"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        {submitting ? 'Submitting...' : 'Submit Response'}
                    </button>
                </div>

                {/* Branding */}
                <div className="mt-12 text-center">
                    <p className="text-xs text-muted-foreground">
                        Powered by <span className="font-semibold text-foreground">SurveyGo</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Question Input Renderer ─────────────────────

interface QuestionInputProps {
    question: Question;
    value: any;
    onChange: (value: any) => void;
    onToggleCheckbox: (choice: string) => void;
    onGridChange: (row: string, value: string | string[], isCheckbox: boolean) => void;
}

function QuestionInput({ question, value, onChange, onToggleCheckbox, onGridChange }: QuestionInputProps) {
    switch (question.type) {
        case 'short': {
            const charLimit = question.options?.charLimit;
            const strVal = (value as string) || '';
            return (
                <div>
                    <input
                        type="text"
                        value={strVal}
                        onChange={(e) => onChange(e.target.value)}
                        maxLength={charLimit || undefined}
                        placeholder="Your answer..."
                        className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                    {charLimit && (
                        <p className="text-xs text-muted-foreground mt-1 text-right">{strVal.length} / {charLimit}</p>
                    )}
                </div>
            );
        }

        case 'long': {
            const charLimit = question.options?.charLimit;
            const strVal = (value as string) || '';
            return (
                <div>
                    <textarea
                        value={strVal}
                        onChange={(e) => onChange(e.target.value)}
                        maxLength={charLimit || undefined}
                        placeholder="Your answer..."
                        rows={4}
                        className="w-full px-4 py-3 border border-border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                    {charLimit && (
                        <p className="text-xs text-muted-foreground mt-1 text-right">{strVal.length} / {charLimit}</p>
                    )}
                </div>
            );
        }

        case 'rating': {
            const scale = question.options?.scale || 5;
            const currentRating = (value as number) || 0;
            const lowLabel = question.options?.lowLabel || '';
            const highLabel = question.options?.highLabel || '';
            const displayVal = currentRating || Math.ceil(scale / 2);
            const pct = scale > 1 ? ((displayVal - 1) / (scale - 1)) * 100 : 0;
            return (
                <div className="space-y-1">
                    <div className="text-center text-sm font-medium text-muted-foreground">{currentRating > 0 ? currentRating : '\u00A0'}</div>
                    <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 rounded-full bg-primary transition-all" style={{ width: `${currentRating > 0 ? pct : 0}%` }} />
                        <input
                            type="range" min={1} max={scale} step={1}
                            value={currentRating || Math.ceil(scale / 2)}
                            onChange={(e) => onChange(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{lowLabel || 1}</span>
                        <span>{highLabel || scale}</span>
                    </div>
                </div>
            );
        }

        case 'multiple': {
            const choices = question.options?.choices || [];
            return (
                <div className="space-y-2">
                    {choices.map((choice) => (
                        <label
                            key={choice}
                            onClick={() => onChange(choice)}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${value === choice
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-border'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${value === choice ? 'border-primary' : 'border-border'}`}>
                                {value === choice && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                            </div>
                            <span className="text-sm text-foreground">{choice}</span>
                        </label>
                    ))}
                </div>
            );
        }

        case 'checkbox': {
            const choices = question.options?.choices || [];
            const selected = (value as string[]) || [];
            return (
                <div className="space-y-2">
                    {choices.map((choice) => {
                        const checked = selected.includes(choice);
                        return (
                            <label
                                key={choice}
                                onClick={() => onToggleCheckbox(choice)}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${checked
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-border'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'border-primary bg-primary' : 'border-border'}`}>
                                    {checked && (
                                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-sm text-foreground">{choice}</span>
                            </label>
                        );
                    })}
                </div>
            );
        }

        case 'dropdown': {
            const choices = question.options?.choices || [];
            return (
                <DropdownInput
                    choices={choices}
                    value={(value as string) || ''}
                    onChange={onChange}
                />
            );
        }

        case 'grid_multiple':
        case 'grid_checkbox': {
            const rows = question.options?.rows || [];
            const columns = question.options?.columns || [];
            const grid = (value as Record<string, any>) || {};
            const isCheckbox = question.type === 'grid_checkbox';
            return (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="p-2 text-left text-muted-foreground font-medium"></th>
                                {columns.map((col, i) => (
                                    <th key={i} className="p-2 text-center text-muted-foreground font-medium text-xs">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, ri) => (
                                <tr key={ri} className="border-t border-border">
                                    <td className="p-2 text-foreground font-medium">{row}</td>
                                    {columns.map((col, ci) => {
                                        if (isCheckbox) {
                                            const selected = (grid[row] as string[]) || [];
                                            const checked = selected.includes(col);
                                            return (
                                                <td key={ci} className="p-2 text-center">
                                                    <button
                                                        onClick={() => onGridChange(row, col, true)}
                                                        className={`w-5 h-5 mx-auto rounded border-2 flex items-center justify-center transition-colors ${checked ? 'border-primary bg-primary' : 'border-border'}`}
                                                    >
                                                        {checked && (
                                                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </td>
                                            );
                                        } else {
                                            const selected = grid[row] === col;
                                            return (
                                                <td key={ci} className="p-2 text-center">
                                                    <button
                                                        onClick={() => onGridChange(row, col, false)}
                                                        className={`w-5 h-5 mx-auto rounded-full border-2 flex items-center justify-center transition-colors ${selected ? 'border-primary' : 'border-border'}`}
                                                    >
                                                        {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                                    </button>
                                                </td>
                                            );
                                        }
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        case 'date': {
            return (
                <DateInput value={(value as string) || ''} onChange={onChange} />
            );
        }

        case 'time': {
            return (
                <div className="max-w-xs">
                    <input
                        type="time"
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                </div>
            );
        }

        default:
            return <p className="text-muted-foreground text-sm">Unsupported question type</p>;
    }
}

// ── Extracted components (hooks must be at top level) ─────────

function DropdownInput({ choices, value, onChange }: { choices: string[]; value: string; onChange: (v: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative max-w-sm">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 border border-border rounded-lg text-sm bg-card hover:border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
                <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
                    {value || 'Choose an option...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-30 py-1 max-h-60 overflow-y-auto">
                    {choices.map((c, i) => (
                        <button
                            key={i}
                            onClick={() => { onChange(c); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${value === c ? 'bg-primary/10 text-foreground font-medium' : 'text-foreground hover:bg-muted'}`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarDate, setCalendarDate] = useState(() => {
        if (value) return new Date(value);
        return new Date();
    });

    const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
    const monthName = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="relative max-w-xs">
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="mm/dd/yyyy"
                    className="w-full px-4 py-3 pr-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
                <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                    <Calendar className="w-4 h-4" />
                </button>
            </div>
            {showCalendar && (
                <div className="absolute top-full mt-2 bg-card border border-border rounded-lg shadow-lg p-4 z-10 w-72">
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="p-1 hover:bg-muted rounded">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium">{monthName}</span>
                        <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="p-1 hover:bg-muted rounded">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <div key={d} className="text-muted-foreground font-medium py-1">{d}</div>
                        ))}
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const dateStr = `${String(calendarDate.getMonth() + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}/${calendarDate.getFullYear()}`;
                            const isSelected = value === dateStr;
                            return (
                                <button
                                    key={day}
                                    onClick={() => { onChange(dateStr); setShowCalendar(false); }}
                                    className={`py-1.5 rounded text-sm transition-all ${isSelected ? 'bg-primary text-foreground font-medium' : 'hover:bg-muted text-foreground'}`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

