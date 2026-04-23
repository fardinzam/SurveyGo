import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, ChevronDown, Clock, Loader2, Send, Star } from 'lucide-react';
import { toast } from 'sonner';
import { format, parse } from 'date-fns';
import { getSurveyPublic } from '../../lib/firestore';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import type { Answer, LogicCondition, Question, SurveyClient } from '../../types/survey';

interface SurveyRespondentPageProps {
  surveyId: string;
}

const draftKey = (surveyId: string) => `surveygo_draft_${surveyId}`;
const SUBMIT_FUNCTION_URL = import.meta.env.VITE_SUBMIT_FUNCTION_URL ?? '';

// ── Branching logic evaluation ───────────────────────────────────────────────

function evaluateCondition(cond: LogicCondition, answers: Record<string, unknown>): boolean {
  const val = answers[cond.questionId];
  switch (cond.operator) {
    case 'equals': return String(val) === String(cond.value);
    case 'not_equals': return String(val) !== String(cond.value);
    case 'contains': return Array.isArray(val) && val.includes(cond.value as string);
    case 'not_contains': return !Array.isArray(val) || !val.includes(cond.value as string);
    case 'is_answered': return val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);
    case 'is_not_answered': return val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
    default: return true;
  }
}

function isQuestionVisible(question: Question, answers: Record<string, unknown>): boolean {
  if (!question.logic || question.logic.conditions.length === 0) return true;
  const { action, conjunction, conditions } = question.logic;
  const results = conditions.map((c) => evaluateCondition(c, answers));
  const match = conjunction === 'and' ? results.every(Boolean) : results.some(Boolean);
  return action === 'show' ? match : !match;
}

function evaluateBranchCondition(cond: { operator: string; value?: string }, answer: unknown): boolean {
  const v = cond.value ?? '';
  switch (cond.operator) {
    case 'is': case 'is_equal_to': return String(answer) === v;
    case 'is_not': case 'is_not_equal_to': return String(answer) !== v;
    case 'contains': return Array.isArray(answer) && answer.includes(v);
    case 'not_contains': return !Array.isArray(answer) || !answer.includes(v);
    case 'is_answered': return answer !== undefined && answer !== '' && !(Array.isArray(answer) && answer.length === 0);
    case 'is_not_answered': return answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0);
    default: return true;
  }
}

// ── Root ─────────────────────────────────────────────────────────────────────

