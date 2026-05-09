import React, { useState, useMemo } from 'react';
import {
  BarChart2, TrendingUp, Loader2, Download,
  CheckCircle2, Clock, Eye, Inbox, Share, Lightbulb, Search,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { useResponses } from '../../hooks/useResponses';
import { useSurvey } from '../../hooks/useSurveys';
import { useSubscription } from '../../hooks/useSubscription';

type ResultsTab = 'Overview' | 'Questions' | 'Responses' | 'Insights';

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
  const [activeTab, setActiveTab] = useState<ResultsTab>('Overview');

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

  const peakDay = useMemo(() => {
    const peak = [...chartData].sort((a, b) => b.val - a.val)[0];
    return peak && peak.val > 0 ? `${peak.day} (${peak.val})` : '—';
  }, [chartData]);

  const questionSummaries = useMemo(() => {
    if (!survey) return [];
    return survey.questions.map(q => {
      const answerCount = responses.reduce(
        (n, r) => n + (r.answers.some(a => a.questionId === q.id) ? 1 : 0), 0
      );
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
          if (ans && Array.isArray(ans.value))
            for (const v of ans.value as string[]) tally[v] = (tally[v] ?? 0) + 1;
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
        summary = vals.length
          ? `Avg: ${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)}`
          : '—';
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

  const statusBadge = survey?.status === 'active'
    ? 'bg-green-100 text-green-800'
    : survey?.status === 'draft'
      ? 'bg-brand-ghost text-brand-black/60'
      : 'bg-red-100 text-red-800';

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
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-xl text-sm font-medium hover:bg-brand-ghost transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-medium hover:bg-black/90 transition-colors shadow-sm">
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
                  label="Views"
                  value="—"
                />
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-bold text-brand-black flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-black/60" />
                    Response Volume
                  </h2>
                  <span className="text-xs font-medium text-brand-black/40 bg-black/5 px-2 py-1 rounded-lg">
                    Last 7 days
                  </span>
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="resp-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#212121" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#212121" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} dy={10} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#1a1a1a', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="val" stroke="#1a1a1a" strokeWidth={2} fillOpacity={1} fill="url(#resp-area)" />
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
          {activeTab === 'Questions' && (
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold text-brand-black mb-6 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-brand-black/60" />
                By Question
              </h2>
              {questionSummaries.length === 0 ? (
                <p className="text-sm text-brand-black/40 py-8 text-center">No questions in this survey.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {questionSummaries.map((q, i) => (
                    <div key={q.id} className="flex items-center gap-4 py-4 border-b border-black/5 last:border-b-0">
                      <div className="w-8 h-8 rounded-full bg-brand-ghost flex items-center justify-center font-bold text-sm text-brand-black/60 shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-black truncate">{q.text}</p>
                        <p className="text-xs text-brand-black/40 mt-0.5">
                          {q.type} · {q.answerCount} response{q.answerCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="text-sm text-brand-black/70 shrink-0 font-medium">{q.summary}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── RESPONSES TAB ── */}
          {activeTab === 'Responses' && (
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-black/5 bg-brand-ghost/30">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-black/40" />
                  <input
                    type="text"
                    placeholder="Search responses..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-black/5 rounded-xl text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all shadow-sm"
                    readOnly
                  />
                </div>
              </div>
              {responses.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 bg-brand-ghost rounded-full flex items-center justify-center mx-auto mb-4">
                    <Inbox className="w-6 h-6 text-brand-black/30" />
                  </div>
                  <h3 className="font-bold text-brand-black mb-1">No responses yet</h3>
                  <p className="text-sm text-brand-black/50">Share your survey link to start collecting data.</p>
                </div>
              ) : (
                <div className="divide-y divide-black/5">
                  {responses.map((r, i) => {
                    const firstAnswer = r.answers[0];
                    const answerText = firstAnswer
                      ? (Array.isArray(firstAnswer.value)
                          ? (firstAnswer.value as string[]).join(', ')
                          : String(firstAnswer.value))
                      : '—';
                    return (
                      <div key={r.id ?? i} className="flex items-center gap-4 px-6 py-4 hover:bg-brand-ghost/30 transition-colors">
                        <span className="text-xs font-medium text-brand-black/40 w-8 shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-brand-black truncate">{answerText}</p>
                        </div>
                        <span className="text-xs text-brand-black/40 shrink-0">
                          {r.submittedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── INSIGHTS TAB ── */}
          {activeTab === 'Insights' && (
            <div className="flex flex-col gap-6">
              <div className="bg-gradient-to-br from-[#9b51e0]/10 to-[#7f3db5]/5 rounded-3xl p-8 border border-[#9b51e0]/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#9b51e0]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9b51e0] to-[#7f3db5] flex items-center justify-center shadow-md">
                      <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold font-display text-brand-black">AI Summary</h2>
                  </div>
                  <p className="text-[16px] text-brand-black/60 leading-relaxed max-w-3xl mb-6">
                    AI-powered analysis of your responses is coming soon. Once enabled, you'll see sentiment trends, key themes, and actionable takeaways here.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white shadow-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-black/20" />
                      <span className="text-sm font-medium text-brand-black/50">Sentiment — coming soon</span>
                    </div>
                    <div className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white shadow-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-black/20" />
                      <span className="text-sm font-medium text-brand-black/50">Key themes — coming soon</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/5 shadow-sm">
                  <h3 className="text-lg font-bold text-brand-black mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-blue" />
                    Top Keywords
                  </h3>
                  <p className="text-sm text-brand-black/40 italic">Keyword extraction will appear here once AI analysis is enabled.</p>
                </div>
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/5 shadow-sm">
                  <h3 className="text-lg font-bold text-brand-black mb-6 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-brand-honeydew" />
                    Notable Quotes
                  </h3>
                  <p className="text-sm text-brand-black/40 italic">Standout quotes from open-ended responses will appear here.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function MetricCard({ icon, iconBg, label, value }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-brand-black/60">{label}</span>
      </div>
      <span className="text-3xl font-bold font-display text-brand-black">{value}</span>
    </div>
  );
}
