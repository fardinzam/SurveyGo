import React, { useMemo } from 'react';
import { BarChart2, TrendingUp, Loader2, Download, FileDown } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { useResponses } from '../../hooks/useResponses';
import { useSurvey } from '../../hooks/useSurveys';
import { useSubscription } from '../../hooks/useSubscription';

interface BuilderResultsProps {
  surveyId: string;
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

export function BuilderResults({ surveyId }: BuilderResultsProps) {
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

  const chartData = useMemo(() => {
    const byDay: Record<string, number> = {};
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      byDay[key] = 0;
      days.push(key);
    }
    for (const r of responses) {
      const key = r.submittedAt.toISOString().slice(0, 10);
      if (key in byDay) byDay[key]++;
    }
    return days.map(d => ({
      day: new Date(d).toLocaleDateString(undefined, { weekday: 'short' }),
      val: byDay[d],
    }));
  }, [responses]);

  const questionSummaries = useMemo(() => {
    if (!survey) return [];
    return survey.questions.map(q => {
      const answerCount = responses.reduce((n, r) => n + (r.answers.some(a => a.questionId === q.id) ? 1 : 0), 0);
      let summary: string;
      if (q.type === 'multiple' || q.type === 'dropdown') {
        const tally: Record<string, number> = {};
        for (const r of responses) {
          const ans = r.answers.find(a => a.questionId === q.id);
          if (ans && typeof ans.value === 'string') tally[ans.value] = (tally[ans.value] ?? 0) + 1;
        }
        const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
        summary = top ? `Most common: ${top[0]} (${top[1]})` : '—';
      } else if (q.type === 'checkbox') {
        const tally: Record<string, number> = {};
        for (const r of responses) {
          const ans = r.answers.find(a => a.questionId === q.id);
          if (ans && Array.isArray(ans.value)) for (const v of ans.value as string[]) tally[v] = (tally[v] ?? 0) + 1;
        }
        const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
        summary = top ? `Most selected: ${top[0]} (${top[1]})` : '—';
      } else if (q.type === 'rating') {
        const vals: number[] = [];
        for (const r of responses) {
          const ans = r.answers.find(a => a.questionId === q.id);
          const n = typeof ans?.value === 'number' ? ans.value : parseFloat(String(ans?.value ?? ''));
          if (!Number.isNaN(n)) vals.push(n);
        }
        summary = vals.length ? `Avg: ${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)}` : '—';
      } else {
        summary = `${answerCount} answer${answerCount === 1 ? '' : 's'}`;
      }
      return { id: q.id, text: q.text || 'Untitled', type: q.type, answerCount, summary };
    });
  }, [survey, responses]);

  const handleExport = () => {
    if (!limits.canExport) {
      toast.error('Export requires a Standard or Professional plan.');
      return;
    }
    if (!survey || !responses.length) {
      toast.info('No responses to export yet.');
      return;
    }
    const header = ['Submitted At', ...survey.questions.map(q => q.text || q.id)];
    const rows: string[][] = [header];
    for (const r of responses) {
      const row = [r.submittedAt.toISOString()];
      for (const q of survey.questions) {
        const ans = r.answers.find(a => a.questionId === q.id);
        const val = ans ? (Array.isArray(ans.value) ? (ans.value as string[]).join('; ') : String(ans.value)) : '';
        row.push(val);
      }
      rows.push(row);
    }
    downloadCsv(`${survey.title || 'survey'}-responses.csv`, rows);
    toast.success('CSV exported');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-ghost">
        <Loader2 className="w-6 h-6 animate-spin text-brand-black/40" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-brand-ghost p-6 scrollbar-minimal">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total responses" value={stats.total.toLocaleString()} />
          <StatCard label="Last 7 days" value={stats.recent.toLocaleString()} />
          <StatCard label="Avg per day" value={stats.avgPerDay.toLocaleString()} />
          <StatCard label="Active days" value={stats.uniqueDays.toLocaleString()} />
        </div>

        {/* Trend chart */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-brand-black flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-black/60" />
              Responses — last 7 days
            </h3>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-ghost hover:bg-black/5 rounded-lg text-xs font-semibold text-brand-black transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="resp-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#212121" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#212121" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                <XAxis dataKey="day" tick={{ fill: '#21212180', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#21212180', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: '#00000020' }} />
                <Area type="monotone" dataKey="val" stroke="#212121" strokeWidth={2} fill="url(#resp-area)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-question summary */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-brand-black mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand-black/60" />
            By question
          </h3>
          {questionSummaries.length === 0 ? (
            <p className="text-sm text-brand-black/40 py-6 text-center">No questions in this survey.</p>
          ) : (
            <div className="space-y-3">
              {questionSummaries.map((q, i) => (
                <div key={q.id} className="flex items-center gap-4 py-3 border-b border-black/5 last:border-b-0">
                  <div className="w-7 h-7 rounded-full bg-brand-ghost flex items-center justify-center text-xs font-bold text-brand-black/60">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-black truncate">{q.text}</p>
                    <p className="text-xs text-brand-black/40">{q.type} · {q.answerCount} response{q.answerCount === 1 ? '' : 's'}</p>
                  </div>
                  <div className="text-sm text-brand-black/70 shrink-0">{q.summary}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {responses.length === 0 && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
            <Download className="w-8 h-8 mx-auto mb-3 text-brand-black/20" />
            <h3 className="text-base font-semibold text-brand-black mb-1">No responses yet</h3>
            <p className="text-sm text-brand-black/50">Share your survey to start collecting responses.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
      <p className="text-xs font-semibold text-brand-black/40 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-display font-bold text-brand-black">{value}</p>
    </div>
  );
}
