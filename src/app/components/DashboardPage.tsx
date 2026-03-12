import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Plus, Loader2, ChevronDown, TrendingUp, Edit3, Share2, Sparkles, ArrowRight,
} from 'lucide-react';
import { useSurveys } from '../../hooks/useSurveys';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getResponses } from '../../lib/firestore';
import type { SurveyResponseClient } from '../../types/survey';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardProps) {
  usePageTitle('Dashboard');
  const navigate = useNavigate();
  const { data: surveys = [], isLoading } = useSurveys();

  // ── Survey dropdown for Response Trend ──
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [responses, setResponses] = useState<SurveyResponseClient[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Fetch responses when a specific survey is selected
  useEffect(() => {
    if (!selectedSurveyId) {
      setResponses([]);
      return;
    }
    let cancelled = false;
    setLoadingResponses(true);
    getResponses(selectedSurveyId).then((data) => {
      if (!cancelled) setResponses(data);
    }).finally(() => {
      if (!cancelled) setLoadingResponses(false);
    });
    return () => { cancelled = true; };
  }, [selectedSurveyId]);

  // ── Computed stats ──
  const totalResponses = surveys.reduce((sum, s) => sum + s.responseCount, 0);
  const activeSurveys = surveys.filter((s) => s.status === 'active').length;
  const draftSurveys = surveys.filter((s) => s.status === 'draft').length;
  const recentSurveys = surveys.slice(0, 5);

  // ── Response Trend data ──
  const trendData = useMemo(() => {
    const now = new Date();
    const days = 14;
    const dayLabels: { date: string; dayKey: string }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayLabels.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dayKey: d.toISOString().split('T')[0],
      });
    }

    if (selectedSurveyId && responses.length > 0) {
      // Per-survey: use actual response timestamps
      const counts: Record<string, number> = {};
      dayLabels.forEach((d) => { counts[d.dayKey] = 0; });
      responses.forEach((r) => {
        const key = r.submittedAt.toISOString().split('T')[0];
        if (counts[key] !== undefined) counts[key]++;
      });
      return dayLabels.map((d) => ({ date: d.date, responses: counts[d.dayKey] }));
    }

    // Aggregate: use responseCount from each survey, distributed across last 14 days
    // We don't have individual timestamps for all surveys, so show total as a flat line
    // with the total per-day average
    const avg = surveys.length > 0 ? Math.round(totalResponses / days) : 0;
    return dayLabels.map((d) => ({ date: d.date, responses: avg }));
  }, [surveys, selectedSurveyId, responses, totalResponses]);

  // ── Top surveys by responses ──
  const topSurveys = useMemo(() => {
    return [...surveys]
      .sort((a, b) => b.responseCount - a.responseCount)
      .slice(0, 5)
      .map((s) => ({ name: s.title, responses: s.responseCount }));
  }, [surveys]);

  // ── Quick actions ──
  const quickActions = useMemo(() => {
    const actions = [];
    if (draftSurveys > 0) {
      actions.push({
        icon: Edit3,
        title: `You have ${draftSurveys} draft${draftSurveys > 1 ? 's' : ''} — finish and publish`,
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
        onClick: () => onNavigate('surveys'),
      });
    }
    if (activeSurveys > 0) {
      actions.push({
        icon: Share2,
        title: 'Share your active surveys to collect responses',
        bgColor: 'bg-green-50',
        iconColor: 'text-green-600',
        onClick: () => onNavigate('surveys'),
      });
    }
    actions.push({
      icon: Sparkles,
      title: 'Create a new survey from a template',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      onClick: () => onNavigate('templates-browse'),
    });
    return actions;
  }, [draftSurveys, activeSurveys, onNavigate]);

  const timeAgo = (d: Date) => {
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const statusStyles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    draft: 'bg-muted text-foreground',
    closed: 'bg-orange-100 text-orange-700',
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-8">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Welcome back! Here's what's happening with your surveys.</p>
        </div>
        <Button variant="primary" className="gap-2 w-full sm:w-auto" onClick={() => onNavigate('templates-browse')}>
          <Plus className="w-4 h-4" />
          New Survey
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <Card className="p-6 border border-border shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total Responses</p>
              <p className="text-3xl font-bold text-foreground">{totalResponses.toLocaleString()}</p>
            </div>
            {totalResponses > 0 && (
              <Badge variant="success" className="gap-1 text-xs">
                <TrendingUp className="w-3 h-3" />
                Live
              </Badge>
            )}
          </div>
        </Card>

        <Card className="p-6 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground mb-2">Active Surveys</p>
          <p className="text-3xl font-bold text-foreground">{activeSurveys}</p>
        </Card>

        <Card className="p-6 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground mb-2">Total Surveys</p>
          <p className="text-3xl font-bold text-foreground">{surveys.length}</p>
        </Card>

        <Card className="p-6 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground mb-2">Draft Surveys</p>
          <p className="text-3xl font-bold text-foreground">{draftSurveys}</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {/* Response Trend */}
        <Card className="p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground text-lg">Response Trend</h3>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
              >
                {selectedSurveyId
                  ? surveys.find((s) => s.id === selectedSurveyId)?.title?.slice(0, 20) + '...'
                  : 'All Surveys'}
                <ChevronDown className="w-4 h-4" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-30 py-1">
                  <button
                    onClick={() => { setSelectedSurveyId(null); setDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${!selectedSurveyId ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                  >
                    All Surveys
                  </button>
                  {surveys.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSurveyId(s.id); setDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted truncate ${selectedSurveyId === s.id ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {loadingResponses ? (
            <div className="flex items-center justify-center h-[250px]">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E2F380" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#E2F380" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#717171' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#717171' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="responses"
                  stroke="#E2F380"
                  strokeWidth={3}
                  fill="url(#responseGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Top Surveys by Responses */}
        <Card className="p-6 border border-border shadow-sm">
          <div className="mb-6">
            <h3 className="font-semibold text-foreground text-lg">Top Surveys by Responses</h3>
          </div>
          {topSurveys.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No survey data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topSurveys} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#717171' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#717171' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#C5EDCE" stopOpacity={1} />
                    <stop offset="100%" stopColor="#E2F380" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <Bar dataKey="responses" fill="url(#barGradient)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-4 sm:p-6 border border-border shadow-sm mb-6">
        <h3 className="font-semibold text-foreground text-lg mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={action.onClick}
                className={`${action.bgColor} p-4 rounded-lg text-left hover:shadow-md transition-all group border border-transparent hover:border-border`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`w-5 h-5 ${action.iconColor} mt-0.5 flex-shrink-0`} />
                    <p className="text-sm font-medium text-gray-900">{action.title}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Recent Surveys Table */}
      <Card className="p-6 border border-border shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-foreground text-lg">Recent Surveys</h3>
          <Button variant="ghost" onClick={() => onNavigate('surveys')}>
            View all
          </Button>
        </div>

        {recentSurveys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No surveys yet. Create your first one!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Survey Title</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Responses</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {recentSurveys.map((survey) => (
                  <tr
                    key={survey.id}
                    className="border-b border-gray-50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate(`/app/surveys/${survey.id}/edit`)}
                  >
                    <td className="py-4 px-4">
                      <span className="font-semibold text-foreground hover:text-primary transition-colors text-sm">
                        {survey.title}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant="neutral"
                        className={`${statusStyles[survey.status] || ''} capitalize text-xs`}
                      >
                        {survey.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-sm text-foreground">{survey.responseCount}</td>
                    <td className="py-4 px-4 text-sm text-muted-foreground hidden sm:table-cell">{timeAgo(survey.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