export function SurveyRespondentPage({ surveyId }: SurveyRespondentPageProps) {
  const [survey, setSurvey] = useState<SurveyClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const draftLoaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getSurveyPublic(surveyId);
        if (cancelled) return;
        if (!data || data.status !== 'active') {
          setNotFound(true);
        } else {
          setSurvey(data);
          // Restore draft
          if (!draftLoaded.current) {
            draftLoaded.current = true;
            try {
              const saved = localStorage.getItem(draftKey(surveyId));
              if (saved) {
                const d = JSON.parse(saved);
                if (d.answers) setAnswers(d.answers);
                if (d.email) setEmail(d.email);
              }
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        console.error('[SurveyGo] Error loading survey:', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [surveyId]);

  // Auto-save draft
  useEffect(() => {
    if (!survey || submitted) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(surveyId), JSON.stringify({ answers, email }));
      } catch { /* ignore */ }
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [answers, email, survey, surveyId, submitted]);

  const visibleQuestions = useMemo(() => {
    if (!survey) return [];
    const qs = survey.questions;
    const reachable: Question[] = [];
    let i = 0;
    while (i < qs.length) {
      const q = qs[i];
      if (!isQuestionVisible(q, answers)) { i++; continue; }
      reachable.push(q);
      if (q.branching && (q.branching.rules.length > 0 || q.branching.defaultTargetId)) {
        const ans = answers[q.id];
        let targetId: string | undefined;
        if (ans !== undefined && ans !== '' && !(Array.isArray(ans) && ans.length === 0)) {
          for (const rule of q.branching.rules) {
            if (rule.conditions.every(c => evaluateBranchCondition(c, ans))) {
              targetId = rule.targetQuestionId; break;
            }
          }
        }
        if (!targetId) targetId = q.branching.defaultTargetId;
        if (targetId) {
          const tIdx = qs.findIndex(qn => qn.id === targetId);
          if (tIdx > i) { i = tIdx; continue; }
        }
      }
      i++;
    }
    return reachable;
  }, [survey, answers]);

  const progress = useMemo(() => {
    if (!visibleQuestions.length) return 0;
    const answered = visibleQuestions.filter(q => {
      const a = answers[q.id];
      if (a === undefined || a === '' || a === null) return false;
      if (Array.isArray(a) && a.length === 0) return false;
      return true;
    }).length;
    return Math.round((answered / visibleQuestions.length) * 100);
  }, [visibleQuestions, answers]);

  const setAnswer = useCallback((id: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
    setErrors(prev => {
      if (!prev[id]) return prev;
      const n = { ...prev }; delete n[id]; return n;
    });
  }, []);

  const handleSubmit = async () => {
    if (!survey || submitting) return;
    const settings = survey.settings;
    const collectEmail = settings?.collectEmail ?? 'none';

    const newErrors: Record<string, string> = {};
    for (const q of visibleQuestions) {
      if (q.required) {
        const a = answers[q.id];
        if (a === undefined || a === '' || a === null || (Array.isArray(a) && a.length === 0)) {
          newErrors[q.id] = 'This field is required';
        }
      }
    }
    if (collectEmail === 'required' && !email.trim()) {
      newErrors.__email = 'Email is required';
    }
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      newErrors.__email = 'Enter a valid email';
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      toast.error('Please fix the errors before submitting');
      const firstBadId = Object.keys(newErrors)[0];
      if (firstBadId !== '__email') {
        document.getElementById(`q-${firstBadId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    try {
      const answerList: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value: value as Answer['value'],
      }));

      const res = await fetch(SUBMIT_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId,
          answers: answerList,
          respondentEmail: email.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Submission failed');
      }

      try { localStorage.removeItem(draftKey(surveyId)); } catch { /* ignore */ }
      setSubmitted(true);
    } catch (err) {
      console.error('[SurveyGo] Submit error:', err);
      toast.error('Could not submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-ghost flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-black/40" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-brand-ghost flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-8 text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-xl font-display font-bold text-brand-black mb-2">Survey not available</h1>
          <p className="text-sm text-brand-black/60">This survey may have been closed or removed.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-ghost flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center max-w-md">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-honeydew flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-700" />
          </div>
          <h1 className="text-2xl font-display font-bold text-brand-black mb-2">Thanks for your response!</h1>
          <p className="text-sm text-brand-black/60">
            {survey?.settings?.confirmationMessage || 'Your answers have been submitted.'}
          </p>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  const showProgress = survey.settings?.showProgressBar !== false;
  const collectEmail = survey.settings?.collectEmail ?? 'none';

  return (
    <div className="min-h-screen bg-brand-ghost font-sans text-brand-black">
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        {showProgress && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
              <div className="h-full bg-brand-black transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-semibold text-brand-black/60 tabular-nums">{progress}%</span>
          </div>
        )}

        {survey.headerImageUrl && (
          <img src={survey.headerImageUrl} alt="" className="w-full rounded-2xl object-cover max-h-48" />
        )}
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-black tracking-tight">{survey.title || 'Untitled Survey'}</h1>
          {survey.description && (
            <p className="text-base text-brand-black/60 mt-2 leading-relaxed whitespace-pre-wrap">{survey.description}</p>
          )}
        </div>

        {visibleQuestions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx}
            answer={answers[q.id]}
            error={errors[q.id]}
            onChange={(v) => setAnswer(q.id, v)}
          />
        ))}

        {collectEmail !== 'none' && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
            <label className="block text-sm font-semibold text-brand-black mb-2">
              Your email {collectEmail === 'required' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full bg-brand-ghost/50 border rounded-lg px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-black/20 ${errors.__email ? 'border-red-300' : 'border-black/10'}`}
            />
            {errors.__email && <p className="text-xs text-red-500 mt-1.5">{errors.__email}</p>}
          </div>
        )}

        <div className="pt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-brand-black text-white py-3.5 rounded-xl font-semibold text-base hover:bg-black/90 transition-all shadow-lg shadow-black/10 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'Submit response'}
          </button>
        </div>
      </main>

      <footer className="max-w-2xl mx-auto px-6 py-8 text-center">
        <p className="text-xs text-brand-black/40">Powered by SurveyGo</p>
      </footer>
    </div>
  );
}

// ── Question renderers ───────────────────────────────────────────────────────

interface QuestionCardProps {
  question: Question;
  index: number;
  answer: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}

function QuestionCard({ question, index, answer, error, onChange }: QuestionCardProps) {
  return (
    <div id={`q-${question.id}`} className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
      <div className="mb-4">
        <p className="text-xs font-bold text-brand-black/40 uppercase tracking-wider mb-1">
          Question {index + 1}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </p>
        <h3 className="text-lg font-semibold text-brand-black leading-snug">
          {question.text || 'Untitled question'}
        </h3>
      </div>
      <QuestionInput question={question} answer={answer} onChange={onChange} />
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}

function QuestionInput({ question, answer, onChange }: { question: Question; answer: unknown; onChange: (v: unknown) => void }) {
  switch (question.type) {
    case 'short':
      return (
        <input
          type="text"
          value={(answer as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-brand-ghost/50 border border-black/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-black/20"
        />
      );
    case 'long':
      return (
        <textarea
          rows={4}
          value={(answer as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-brand-ghost/50 border border-black/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-black/20 resize-y"
        />
      );
    case 'multiple':
      return (
        <div className="space-y-2">
          {(question.options?.choices ?? []).map((c, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-brand-ghost/40 transition-colors">
              <input
                type="radio"
                name={question.id}
                checked={answer === c}
                onChange={() => onChange(c)}
                className="w-4 h-4 accent-brand-black"
              />
              <span className="text-sm text-brand-black">{c}</span>
            </label>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <div className="space-y-2">
          {(question.options?.choices ?? []).map((c, i) => {
            const values = (answer as string[]) ?? [];
            const checked = values.includes(c);
            return (
              <label key={i} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-brand-ghost/40 transition-colors">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...values, c]);
                    else onChange(values.filter(v => v !== c));
                  }}
                  className="w-4 h-4 accent-brand-black rounded"
                />
                <span className="text-sm text-brand-black">{c}</span>
              </label>
            );
          })}
        </div>
      );
    case 'dropdown':
      return (
        <select
          value={(answer as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-brand-ghost/50 border border-black/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-black/20"
        >
          <option value="">Select an option</option>
          {(question.options?.choices ?? []).map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
      );
    case 'rating': {
      const ratingLow = question.options?.ratingLow ?? 1;
      const ratingHigh = question.options?.ratingHigh ?? (question.options?.scale ?? 5);
      const ratingNums = Array.from({ length: ratingHigh - ratingLow + 1 }, (_, i) => i + ratingLow);
      const value = typeof answer === 'number' ? answer : NaN;
      const isStar = question.options?.ratingStyle === 'star';
      return (
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center justify-center gap-2 w-full flex-wrap">
            {ratingNums.map(n => isStar ? (
              <button key={n} type="button" onClick={() => onChange(n)} className="transition-transform hover:scale-110">
                <Star className={`w-8 h-8 transition-colors ${value >= n ? 'fill-brand-vanilla text-brand-black/50' : 'fill-none text-brand-black/20 hover:text-brand-black/40'}`} />
              </button>
            ) : (
              <button key={n} type="button" onClick={() => onChange(n)}
                className={`flex-1 min-w-[40px] max-w-[56px] h-10 rounded-lg border text-sm font-medium transition-colors ${
                  value === n ? 'bg-brand-black text-white border-brand-black' : 'bg-brand-ghost/50 border-black/10 text-brand-black/70 hover:bg-white'
                }`}>{n}</button>
            ))}
          </div>
          {(question.options?.lowLabel || question.options?.midLabel || question.options?.highLabel) && (
            <div className="flex w-full mt-2">
              <span className="text-xs text-brand-black/50 flex-1 text-left">{question.options?.lowLabel ?? ''}</span>
              {question.options?.midLabel && <span className="text-xs text-brand-black/50 flex-1 text-center">{question.options.midLabel}</span>}
              <span className="text-xs text-brand-black/50 flex-1 text-right">{question.options?.highLabel ?? ''}</span>
            </div>
          )}
        </div>
      );
    }
    case 'date': {
      const dateVal = (answer as string) ?? '';
      const parsed = dateVal ? parse(dateVal, 'yyyy-MM-dd', new Date()) : undefined;
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={`flex items-center gap-2 bg-brand-ghost/50 border border-black/10 rounded-lg px-3 py-2.5 text-sm outline-none hover:bg-white hover:border-brand-black/20 transition-colors min-w-[200px] text-left ${dateVal ? 'text-brand-black' : 'text-brand-black/40'}`}>
              <CalendarIcon className="w-4 h-4 shrink-0 text-brand-black/40" />
              {dateVal && parsed ? format(parsed, 'PPP') : 'Select a date'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white rounded-xl border border-black/5 shadow-lg" align="start">
            <Calendar mode="single" selected={parsed} onSelect={(day) => { if (day) onChange(format(day, 'yyyy-MM-dd')); }} initialFocus />
          </PopoverContent>
        </Popover>
      );
    }
    case 'time': {
      const timeVal = (answer as string) ?? '';
      const [rawH, rawM] = timeVal ? timeVal.split(':').map(Number) : [NaN, NaN];
      const h12 = !isNaN(rawH) ? ((rawH % 12) || 12) : '';
      const min = !isNaN(rawM) ? String(rawM).padStart(2, '0') : '';
      const ampm = !isNaN(rawH) ? (rawH >= 12 ? 'PM' : 'AM') : 'AM';
      const updateTime = (hour: string, minute: string, period: string) => {
        if (!hour || !minute) return;
        let h24 = parseInt(hour);
        if (period === 'PM' && h24 !== 12) h24 += 12;
        if (period === 'AM' && h24 === 12) h24 = 0;
        onChange(`${String(h24).padStart(2, '0')}:${minute}`);
      };
      const selCls = "appearance-none bg-brand-ghost/50 border border-black/10 rounded-lg px-3 py-2.5 text-sm text-brand-black outline-none hover:bg-white hover:border-brand-black/20 transition-colors cursor-pointer";
      return (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-black/40 shrink-0" />
          <div className="relative">
            <select value={h12} onChange={e => updateTime(e.target.value, min || '00', ampm)} className={selCls}>
              <option value="" disabled>HH</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <span className="text-brand-black/40 font-medium">:</span>
          <div className="relative">
            <select value={min} onChange={e => updateTime(String(h12 || 12), e.target.value, ampm)} className={selCls}>
              <option value="" disabled>MM</option>
              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex rounded-lg border border-black/10 overflow-hidden">
            {(['AM', 'PM'] as const).map(p => (
              <button key={p} type="button" onClick={() => updateTime(String(h12 || 12), min || '00', p)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${ampm === p ? 'bg-brand-black text-white' : 'bg-brand-ghost/50 text-brand-black/60 hover:bg-white'}`}>{p}</button>
            ))}
          </div>
        </div>
      );
    }
    case 'grid_multiple':
    case 'grid_checkbox': {
      const rows = question.options?.rows ?? [];
      const cols = question.options?.columns ?? [];
      const grid = (answer as Record<string, string | string[]>) ?? {};
      const multi = question.type === 'grid_checkbox';
      return (
        <div className="overflow-x-auto">
          <table className="text-sm text-brand-black/80">
            <thead>
              <tr>
                <th />
                {cols.map((c, i) => <th key={i} className="px-3 py-2 font-medium text-xs text-brand-black/60">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  <td className="pr-3 py-2 font-medium">{r}</td>
                  {cols.map((c, ci) => {
                    const current = grid[r];
                    const selected = multi
                      ? Array.isArray(current) && current.includes(c)
                      : current === c;
                    return (
                      <td key={ci} className="px-3 py-2 text-center">
                        <input
                          type={multi ? 'checkbox' : 'radio'}
                          name={`${question.id}-${r}`}
                          checked={!!selected}
                          onChange={() => {
                            if (multi) {
                              const arr = Array.isArray(current) ? [...current] : [];
                              const idx = arr.indexOf(c);
                              if (idx >= 0) arr.splice(idx, 1); else arr.push(c);
                              onChange({ ...grid, [r]: arr });
                            } else {
                              onChange({ ...grid, [r]: c });
                            }
                          }}
                          className="w-4 h-4 accent-brand-black"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return null;
  }
}
