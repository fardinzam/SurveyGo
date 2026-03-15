import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { BuilderNavbar } from './BuilderNavbar';
import {
  Download, TrendingUp, Clock, CheckCircle, Loader2, Inbox,
  Star, Search, ChevronDown, ChevronUp, X, ArrowUpDown, Calendar,
  FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Hash, BarChart3,
} from 'lucide-react';
import { useResponses } from '../../hooks/useResponses';
import { useSurvey } from '../../hooks/useSurveys';
import type { SurveyResponseClient, Question, Answer } from '../../types/survey';
import { usePageTitle } from '../../hooks/usePageTitle';
import { markSurveyAsRead } from '../../lib/firestore';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import * as XLSX from 'xlsx';

// ── Helpers ──────────────────────────────────
type DateRange = 'all' | '7d' | '30d' | 'custom';

function filterByDateRange(
  responses: SurveyResponseClient[],
  range: DateRange,
  customFrom?: Date,
  customTo?: Date,
): SurveyResponseClient[] {
  if (range === 'all') return responses;
  const now = new Date();
  let from: Date;
  if (range === '7d') { from = new Date(now); from.setDate(from.getDate() - 7); }
  else if (range === '30d') { from = new Date(now); from.setDate(from.getDate() - 30); }
  else if (range === 'custom' && customFrom && customTo) {
    from = customFrom;
    const to = new Date(customTo);
    to.setHours(23, 59, 59, 999);
    return responses.filter((r) => r.submittedAt >= from && r.submittedAt <= to);
  } else return responses;
  return responses.filter((r) => r.submittedAt >= from);
}

function groupByDay(responses: SurveyResponseClient[]): { date: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const r of responses) {
    const key = r.submittedAt.toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function answerToString(value: Answer['value']): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join(' | ');
  }
  return String(value);
}

// ── Main Component ───────────────────────────
interface SurveyResultsPageProps {
  onNavigate: (page: string) => void;
  surveyId?: string;
}

