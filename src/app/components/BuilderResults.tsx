import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  BarChart2, TrendingUp, Loader2, Download, Sparkles,
  CheckCircle2, Clock, Eye, Inbox, Share, Lightbulb, ChevronDown, ChevronLeft, ChevronRight, Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  subDays, addDays, addMonths, startOfDay, startOfMonth,
  differenceInDays, format as dfFormat, parseISO,
} from 'date-fns';
import { toast } from 'sonner';
import { useResponses } from '../../hooks/useResponses';
import { useSurvey } from '../../hooks/useSurveys';
import { useSubscription } from '../../hooks/useSubscription';
import type { Question, Answer, SurveyResponseClient } from '../../types/survey';
import { callAnalyzeSentiment, type SentimentResult } from '../../lib/functions';
import { QuestionChart } from './QuestionChart';

type ResultsTab = 'Overview' | 'Questions' | 'Responses' | 'Insights';

interface BuilderResultsProps {
  surveyId: string;
  onNavigateToShare?: () => void;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function questionLabel(allQuestions: Question[], q: Question, idx: number): string {
  if (q.text?.trim()) return q.text.trim();
  const sameTypeUntitled = allQuestions
    .slice(0, idx + 1)
    .filter(other => !other.text?.trim() && other.type === q.type);
  return `untitled_${q.type}_${sameTypeUntitled.length}`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const csv = rows.map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function computeChartData(
  responses: SurveyResponseClient[],
  range: '7d' | '30d' | '365d' | 'custom',
  customFrom: string,
  customTo: string,
): { label: string; val: number }[] {
  const now = new Date();
  let windowStart: Date;
  let windowEnd: Date = now;
  let groupBy: 'day' | 'month' = 'day';

  if (range === '7d') {
    windowStart = startOfDay(subDays(now, 6));
  } else if (range === '30d') {
    windowStart = startOfDay(subDays(now, 29));
  } else if (range === '365d') {
    windowStart = startOfDay(subDays(now, 364));
    groupBy = 'month';
  } else {
    if (!customFrom || !customTo) return computeChartData(responses, '7d', '', '');
    windowStart = parseISO(customFrom);
    windowEnd = parseISO(customTo);
    if (windowStart > windowEnd) [windowStart, windowEnd] = [windowEnd, windowStart];
    groupBy = differenceInDays(windowEnd, windowStart) > 90 ? 'month' : 'day';
  }

  const buckets: Record<string, number> = {};
  const labels: Record<string, string> = {};

  if (groupBy === 'day') {
    let d = new Date(windowStart);
    while (d <= windowEnd) {
      const key = dfFormat(d, 'yyyy-MM-dd');
      buckets[key] = 0;
      labels[key] = range === '7d' ? dfFormat(d, 'EEE') : dfFormat(d, 'MMM d');
      d = addDays(d, 1);
    }
  } else {
    let d = startOfMonth(windowStart);
    while (d <= windowEnd) {
      const key = dfFormat(d, 'yyyy-MM');
      buckets[key] = 0;
      labels[key] = dfFormat(d, 'MMM yy');
      d = addMonths(d, 1);
    }
  }

  for (const r of responses) {
    const key = groupBy === 'day'
      ? dfFormat(r.submittedAt, 'yyyy-MM-dd')
      : dfFormat(r.submittedAt, 'yyyy-MM');
    if (key in buckets) buckets[key]++;
  }

  return Object.entries(buckets).map(([key, val]) => ({ label: labels[key], val }));
}

function formatAnswerValue(value: Answer['value'], type: Question['type']): string {
  if (Array.isArray(value)) return (value as string[]).join(', ');
  if (typeof value === 'object' && value !== null)
    return Object.entries(value as Record<string, string | string[]>)
      .map(([row, sel]) => `${row}: ${Array.isArray(sel) ? sel.join(', ') : sel}`)
      .join(' | ');
  if (type === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try { return dfFormat(parseISO(value), 'PPP'); } catch { return value; }
  }
  return String(value ?? '—');
}

function chartTypeOptions(type: Question['type']): { value: string; label: string }[] {
  switch (type) {
    case 'multiple': case 'checkbox': case 'dropdown':
      return [
        { value: 'pie',            label: 'Pie' },
        { value: 'bar_vertical',   label: 'Bar (vertical)' },
        { value: 'bar_horizontal', label: 'Bar (horizontal)' },
        { value: 'lollipop',       label: 'Lollipop' },
      ];
    case 'rating':
      return [
        { value: 'bar_horizontal', label: 'Distribution' },
        { value: 'histogram',      label: 'Histogram' },
        { value: 'mean',           label: 'Mean score' },
      ];
    case 'grid_multiple': case 'grid_checkbox':
      return [{ value: 'grouped_bar', label: 'Grouped bars' }];
    case 'date':
      return [{ value: 'date_bar', label: 'By date' }];
    case 'time':
      return [{ value: 'time_bar', label: 'By hour' }];
    default:
      return [{ value: 'text_list', label: 'Responses' }];
  }
}

// ── Shared hook ───────────────────────────────────────────────────────────────

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

// ── Main component ────────────────────────────────────────────────────────────

export function BuilderResults({ surveyId, onNavigateToShare }: BuilderResultsProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>('Overview');
  const [chartRange, setChartRange] = useState<'7d' | '30d' | '365d' | 'custom'>('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [questionChartTypes, setQuestionChartTypes] = useState<Record<string, string>>({});
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedResponseIdx, setSelectedResponseIdx] = useState(0);
  const [insightsQuestionId, setInsightsQuestionId] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsResult, setInsightsResult] = useState<SentimentResult | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [insightsDropOpen, setInsightsDropOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const insightsDropRef = useRef<HTMLDivElement>(null);

  const { data: survey } = useSurvey(surveyId);
  const { data: responses = [], isLoading } = useResponses(surveyId);
  const { limits } = useSubscription();

  const stats = useMemo(() => {
    const total = responses.length;
    const uniqueDays = new Set(responses.map(r => r.submittedAt.toDateString())).size;
    const avgPerDay = uniqueDays > 0 ? Math.round(total / uniqueDays) : 0;
    const lastSeven = Date.now() - 7 * 86400000;
    const recent = responses.filter(r => r.submittedAt.getTime() >= lastSeven).length;
    return { total, avgPerDay, recent, uniqueDays };
  }, [responses]);

  const chartData = useMemo(
    () => computeChartData(responses, chartRange, customFrom, customTo),
    [responses, chartRange, customFrom, customTo],
  );

  const peakDay = useMemo(() => {
    const peak = [...chartData].sort((a, b) => b.val - a.val)[0];
    return peak && peak.val > 0 ? `${peak.label} (${peak.val})` : '—';
  }, [chartData]);

  const answerableQuestions = useMemo(
    () => (survey?.questions ?? []).filter(q => q.type !== 'welcome' && q.type !== 'ending'),
    [survey],
  );

  const textQuestions = useMemo(
    () => answerableQuestions.filter(q => q.type === 'short' || q.type === 'long'),
    [answerableQuestions],
  );

  const notableQuotes = useMemo(() => {
    if (!insightsQuestionId) return [];
    return responses
      .map(r => r.answers.find(a => a.questionId === insightsQuestionId))
      .filter((a): a is Answer => !!a && typeof a.value === 'string' && (a.value as string).length > 20)
      .map(a => a.value as string)
      .sort((a, b) => b.length - a.length)
      .slice(0, 3);
  }, [responses, insightsQuestionId]);

  const handleAnalyze = async () => {
    if (!insightsQuestionId || insightsLoading) return;
    setInsightsLoading(true);
    setInsightsError(null);
    setInsightsResult(null);
    try {
      const res = await callAnalyzeSentiment({ surveyId, questionId: insightsQuestionId });
      setInsightsResult(res.data);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Analysis failed. Please try again.';
      setInsightsError(msg);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (answerableQuestions.length > 0 && selectedQuestionId === null) {
      setSelectedQuestionId(answerableQuestions[0].id);
    }
  }, [answerableQuestions, selectedQuestionId]);

  const closeExport = useCallback(() => setExportOpen(false), []);
  const closeInsightsDrop = useCallback(() => setInsightsDropOpen(false), []);
  useClickOutside(exportRef, closeExport);
  useClickOutside(insightsDropRef, closeInsightsDrop);

  const handleExport = () => {
    if (!limits.canExport) {
      toast.error('Export requires a Standard or Professional plan.');
      return;
    }
    if (!survey || !responses.length) {
      toast.info('No responses to export yet.');
      return;
    }
    const header = ['Submitted At', ...survey.questions.map((q, i) => questionLabel(survey.questions, q, i))];
    const rows: string[][] = [header];
    for (const r of responses) {
      const row = [r.submittedAt.toISOString()];
      for (const q of survey.questions) {
        const ans = r.answers.find(a => a.questionId === q.id);
        const val = ans
          ? (Array.isArray(ans.value) ? (ans.value as string[]).join('; ') : String(ans.value))
          : '';
        row.push(val);
      }
      rows.push(row);
    }
    downloadCsv(`${survey.title || 'survey'}-responses.csv`, rows);
    toast.success('CSV exported');
  };

  const handleExportXlsx = () => {
    if (!limits.canExport) { toast.error('Export requires a Standard or Professional plan.'); return; }
    if (!survey || !responses.length) { toast.info('No responses to export yet.'); return; }

    const header = ['Submitted At', ...survey.questions.map((q, i) => questionLabel(survey.questions, q, i))];
    const dataRows = responses.map(r => {
      const row: string[] = [r.submittedAt.toISOString()];
      for (const q of survey.questions) {
        const ans = r.answers.find(a => a.questionId === q.id);
        row.push(ans ? (Array.isArray(ans.value) ? (ans.value as string[]).join('; ') : String(ans.value)) : '');
      }
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    XLSX.writeFile(wb, `${survey.title || 'survey'}-responses.xlsx`);
    toast.success('Excel exported');
  };

  const handleExportPdf = () => {
    if (!limits.canExport) { toast.error('Export requires a Standard or Professional plan.'); return; }
    if (!survey || !responses.length) { toast.info('No responses to export yet.'); return; }

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(survey.title || 'Survey Responses', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Exported ${new Date().toLocaleDateString()}`, 14, 23);

    const head = [['Submitted At', ...survey.questions.map((q, i) => questionLabel(survey.questions, q, i))]];
    const body = responses.map(r => {
      const row = [r.submittedAt.toLocaleDateString()];
      for (const q of survey.questions) {
        const ans = r.answers.find(a => a.questionId === q.id);
        row.push(ans ? (Array.isArray(ans.value) ? (ans.value as string[]).join('; ') : String(ans.value)) : '');
      }
      return row;
    });

    autoTable(doc, { head, body, startY: 30, styles: { fontSize: 8 }, headStyles: { fillColor: [33, 33, 33] } });
    doc.save(`${survey.title || 'survey'}-responses.pdf`);
    toast.success('PDF exported');
  };

  const handleExportJson = () => {
    if (!limits.canExport) { toast.error('Export requires a Standard or Professional plan.'); return; }
    if (!survey || !responses.length) { toast.info('No responses to export yet.'); return; }

    const data = responses.map(r => ({
      submittedAt: r.submittedAt.toISOString(),
      answers: Object.fromEntries(r.answers.map(a => {
        const qIdx = survey.questions.findIndex(q => q.id === a.questionId);
        const q = survey.questions[qIdx];
        return [
          q ? questionLabel(survey.questions, q, qIdx) : a.questionId,
          a.value,
        ];
      })),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${survey.title || 'survey'}-responses.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exported');
  };

  const statusBadge = survey?.status === 'active'
    ? 'bg-green-100 text-green-800'
    : survey?.status === 'draft'
      ? 'bg-brand-ghost text-brand-black/60'
      : 'bg-red-100 text-red-800';

  const safeResponseIdx = Math.min(selectedResponseIdx, Math.max(0, responses.length - 1));

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-ghost">
        <Loader2 className="w-6 h-6 animate-spin text-brand-black/40" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-brand-ghost overflow-hidden">

      {/* Top Header */}
      <div className="px-8 py-6 bg-white border-b border-black/5 shrink-0 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold font-display text-brand-black">
                {survey?.title || 'Survey Results'}
              </h1>
              {survey?.status && (
                <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase ${statusBadge}`}>
                  {survey.status}
                </span>
              )}
            </div>
            <p className="text-[15px] text-brand-black/60">
              Analyze responses, review individual submissions, and discover insights.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Export dropdown */}
            <div ref={exportRef} className="relative">
              <button
                onClick={() => setExportOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-xl text-sm font-medium hover:bg-brand-ghost transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className={`w-3.5 h-3.5 text-brand-black/40 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-black/5 py-1 z-50 overflow-hidden">
                  {[
                    { label: 'CSV', action: () => { handleExport(); setExportOpen(false); } },
                    { label: 'Excel (.xlsx)', action: () => { handleExportXlsx(); setExportOpen(false); } },
                    { label: 'PDF', action: () => { handleExportPdf(); setExportOpen(false); } },
                    { label: 'JSON', action: () => { handleExportJson(); setExportOpen(false); } },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full text-left px-4 py-2 text-sm text-brand-black/80 hover:bg-brand-ghost transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onNavigateToShare}
              className="flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-medium hover:bg-black/90 transition-colors shadow-sm"
            >
              <Share className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-6">
          {(['Overview', 'Questions', 'Responses', 'Insights'] as ResultsTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition-all border-b-2 relative top-[1px] ${
                activeTab === tab
                  ? 'text-brand-black border-brand-black'
                  : 'text-brand-black/50 hover:text-brand-black hover:border-black/20 border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto flex flex-col gap-6 pb-20">

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'Overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  icon={<Inbox className="w-4 h-4 text-brand-blue" />}
                  iconBg="bg-brand-blue/20"
                  label="Total Responses"
                  value={stats.total.toLocaleString()}
                />
                <MetricCard
                  icon={<CheckCircle2 className="w-4 h-4 text-green-700" />}
                  iconBg="bg-brand-honeydew/30"
                  label="Completion Rate"
                  value="—"
                />
                <MetricCard
                  icon={<Clock className="w-4 h-4 text-yellow-700" />}
                  iconBg="bg-brand-vanilla/40"
                  label="Avg. Time"
                  value="—"
                />
                <MetricCard
                  icon={<Eye className="w-4 h-4 text-purple-700" />}
                  iconBg="bg-purple-100"
                  label="Last 7 Days"
                  value={stats.recent.toLocaleString()}
                />
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-bold text-brand-black flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-black/60" />
                    Response Volume
                  </h2>
                  <RangeSelector
                    value={chartRange}
                    onChange={setChartRange}
                    customFrom={customFrom}
                    customTo={customTo}
                    onFromChange={setCustomFrom}
                    onToChange={setCustomTo}
                  />
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="resp-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EFF0A3" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#EFF0A3" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} dy={10} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-white border border-black/5 rounded-xl shadow-md px-3 py-2">
                              <p className="text-xs text-brand-black/50 mb-0.5">{label}</p>
                              <p className="text-sm font-bold text-brand-black">{payload[0].value} responses</p>
                            </div>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="val" stroke="#EFF0A3" strokeWidth={2} fillOpacity={1} fill="url(#resp-area)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-black/5">
                  <div className="flex flex-col">
                    <span className="text-sm text-brand-black/50 mb-1">Peak Day</span>
                    <span className="font-bold text-brand-black">{peakDay}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-brand-black/50 mb-1">Avg. Daily</span>
                    <span className="font-bold text-brand-black">
                      {stats.avgPerDay > 0 ? `${stats.avgPerDay} responses` : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-brand-black/50 mb-1">Device Breakdown</span>
                    <span className="font-bold text-brand-black">—</span>
                  </div>
                </div>
              </div>

              {survey && responses.length > 0 && answerableQuestions.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-bold text-brand-black">Response Distribution</h2>
                  {answerableQuestions.map(q => (
                    <QuestionChartCard
                      key={q.id}
                      question={q}
                      responses={responses}
                      chartType={questionChartTypes[q.id]}
                      onChartTypeChange={t => setQuestionChartTypes(prev => ({ ...prev, [q.id]: t }))}
                      onSeeAll={() => { setSelectedQuestionId(q.id); setActiveTab('Questions'); }}
                    />
                  ))}
                </div>
              )}

              {responses.length === 0 && (
                <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-10 text-center">
                  <div className="w-12 h-12 bg-brand-ghost rounded-full flex items-center justify-center mx-auto mb-4">
                    <Inbox className="w-6 h-6 text-brand-black/30" />
                  </div>
                  <h3 className="font-bold text-brand-black mb-1">No responses yet</h3>
                  <p className="text-sm text-brand-black/50">Share your survey to start collecting responses.</p>
                </div>
              )}
            </>
          )}

          {/* ── QUESTIONS TAB ── */}
          {activeTab === 'Questions' && (() => {
            const selectedQIdx = answerableQuestions.findIndex(q => q.id === selectedQuestionId);
            return (
              <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 md:p-8">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-brand-black flex items-center gap-2 mb-3">
                    <BarChart2 className="w-5 h-5 text-brand-black/60" />
                    Question
                  </h2>
                  {answerableQuestions.length > 0 && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <CustomSelect
                        value={selectedQuestionId ?? ''}
                        onChange={v => setSelectedQuestionId(v || null)}
                        options={[
                          { value: '', label: 'Select a question...' },
                          ...answerableQuestions.map(q => ({ value: q.id, label: q.text || 'Untitled' })),
                        ]}
                        className="flex-1 max-w-sm"
                      />
                      {selectedQuestionId && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedQuestionId(answerableQuestions[selectedQIdx - 1]?.id ?? null)}
                            disabled={selectedQIdx <= 0}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/10 text-brand-black/60 hover:bg-brand-ghost disabled:opacity-30 transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <div className="flex items-center gap-1.5 text-sm text-brand-black/60">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={selectedQIdx >= 0 ? String(selectedQIdx + 1) : ''}
                              onChange={e => {
                                const n = parseInt(e.target.value);
                                if (!isNaN(n) && n >= 1 && n <= answerableQuestions.length) {
                                  setSelectedQuestionId(answerableQuestions[n - 1].id);
                                }
                              }}
                              className="w-10 text-center bg-brand-ghost/50 border border-black/10 rounded-lg py-1 text-sm outline-none focus:border-[#EFF0A3] focus:ring-1 focus:ring-[#EFF0A3]/30"
                            />
                            <span>of {answerableQuestions.length}</span>
                          </div>
                          <button
                            onClick={() => setSelectedQuestionId(answerableQuestions[selectedQIdx + 1]?.id ?? null)}
                            disabled={selectedQIdx >= answerableQuestions.length - 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/10 text-brand-black/60 hover:bg-brand-ghost disabled:opacity-30 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedQuestionId
                  ? <QuestionAnswerList
                      key={selectedQuestionId}
                      question={answerableQuestions.find(q => q.id === selectedQuestionId)!}
                      responses={responses}
                    />
                  : <p className="text-sm text-brand-black/40 py-8 text-center">Select a question above to view all answers.</p>
                }
              </div>
            );
          })()}

          {/* ── RESPONSES TAB ── */}
          {activeTab === 'Responses' && (
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-brand-black flex items-center gap-2 mb-3">
                  <Inbox className="w-5 h-5 text-brand-black/60" />
                  Responses
                </h2>
                {responses.length > 0 && (
                  <CustomSelect
                    value={String(selectedResponseIdx)}
                    onChange={v => setSelectedResponseIdx(Number(v))}
                    options={responses.map((r, i) => ({
                      value: String(i),
                      label: `Response #${i + 1} — ${r.submittedAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
                    }))}
                    className="flex-1 max-w-sm"
                  />
                )}
              </div>
              {responses.length === 0
                ? <div className="p-10 text-center">
                    <Inbox className="w-6 h-6 text-brand-black/30 mx-auto mb-3" />
                    <h3 className="font-bold text-brand-black mb-1">No responses yet</h3>
                    <p className="text-sm text-brand-black/50">Share your survey link to start collecting data.</p>
                  </div>
                : <ResponseDetail
                    response={responses[safeResponseIdx]}
                    questions={survey?.questions ?? []}
                  />
              }
            </div>
          )}

          {/* ── INSIGHTS TAB ── */}
          {activeTab === 'Insights' && (
            <div className="flex flex-col gap-6">
              {/* Header card */}
              <div className="bg-gradient-to-br from-[#9b51e0]/10 to-[#7f3db5]/5 rounded-3xl p-8 border border-[#9b51e0]/20 shadow-sm relative">
                {/* Decorative blur clipped to card bounds */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#9b51e0]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9b51e0] to-[#7f3db5] flex items-center justify-center shadow-md">
                      <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold font-display text-brand-black">AI Summary</h2>
                  </div>
                  <p className="text-[15px] text-brand-black/60 leading-relaxed max-w-2xl mb-5">
                    Analyze sentiment, key themes, and patterns across your open-ended responses.
                  </p>

                  {textQuestions.length === 0 ? (
                    <p className="text-sm text-brand-black/50 italic">No text questions in this survey. Add short or long-answer questions to enable AI analysis.</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Custom question selector */}
                      <div ref={insightsDropRef} className="relative">
                        <button
                          onClick={() => setInsightsDropOpen(o => !o)}
                          className="flex items-center gap-2 bg-white/70 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-brand-black shadow-sm min-w-[220px] max-w-xs"
                        >
                          <span className="flex-1 text-left truncate">
                            {insightsQuestionId
                              ? (textQuestions.find(q => q.id === insightsQuestionId)?.text || 'Untitled question')
                              : 'Select a question…'}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-brand-black/40 shrink-0 transition-transform ${insightsDropOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {insightsDropOpen && (
                          <div className="absolute left-0 top-full mt-1 w-full min-w-[220px] bg-white rounded-xl shadow-lg border border-black/5 py-1 z-50 max-h-48 overflow-y-auto">
                            <button
                              onClick={() => { setInsightsQuestionId(null); setInsightsResult(null); setInsightsError(null); setInsightsDropOpen(false); }}
                              className="w-full text-left px-4 py-2 text-sm text-brand-black/50 hover:bg-brand-ghost transition-colors"
                            >
                              Select a question…
                            </button>
                            {textQuestions.map(q => (
                              <button
                                key={q.id}
                                onClick={() => { setInsightsQuestionId(q.id); setInsightsResult(null); setInsightsError(null); setInsightsDropOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${insightsQuestionId === q.id ? 'bg-brand-ghost text-brand-black font-medium' : 'text-brand-black/80 hover:bg-brand-ghost'}`}
                              >
                                {insightsQuestionId === q.id && <Check className="w-3.5 h-3.5 shrink-0 text-brand-black" />}
                                <span className="truncate">{q.text || 'Untitled question'}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleAnalyze}
                        disabled={!insightsQuestionId || insightsLoading || !limits.canAiSentiment}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#9b51e0] to-[#7f3db5] text-white text-sm font-medium rounded-xl shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        {insightsLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Sparkles className="w-4 h-4" />}
                        {insightsLoading ? 'Analyzing…' : 'Analyze'}
                      </button>
                      {!limits.canAiSentiment && (
                        <span className="text-xs text-brand-black/50 bg-white/60 rounded-lg px-3 py-1.5 border border-white/80">
                          Professional plan required
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {insightsError && (
                <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-4 text-sm text-red-600">
                  {insightsError}
                </div>
              )}

              {/* Empty prompt */}
              {!insightsResult && !insightsLoading && !insightsError && textQuestions.length > 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#9b51e0]/10 flex items-center justify-center mb-4">
                    <Lightbulb className="w-6 h-6 text-[#9b51e0]/50" />
                  </div>
                  <p className="text-sm text-brand-black/40">Select a question above and click Analyze to see insights.</p>
                </div>
              )}

              {/* Results */}
              {insightsResult && !insightsLoading && (
                <>
                  {/* Sentiment distribution */}
                  <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/5 shadow-sm">
                    <h3 className="text-lg font-bold text-brand-black mb-1 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#9b51e0]" />
                      Sentiment Distribution
                    </h3>
                    <p className="text-sm text-brand-black/50 mb-6">{insightsResult.responseCount} response{insightsResult.responseCount === 1 ? '' : 's'} analyzed</p>
                    <div className="space-y-3 mb-6">
                      {([
                        { label: 'Positive', key: 'positive' as const, color: 'bg-emerald-400' },
                        { label: 'Neutral',  key: 'neutral'  as const, color: 'bg-amber-300'  },
                        { label: 'Negative', key: 'negative' as const, color: 'bg-red-400'    },
                      ]).map(({ label, key, color }) => {
                        const pct = insightsResult.distribution[key];
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-brand-black/60 w-16">{label}</span>
                            <div className="flex-1 h-2.5 bg-brand-ghost rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm font-bold text-brand-black w-10 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[15px] text-brand-black/70 leading-relaxed">{insightsResult.summary}</p>
                  </div>

                  {/* Themes + Quotes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/5 shadow-sm">
                      <h3 className="text-lg font-bold text-brand-black mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-blue" />
                        Key Themes
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {insightsResult.topThemes.map(theme => (
                          <span key={theme} className="px-3 py-1.5 bg-brand-ghost rounded-xl text-sm font-medium text-brand-black/70 border border-black/5">
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/5 shadow-sm">
                      <h3 className="text-lg font-bold text-brand-black mb-6 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-brand-honeydew" />
                        Notable Quotes
                      </h3>
                      {notableQuotes.length > 0 ? (
                        <div className="space-y-4">
                          {notableQuotes.map((q, i) => (
                            <blockquote key={i} className="border-l-2 border-[#9b51e0]/40 pl-3 text-sm text-brand-black/60 italic leading-relaxed">
                              "{q}"
                            </blockquote>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-brand-black/40 italic">No open-ended responses found for this question.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ icon, iconBg, label, value }: {
  icon: React.ReactNode; iconBg: string; label: string; value: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>{icon}</div>
        <span className="text-sm font-medium text-brand-black/60">{label}</span>
      </div>
      <span className="text-3xl font-bold font-display text-brand-black">{value}</span>
    </div>
  );
}

function RangeSelector({ value, onChange, customFrom, customTo, onFromChange, onToChange }: {
  value: '7d' | '30d' | '365d' | 'custom';
  onChange: (v: '7d' | '30d' | '365d' | 'custom') => void;
  customFrom: string; customTo: string;
  onFromChange: (v: string) => void; onToChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <CustomSelect
        value={value}
        onChange={onChange}
        options={[
          { value: '7d', label: 'Last Week' },
          { value: '30d', label: 'Last Month' },
          { value: '365d', label: 'Last Year' },
          { value: 'custom', label: 'Custom range' },
        ]}
        className="text-xs"
      />
      {value === 'custom' && (
        <>
          <input type="date" value={customFrom} onChange={e => onFromChange(e.target.value)}
            className="text-xs bg-white border border-black/10 rounded-xl px-3 py-2 outline-none text-brand-black shadow-sm hover:border-black/20 transition-colors" />
          <span className="text-xs text-brand-black/40">to</span>
          <input type="date" value={customTo} onChange={e => onToChange(e.target.value)}
            className="text-xs bg-white border border-black/10 rounded-xl px-3 py-2 outline-none text-brand-black shadow-sm hover:border-black/20 transition-colors" />
        </>
      )}
    </div>
  );
}

function QuestionChartCard({ question, responses, chartType, onChartTypeChange, onSeeAll }: {
  question: Question; responses: SurveyResponseClient[];
  chartType: string | undefined; onChartTypeChange: (t: string) => void; onSeeAll: () => void;
}) {
  const options = chartTypeOptions(question.type);
  const resolved = chartType ?? options[0]?.value ?? '';
  const cardRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={cardRef} className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-black">{question.text || 'Untitled'}</p>
          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-brand-ghost rounded-md text-brand-black/50">
            {question.type}
          </span>
        </div>
        {options.length > 1 && (
          <CustomSelect
            value={resolved}
            onChange={onChartTypeChange}
            options={options}
            className="text-xs shrink-0"
          />
        )}
      </div>
      {inView
        ? <QuestionChart question={question} responses={responses} chartType={resolved} onSeeAll={onSeeAll} />
        : <div className="h-[220px]" />
      }
    </div>
  );
}

function QuestionAnswerList({ question, responses }: {
  question: Question; responses: SurveyResponseClient[];
}) {
  const [page, setPage] = useState(1);
  const PAGE = 20;
  const answers = responses
    .map(r => r.answers.find(a => a.questionId === question.id))
    .filter((a): a is NonNullable<typeof a> => a !== undefined);
  const paged = answers.slice((page - 1) * PAGE, page * PAGE);
  const totalPages = Math.ceil(answers.length / PAGE);

  if (!answers.length) {
    return <p className="text-sm text-brand-black/40 text-center py-6">No answers for this question.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-brand-black/40 mb-1">{answers.length} answer{answers.length !== 1 ? 's' : ''}</p>
      {paged.map((ans, i) => (
        <div key={i} className="px-4 py-3 bg-brand-ghost/40 rounded-xl text-sm text-brand-black">
          {formatAnswerValue(ans.value, question.type)}
        </div>
      ))}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-2 justify-center">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-xs rounded-lg border border-black/10 disabled:opacity-40 hover:bg-brand-ghost transition-colors">
            Prev
          </button>
          <span className="text-xs text-brand-black/50">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-xs rounded-lg border border-black/10 disabled:opacity-40 hover:bg-brand-ghost transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function ResponseDetail({ response, questions }: {
  response: SurveyResponseClient; questions: Question[];
}) {
  const qs = questions.filter(q => q.type !== 'welcome' && q.type !== 'ending');
  return (
    <div className="flex flex-col gap-1">
      {qs.map((q, i) => {
        const ans = response.answers.find(a => a.questionId === q.id);
        return (
          <div key={q.id} className="py-3 border-b border-black/5 last:border-b-0">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-black/40">Q{i + 1} · {q.type}</p>
            <p className="text-sm font-semibold text-brand-black mt-0.5">{q.text || 'Untitled'}</p>
            <p className="text-sm text-brand-black/70 mt-1">
              {ans
                ? formatAnswerValue(ans.value, q.type)
                : <span className="text-brand-black/30 italic">Not answered</span>
              }
            </p>
          </div>
        );
      })}
    </div>
  );
}

function CustomSelect<T extends string>({ value, onChange, options, className }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value) ?? options[0];
  const closeSelect = React.useCallback(() => setOpen(false), []);
  useClickOutside(ref, closeSelect);

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-black/10 rounded-lg text-sm font-medium text-brand-black/70 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
      >
        <span className="flex-1 text-left">{current?.label ?? '—'}</span>
        <ChevronDown className="w-4 h-4 text-brand-black/40 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-full w-max bg-white rounded-xl shadow-lg border border-black/5 z-50 py-1 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-brand-black/80 hover:bg-brand-ghost transition-colors"
            >
              <span className="flex-1 text-left whitespace-nowrap">{opt.label}</span>
              {value === opt.value && <Check className="w-3.5 h-3.5 text-brand-black/60 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