export function SurveyResultsPage({ onNavigate, surveyId }: SurveyResultsPageProps) {
  usePageTitle('Analytics');
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'responses'>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomDropdown, setShowCustomDropdown] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const { data: allResponses = [], isLoading: loadingResponses } = useResponses(surveyId);
  const { data: survey, isLoading: loadingSurvey } = useSurvey(surveyId);
  const isLoading = loadingResponses || loadingSurvey;
  const questions = survey?.questions ?? [];

  // Mark as read
  useEffect(() => {
    if (surveyId && survey && survey.responseCount > (survey.lastReadResponseCount ?? 0)) {
      markSurveyAsRead(surveyId).catch(() => { });
    }
  }, [surveyId, survey]);

  // Filter by date range
  const responses = useMemo(() => {
    const from = customFrom ? new Date(customFrom) : undefined;
    const to = customTo ? new Date(customTo) : undefined;
    return filterByDateRange(allResponses, dateRange, from, to);
  }, [allResponses, dateRange, customFrom, customTo]);

  const totalResponses = responses.length;

  // Answer lookup
  const answersByQuestion = useMemo(() => {
    const map: Record<string, Answer[]> = {};
    for (const r of responses) {
      for (const a of r.answers) {
        if (!map[a.questionId]) map[a.questionId] = [];
        map[a.questionId].push(a);
      }
    }
    return map;
  }, [responses]);

  // Stats
  const avgRating = useMemo(() => {
    const ratingQs = questions.filter((q) => q.type === 'rating');
    if (ratingQs.length === 0) return null;
    let sum = 0, count = 0;
    for (const q of ratingQs) {
      for (const a of (answersByQuestion[q.id] ?? [])) {
        const val = typeof a.value === 'number' ? a.value : Number(a.value);
        if (!isNaN(val)) { sum += val; count++; }
      }
    }
    return count > 0 ? (sum / count).toFixed(1) : null;
  }, [questions, answersByQuestion]);

  const latestResponse = responses.length > 0
    ? responses.reduce((a, b) => (a.submittedAt > b.submittedAt ? a : b))
    : null;

  const chartData = useMemo(() => groupByDay(responses), [responses]);

  // Export handlers
  const exportCSV = () => {
    if (responses.length === 0) return;
    const headers = ['#', 'Date', ...questions.map((q) => q.text)];
    const rows = responses.map((r, i) => {
      const row: string[] = [String(i + 1), formatDateTime(r.submittedAt)];
      for (const q of questions) {
        const answer = r.answers.find((a) => a.questionId === q.id);
        row.push(answer ? answerToString(answer.value) : '');
      }
      return row;
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${survey?.title || 'survey'}_responses.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setShowExportMenu(false);
  };

  const exportExcel = () => {
    if (responses.length === 0) return;
    const headers = ['#', 'Date', ...questions.map((q) => q.text)];
    const rows = responses.map((r, i) => {
      const row: (string | number)[] = [i + 1, formatDateTime(r.submittedAt)];
      for (const q of questions) {
        const answer = r.answers.find((a) => a.questionId === q.id);
        row.push(answer ? answerToString(answer.value) : '');
      }
      return row;
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    XLSX.writeFile(wb, `${survey?.title || 'survey'}_responses.xlsx`);
    setShowExportMenu(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <BuilderNavbar
        surveyId={surveyId}
        currentStep={4}
        onNavigate={onNavigate}
        rightContent={
          <div className="flex items-center gap-3">

            {/* Export dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 px-2 sm:px-3"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="w-3 h-3 hidden sm:inline" />
              </Button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-card rounded-lg shadow-lg border border-border py-1 z-40">
                    <button
                      onClick={exportCSV}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Export as CSV
                    </button>
                    <button
                      onClick={exportExcel}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      Export as Excel
                    </button>
                  </div>
                </>
              )}
            </div>

            <Button variant="primary" size="sm" className="gap-2" onClick={() => onNavigate('surveys')}>
              Return
            </Button>
          </div>
        }
      />

      <div className="pt-16 pb-8 max-w-6xl mx-auto px-8">
        {/* Header */}
        <div className="mb-6 mt-4">
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-foreground mb-2">Analytics</h2>
            <div className="flex items-center justify-center gap-3">
              {survey && (
                <Badge variant={survey.status === 'active' ? 'success' : survey.status === 'draft' ? 'neutral' : 'error'} className="capitalize">
                  {survey.status}
                </Badge>
              )}
              <span className="text-muted-foreground">{totalResponses} response{totalResponses !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center justify-center gap-2 relative">
            {(['all', '7d', '30d', 'custom'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => {
                  if (range === 'custom') {
                    if (dateRange === 'custom') {
                      setShowCustomDropdown(!showCustomDropdown);
                    } else {
                      setDateRange('custom');
                      setShowCustomDropdown(true);
                    }
                  } else {
                    setDateRange(range);
                    setShowCustomDropdown(false);
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${dateRange === range
                  ? 'bg-primary text-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
                  }`}
              >
                {range === 'all' ? (
                  <><span className="hidden sm:inline">All Time</span><span className="inline sm:hidden">All</span></>
                ) : range === '7d' ? (
                  <><span className="hidden sm:inline">Last 7 Days</span><span className="inline sm:hidden">7 Days</span></>
                ) : range === '30d' ? (
                  <><span className="hidden sm:inline">Last 30 Days</span><span className="inline sm:hidden">30 Days</span></>
                ) : 'Custom'}
              </button>
            ))}
            {dateRange === 'custom' && showCustomDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowCustomDropdown(false)} />
                <div className="absolute top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-4 z-30">
                  <div className="flex items-center gap-3 relative z-30">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">From</label>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground mt-4">to</span>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">To</label>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-8">
          <div className="flex gap-8">
            {(['overview', 'questions', 'responses'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-2 font-medium capitalize transition-colors relative ${activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {!isLoading && activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Responses</div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">{totalResponses}</div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Avg Rating</div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  {avgRating ?? '—'}
                  {avgRating && <span className="text-sm sm:text-lg font-normal text-muted-foreground"> / 5</span>}
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Questions</div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">{questions.length}</div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Latest Response</div>
                </div>
                <div className="text-base sm:text-lg font-bold text-foreground truncate">
                  {latestResponse ? formatDate(latestResponse.submittedAt) : '—'}
                </div>
              </Card>
            </div>

            {/* Responses Over Time Chart */}
            {chartData.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Responses Over Time</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary, #D4E157)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--primary, #D4E157)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: '#9CA3AF' }}
                        tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '13px' }}
                        labelFormatter={(v) => formatDate(new Date(v))}
                        formatter={(value: number) => [value, 'Responses']}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="var(--primary, #D4E157)"
                        strokeWidth={2}
                        fill="url(#colorResponses)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Empty state */}
            {totalResponses === 0 && (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No responses yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Share your survey to start collecting responses.</p>
                <Button variant="primary" size="sm" onClick={() => surveyId ? onNavigate(`surveys/${surveyId}/publish`) : undefined}>
                  Go to Publish
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* ── QUESTIONS TAB ── */}
        {!isLoading && activeTab === 'questions' && (
          <div className="space-y-6">
            {questions.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No questions in this survey.</p>
              </Card>
            )}

            {questions.map((q, qIdx) => (
              <QuestionAnalyticsCard
                key={q.id}
                question={q}
                index={qIdx}
                answers={answersByQuestion[q.id] ?? []}
                totalResponses={totalResponses}
              />
            ))}

            {totalResponses === 0 && questions.length > 0 && (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No responses yet</h3>
                <p className="text-muted-foreground text-sm">Share your survey link to start collecting data.</p>
              </Card>
            )}
          </div>
        )}

        {/* ── RESPONSES TAB ── */}
        {!isLoading && activeTab === 'responses' && (
          <ResponsesTable
            responses={responses}
            questions={questions}
          />
        )}
      </div>
    </div>
  );
}

// ── Question Analytics Card ──────────────────
function QuestionAnalyticsCard({
  question, index, answers, totalResponses,
}: {
  question: Question;
  index: number;
  answers: Answer[];
  totalResponses: number;
}) {
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [showPercent, setShowPercent] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const totalAnswers = answers.length;

  const typeLabels: Record<string, string> = {
    short: 'Short Answer', long: 'Paragraph', multiple: 'Multiple Choice',
    checkbox: 'Checkbox', dropdown: 'Dropdown', rating: 'Rating',
    grid_multiple: 'Grid (MC)', grid_checkbox: 'Grid (Checkbox)',
    date: 'Date', time: 'Time',
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-muted-foreground">{index + 1}.</span>
            <Badge className="text-xs">{typeLabels[question.type] || question.type}</Badge>
            <span className="text-sm text-muted-foreground">{totalAnswers} answer{totalAnswers !== 1 ? 's' : ''}</span>
          </div>
          <h4 className="font-semibold text-foreground">{question.text}</h4>
        </div>

        {/* Controls for choice-based questions */}
        {(question.type === 'multiple' || question.type === 'checkbox' || question.type === 'dropdown') && totalAnswers > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <div className="bg-muted rounded-full p-0.5 flex text-xs">
              <button
                onClick={() => setShowPercent(true)}
                className={`px-2.5 py-1 rounded-full transition-all ${showPercent ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                %
              </button>
              <button
                onClick={() => setShowPercent(false)}
                className={`px-2.5 py-1 rounded-full transition-all ${!showPercent ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                #
              </button>
            </div>
            <button
              onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {totalAnswers === 0 ? (
        <p className="text-sm text-muted-foreground italic">No answers yet</p>
      ) : (
        <>
          {/* Multiple Choice / Checkbox / Dropdown */}
          {(question.type === 'multiple' || question.type === 'checkbox' || question.type === 'dropdown') && (
            <ChoiceBarChart
              choices={question.options?.choices ?? []}
              answers={answers}
              totalAnswers={totalAnswers}
              showPercent={showPercent}
              sortDir={sortDir}
            />
          )}

          {/* Rating */}
          {question.type === 'rating' && (
            <RatingAnalytics
              answers={answers}
              scale={question.options?.scale ?? 5}
            />
          )}

          {/* Text responses */}
          {(question.type === 'short' || question.type === 'long') && (
            <TextResponseList
              answers={answers}
              showAll={showAll}
              onToggle={() => setShowAll(!showAll)}
            />
          )}

          {/* Grid */}
          {(question.type === 'grid_multiple' || question.type === 'grid_checkbox') && (
            <GridHeatmap
              question={question}
              answers={answers}
            />
          )}

          {/* Date / Time */}
          {(question.type === 'date' || question.type === 'time') && (
            <TextResponseList
              answers={answers}
              showAll={showAll}
              onToggle={() => setShowAll(!showAll)}
            />
          )}
        </>
      )}
    </Card>
  );
}

// ── Choice Bar Chart ─────────────────────────
function ChoiceBarChart({
  choices, answers, totalAnswers, showPercent, sortDir,
}: {
  choices: string[];
  answers: Answer[];
  totalAnswers: number;
  showPercent: boolean;
  sortDir: 'desc' | 'asc';
}) {
  const data = choices.map((choice) => {
    const count = answers.filter((a) => {
      if (Array.isArray(a.value)) return a.value.includes(choice);
      return a.value === choice;
    }).length;
    const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
    return { choice, count, pct };
  });

  const sorted = [...data].sort((a, b) =>
    sortDir === 'desc' ? b.count - a.count : a.count - b.count
  );

  const maxCount = Math.max(...sorted.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {sorted.map((d) => (
        <div key={d.choice} className="flex items-center gap-3">
          <span className="text-sm text-foreground w-40 truncate flex-shrink-0" title={d.choice}>
            {d.choice}
          </span>
          <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden relative">
            <div
              className="h-full bg-primary/60 rounded-md transition-all duration-500"
              style={{ width: `${(d.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-foreground w-20 text-right flex-shrink-0">
            {showPercent ? `${d.pct}%` : d.count}
            <span className="text-muted-foreground font-normal ml-1 text-xs">
              {showPercent ? `(${d.count})` : `(${d.pct}%)`}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Rating Analytics ─────────────────────────
function RatingAnalytics({ answers, scale }: { answers: Answer[]; scale: number }) {
  const ratings = answers.map((a) => typeof a.value === 'number' ? a.value : Number(a.value)).filter((n) => !isNaN(n));
  const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;

  const distribution = Array.from({ length: scale }, (_, i) => ({
    rating: i + 1,
    count: ratings.filter((r) => r === i + 1).length,
  }));

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="flex items-start gap-8">
      {/* Average score */}
      <div className="flex-shrink-0 text-center">
        <div className="text-4xl font-bold text-foreground">{avg.toFixed(1)}</div>
        <div className="text-sm text-muted-foreground">out of {scale}</div>
        <div className="flex gap-0.5 mt-1 justify-center">
          {Array.from({ length: scale }, (_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
            />
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{ratings.length} rating{ratings.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Distribution histogram */}
      <div className="flex-1">
        <div className="space-y-2">
          {distribution.map((d) => {
            const pct = ratings.length > 0 ? Math.round((d.count / ratings.length) * 100) : 0;
            return (
              <div key={d.rating} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-6 text-right">{d.rating}★</span>
                <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded transition-all duration-500"
                    style={{ width: `${(d.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">{d.count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Text Response List ───────────────────────
function TextResponseList({
  answers, showAll, onToggle,
}: {
  answers: Answer[];
  showAll: boolean;
  onToggle: () => void;
}) {
  const visible = showAll ? answers : answers.slice(0, 5);

  return (
    <div className="space-y-2">
      {visible.map((a, i) => (
        <div key={i} className="text-sm text-foreground bg-muted rounded-lg px-4 py-3">
          "{answerToString(a.value)}"
        </div>
      ))}
      {answers.length > 5 && (
        <button
          onClick={onToggle}
          className="text-sm text-primary font-medium hover:underline"
        >
          {showAll ? 'Show less' : `Show all ${answers.length} responses`}
        </button>
      )}
    </div>
  );
}

// ── Grid Heatmap ─────────────────────────────
function GridHeatmap({ question, answers }: { question: Question; answers: Answer[] }) {
  const rows = question.options?.rows ?? [];
  const columns = question.options?.columns ?? [];

  // Count frequencies
  const freq: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    freq[row] = {};
    for (const col of columns) freq[row][col] = 0;
  }

  for (const a of answers) {
    const val = a.value;
    if (typeof val === 'object' && !Array.isArray(val)) {
      for (const [row, selected] of Object.entries(val as Record<string, string | string[]>)) {
        if (freq[row]) {
          const selections = Array.isArray(selected) ? selected : [selected];
          for (const col of selections) {
            if (freq[row][col] !== undefined) freq[row][col]++;
          }
        }
      }
    }
  }

  const maxVal = Math.max(...Object.values(freq).flatMap((r) => Object.values(r)), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left text-muted-foreground font-medium py-2 pr-4"></th>
            {columns.map((col) => (
              <th key={col} className="text-center text-muted-foreground font-medium py-2 px-3">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-t border-border">
              <td className="py-2 pr-4 text-foreground font-medium">{row}</td>
              {columns.map((col) => {
                const count = freq[row]?.[col] ?? 0;
                const intensity = count / maxVal;
                return (
                  <td key={col} className="text-center py-2 px-3">
                    <span
                      className="inline-flex items-center justify-center w-10 h-8 rounded text-xs font-medium"
                      style={{
                        backgroundColor: count > 0 ? `rgba(212, 225, 87, ${0.15 + intensity * 0.7})` : '#f9fafb',
                        color: count > 0 ? '#1a1a1a' : '#9ca3af',
                      }}
                    >
                      {count}
                    </span>
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

// ── Responses Table ──────────────────────────
function ResponsesTable({
  responses, questions,
}: {
  responses: SurveyResponseClient[];
  questions: Question[];
}) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponseClient | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return responses;
    const term = search.toLowerCase();
    return responses.filter((r) =>
      r.answers.some((a) => answerToString(a.value).toLowerCase().includes(term))
    );
  }, [responses, search]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortCol === 'date') {
        return sortDir === 'desc'
          ? b.submittedAt.getTime() - a.submittedAt.getTime()
          : a.submittedAt.getTime() - b.submittedAt.getTime();
      }
      // Sort by question answer
      const aAnswer = a.answers.find((ans) => ans.questionId === sortCol);
      const bAnswer = b.answers.find((ans) => ans.questionId === sortCol);
      const aStr = aAnswer ? answerToString(aAnswer.value) : '';
      const bStr = bAnswer ? answerToString(bAnswer.value) : '';
      return sortDir === 'desc' ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr);
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  // Visible question columns (max 5)
  const visibleQuestions = questions.slice(0, 5);

  if (responses.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Inbox className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">No responses yet</h3>
        <p className="text-muted-foreground text-sm">Share your survey link to start collecting data.</p>
      </Card>
    );
  }

  return (
    <>
      {/* Search + Count */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search responses..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10 pr-4 py-2 w-72 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          Showing {filtered.length} of {responses.length} response{responses.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">#</th>
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors w-40"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortCol === 'date' && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                  </div>
                </th>
                {visibleQuestions.map((q) => (
                  <th
                    key={q.id}
                    className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors max-w-[200px]"
                    onClick={() => handleSort(q.id)}
                  >
                    <div className="flex items-center gap-1 truncate">
                      <span className="truncate">{q.text}</span>
                      {sortCol === q.id && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronUp className="w-3 h-3 flex-shrink-0" />)}
                    </div>
                  </th>
                ))}
                {questions.length > 5 && (
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">+{questions.length - 5} more</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedResponse(r)}
                  className="border-b border-border hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground">{page * pageSize + i + 1}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDateTime(r.submittedAt)}
                  </td>
                  {visibleQuestions.map((q) => {
                    const answer = r.answers.find((a) => a.questionId === q.id);
                    return (
                      <td key={q.id} className="px-4 py-3 text-foreground max-w-[200px] truncate">
                        {answer ? answerToString(answer.value) : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                  })}
                  {questions.length > 5 && <td className="px-4 py-3 text-muted-foreground">…</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted">
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 hover:bg-muted rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 hover:bg-muted rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Row Detail Modal */}
      {selectedResponse && (
        <ResponseDetailModal
          response={selectedResponse}
          questions={questions}
          onClose={() => setSelectedResponse(null)}
        />
      )}
    </>
  );
}

// ── Response Detail Modal ────────────────────
function ResponseDetailModal({
  response, questions, onClose,
}: {
  response: SurveyResponseClient;
  questions: Question[];
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-card shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">Response Detail</h3>
            <p className="text-sm text-muted-foreground">{formatDateTime(response.submittedAt)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {questions.map((q, idx) => {
            const answer = response.answers.find((a) => a.questionId === q.id);
            return (
              <div key={q.id}>
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-sm font-semibold text-muted-foreground">{idx + 1}.</span>
                  <p className="text-sm font-medium text-muted-foreground">{q.text}</p>
                </div>
                <div className="ml-6">
                  {answer ? (
                    <ResponseValueDisplay value={answer.value} questionType={q.type} />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No answer</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Response Value Display ───────────────────
function ResponseValueDisplay({ value, questionType }: { value: Answer['value']; questionType: string }) {
  if (questionType === 'rating') {
    const n = Number(value);
    return (
      <div className="flex gap-0.5 items-center">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < n ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
        ))}
        <span className="text-sm text-muted-foreground ml-2">{n}/5</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
        ))}
      </div>
    );
  }

  if (typeof value === 'object' && value !== null) {
    return (
      <div className="space-y-1">
        {Object.entries(value as Record<string, string | string[]>).map(([row, val]) => (
          <div key={row} className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">{row}:</span>
            <span className="text-foreground">{Array.isArray(val) ? val.join(', ') : val}</span>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-foreground text-sm">{String(value)}</p>;
}
