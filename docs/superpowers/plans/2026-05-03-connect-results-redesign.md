# Connect & Results Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visual design of `BuilderConnect.tsx` and `BuilderResults.tsx` with the new layouts from the SurveyGoResults prototype, preserving all existing functionality.

**Architecture:** Both components are self-contained builder tab panels rendered inside `DashboardBuilder.tsx`. No routing changes needed. New design adopts a header + white-card-body layout for Connect, and a header + 4-tab layout for Results. All existing data hooks, export logic, and subscription gating carry forward unchanged.

**Tech Stack:** React, TypeScript, Tailwind CSS (brand tokens), Recharts, Lucide React, Vitest + Testing Library

---

## File Map

| File | Action |
|---|---|
| `src/app/components/BuilderConnect.tsx` | Rewrite — new layout, preserve app list + RequestModal |
| `src/app/components/BuilderResults.tsx` | Update — add 4-tab layout, preserve all hooks/logic |
| `src/app/components/BuilderConnect.test.tsx` | Create — smoke tests |
| `src/app/components/BuilderResults.test.tsx` | Create — smoke tests |

---

## Task 1: Smoke test for BuilderConnect

**Files:**
- Create: `src/app/components/BuilderConnect.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// src/app/components/BuilderConnect.test.tsx
import '../../test/mocks/firebase'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../test/helpers'
import { BuilderConnect } from './BuilderConnect'

describe('BuilderConnect', () => {
  it('renders Connect & Automate header', () => {
    const { getByText } = renderWithProviders(<BuilderConnect />)
    expect(getByText('Connect & Automate')).toBeInTheDocument()
  })

  it('renders Apps tab content by default', () => {
    const { getByPlaceholderText } = renderWithProviders(<BuilderConnect />)
    expect(getByPlaceholderText('Search integrations...')).toBeInTheDocument()
  })

  it('switches to Webhooks tab', async () => {
    const { getByText } = renderWithProviders(<BuilderConnect />)
    getByText('Webhooks').click()
    expect(getByText('Add a Webhook')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/components/BuilderConnect.test.tsx
```

Expected: FAIL — "Connect & Automate" not found (old design has different header)

---

## Task 2: Rewrite BuilderConnect.tsx

**Files:**
- Modify: `src/app/components/BuilderConnect.tsx`

- [ ] **Step 1: Replace the file with the new implementation**

```tsx
// src/app/components/BuilderConnect.tsx
import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Send, Webhook } from 'lucide-react';

type ConnectTab = 'apps' | 'webhooks';

interface AppEntry {
  name: string;
  desc: string;
  color: string;
  logo: string;
  category: string;
  popular?: boolean;
}

const APPS: AppEntry[] = [
  { name: 'Zapier',          desc: 'Connect to 5,000+ apps via Zapier.',        color: '#FF4A00', logo: '⚡', category: 'Automation', popular: true },
  { name: 'Make',            desc: 'Build complex automations visually.',        color: '#6D00CC', logo: 'M',  category: 'Automation' },
  { name: 'HubSpot',         desc: 'Sync responses to HubSpot contacts.',       color: '#FF7A59', logo: 'H',  category: 'CRM' },
  { name: 'Salesforce',      desc: 'Push survey data to Salesforce.',           color: '#00A1E0', logo: 'SF', category: 'CRM' },
  { name: 'ActiveCampaign',  desc: 'Trigger automations from responses.',       color: '#356AE6', logo: 'AC', category: 'CRM' },
  { name: 'Slack',           desc: 'Send notifications to Slack channels.',     color: '#4A154B', logo: '#',  category: 'Communication', popular: true },
  { name: 'Microsoft Teams', desc: 'Post updates to Teams channels.',           color: '#6264A7', logo: 'T',  category: 'Communication' },
  { name: 'Discord',         desc: 'Send response alerts to Discord.',          color: '#5865F2', logo: 'D',  category: 'Communication' },
  { name: 'Google Sheets',   desc: 'Export responses to Google Sheets.',        color: '#0F9D58', logo: 'GS', category: 'Productivity', popular: true },
  { name: 'Notion',          desc: 'Save responses to Notion databases.',       color: '#191919', logo: 'N',  category: 'Productivity' },
  { name: 'Airtable',        desc: 'Sync data to Airtable bases.',             color: '#18BFFF', logo: 'AT', category: 'Productivity' },
  { name: 'Asana',           desc: 'Create tasks from survey responses.',       color: '#F06A6A', logo: 'As', category: 'Productivity' },
  { name: 'Monday.com',      desc: 'Add items to Monday boards.',              color: '#FF3D57', logo: 'Mo', category: 'Productivity' },
  { name: 'Jira',            desc: 'Create Jira issues from feedback.',         color: '#0052CC', logo: 'J',  category: 'Productivity' },
  { name: 'Mailchimp',       desc: 'Add respondents to Mailchimp lists.',       color: '#FFE01B', logo: 'MC', category: 'Email' },
  { name: 'ConvertKit',      desc: 'Tag subscribers based on responses.',       color: '#FB6970', logo: 'CK', category: 'Email' },
  { name: 'Intercom',        desc: 'Create Intercom conversations.',            color: '#1F8DED', logo: 'IC', category: 'Support' },
  { name: 'Zendesk',         desc: 'Create support tickets from surveys.',      color: '#03363D', logo: 'Z',  category: 'Support' },
  { name: 'Stripe',          desc: 'Collect payments with surveys.',            color: '#635BFF', logo: 'S',  category: 'Payment' },
  { name: 'Webhooks',        desc: 'Send data to any URL endpoint.',           color: '#333333', logo: '{}', category: 'Developer' },
];

const CATEGORIES = ['All', ...Array.from(new Set(APPS.map(a => a.category)))];

export function BuilderConnect() {
  const [tab, setTab]                 = useState<ConnectTab>('apps');
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('All');
  const [requestOpen, setRequestOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-brand-ghost pt-8 pb-20 px-4">
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-brand-black mb-1">Connect & Automate</h1>
            <p className="text-[15px] text-brand-black/60">Link your survey to external tools or trigger custom webhooks.</p>
          </div>
          <div className="flex items-center p-1 bg-black/5 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setTab('apps')}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === 'apps'
                  ? 'bg-white text-brand-black shadow-sm border border-black/5'
                  : 'text-brand-black/60 hover:text-brand-black hover:bg-black/[0.02] border border-transparent'
              }`}
            >
              Connect Apps
            </button>
            <button
              onClick={() => setTab('webhooks')}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === 'webhooks'
                  ? 'bg-white text-brand-black shadow-sm border border-black/5'
                  : 'text-brand-black/60 hover:text-brand-black hover:bg-black/[0.02] border border-transparent'
              }`}
            >
              Webhooks
            </button>
          </div>
        </div>

        {/* Card body */}
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 md:p-8 min-h-[500px]">
          {tab === 'apps' ? (
            <AppsView
              search={search}
              onSearch={setSearch}
              category={category}
              onCategory={setCategory}
              onRequestOpen={() => setRequestOpen(true)}
            />
          ) : (
            <WebhooksView />
          )}
        </div>
      </div>

      {requestOpen && <RequestModal onClose={() => setRequestOpen(false)} />}
    </div>
  );
}

// ── Apps view ─────────────────────────────────────────────────────────────────

function AppsView({ search, onSearch, category, onCategory, onRequestOpen }: {
  search: string;
  onSearch: (v: string) => void;
  category: string;
  onCategory: (v: string) => void;
  onRequestOpen: () => void;
}) {
  const filtered = useMemo(() => {
    let apps = APPS;
    if (category !== 'All') apps = apps.filter(a => a.category === category);
    if (search) {
      const q = search.toLowerCase();
      apps = apps.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return apps;
  }, [search, category]);

  return (
    <div className="flex flex-col gap-6">
      {/* Search & category filters */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-black/40" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="w-full bg-brand-ghost border border-black/5 rounded-xl py-2.5 pl-10 pr-9 text-[14px] outline-none hover:border-black/10 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all placeholder:text-brand-black/30"
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-brand-black/30 hover:text-brand-black transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => onCategory(cat)}
              className={`px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors border ${
                category === cat
                  ? 'bg-brand-black text-white border-brand-black'
                  : 'bg-white text-brand-black/60 border-black/10 hover:border-brand-black/30 hover:text-brand-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* App grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(app => (
            <div
              key={app.name}
              className="bg-white rounded-2xl p-5 border border-black/10 shadow-sm hover:shadow-md hover:border-brand-blue/30 transition-all flex flex-col group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: app.color }}
                >
                  {app.logo}
                </div>
                <button className="px-4 py-1.5 text-xs font-bold text-brand-black bg-brand-ghost border border-black/5 hover:bg-brand-honeydew hover:border-brand-honeydew rounded-lg transition-all opacity-0 md:opacity-100 group-hover:opacity-100 shadow-sm">
                  Connect
                </button>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-[16px] text-brand-black">{app.name}</h3>
                {app.popular && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-brand-black/40 bg-brand-vanilla/50 rounded-full px-1.5 py-0.5">
                    Popular
                  </span>
                )}
              </div>
              <p className="text-[13px] text-brand-black/60 leading-relaxed line-clamp-2">{app.desc}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-brand-ghost rounded-2xl flex items-center justify-center border border-black/5 mb-4">
            <Search className="w-8 h-8 text-brand-black/20" />
          </div>
          <h3 className="font-bold text-[16px] text-brand-black mb-1">No apps found</h3>
          <p className="text-[14px] text-brand-black/50 max-w-sm">
            We couldn't find any integrations matching your search. Try different keywords or clear your filters.
          </p>
          <button
            onClick={() => { onSearch(''); onCategory('All'); }}
            className="mt-4 text-[14px] font-medium text-brand-blue hover:text-blue-600 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Request section */}
      <div className="mt-2 bg-brand-ghost rounded-2xl border border-black/5 px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-brand-black">Can't find the app you're looking for?</p>
          <p className="text-xs text-brand-black/40 mt-0.5">Let us know and we'll look into adding it.</p>
        </div>
        <button
          onClick={onRequestOpen}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-lg text-sm font-medium text-brand-black/70 hover:bg-black/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Request
        </button>
      </div>
    </div>
  );
}

// ── Webhooks view ─────────────────────────────────────────────────────────────

function WebhooksView() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-10">
      <div className="w-20 h-20 bg-brand-honeydew/30 rounded-3xl flex items-center justify-center border border-brand-honeydew mb-6 shadow-sm">
        <Webhook className="w-10 h-10 text-green-700" />
      </div>
      <h2 className="text-xl font-bold font-display text-brand-black mb-2">Add a Webhook</h2>
      <p className="text-[15px] text-brand-black/60 text-center max-w-md mb-8 leading-relaxed">
        Send real-time HTTP POST requests to your own servers whenever a survey response is submitted.
      </p>
      <button className="flex items-center gap-2 px-6 py-3 bg-brand-black text-white rounded-xl text-sm font-medium hover:bg-black/90 transition-colors shadow-md hover:-translate-y-px">
        <Plus className="w-4 h-4" />
        Add Endpoint
      </button>
      <div className="w-full max-w-2xl mt-12 border-t border-black/5 pt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-brand-black/60 uppercase tracking-wider">Active Webhooks</h3>
          <span className="text-xs font-medium text-brand-black/40 bg-black/5 px-2 py-0.5 rounded-md">0 configured</span>
        </div>
        <div className="bg-brand-ghost rounded-xl border border-black/5 border-dashed p-8 text-center">
          <p className="text-sm text-brand-black/40">No webhooks have been added yet.</p>
        </div>
      </div>
    </div>
  );
}

// ── Request modal ─────────────────────────────────────────────────────────────

function RequestModal({ onClose }: { onClose: () => void }) {
  const [appName, setAppName] = useState('');
  const [reason, setReason]   = useState('');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
          <h2 className="text-lg font-semibold text-brand-black font-display">Request an integration</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-brand-ghost text-brand-black/40 hover:text-brand-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider block mb-2">App name</label>
            <input
              type="text"
              value={appName}
              onChange={e => setAppName(e.target.value)}
              placeholder="e.g. Monday.com"
              className="w-full bg-brand-ghost rounded-lg px-4 py-2.5 text-sm text-brand-black placeholder:text-brand-black/30 outline-none focus:ring-1 focus:ring-brand-black/20 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider block mb-2">
              How would you use it?{' '}
              <span className="text-brand-black/20 normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="I'd use this to..."
              rows={3}
              className="w-full bg-brand-ghost rounded-lg px-4 py-2.5 text-sm text-brand-black placeholder:text-brand-black/30 outline-none resize-none focus:ring-1 focus:ring-brand-black/20 transition-all"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-black/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-brand-black/60 hover:text-brand-black transition-colors rounded-lg hover:bg-brand-ghost"
          >
            Cancel
          </button>
          <button
            disabled={!appName.trim()}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              appName.trim()
                ? 'bg-brand-vanilla text-brand-black hover:opacity-90'
                : 'bg-brand-ghost text-brand-black/30 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Submit request
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 3: Run Connect tests and commit

- [ ] **Step 1: Run the tests**

```bash
npx vitest run src/app/components/BuilderConnect.test.tsx
```

Expected: 3 tests passing

- [ ] **Step 2: Run full type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/components/BuilderConnect.tsx src/app/components/BuilderConnect.test.tsx
git commit -m "feat: redesign BuilderConnect with new header, card layout, and upgraded webhooks panel"
```

---

## Task 4: Smoke tests for BuilderResults

**Files:**
- Create: `src/app/components/BuilderResults.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// src/app/components/BuilderResults.test.tsx
import '../../test/mocks/firebase'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../../test/helpers'
import { BuilderResults } from './BuilderResults'

vi.mock('../../hooks/useResponses', () => ({
  useResponses: () => ({ data: [], isLoading: false }),
}))
vi.mock('../../hooks/useSurveys', () => ({
  useSurvey: () => ({ data: { title: 'My Survey', status: 'active', questions: [] }, isLoading: false }),
}))
vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({ limits: { canExport: true } }),
}))

describe('BuilderResults', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<BuilderResults surveyId="test-id" />)
    expect(container).toBeTruthy()
  })

  it('shows survey title in header', () => {
    const { getByText } = renderWithProviders(<BuilderResults surveyId="test-id" />)
    expect(getByText('My Survey')).toBeInTheDocument()
  })

  it('renders all four tabs', () => {
    const { getByText } = renderWithProviders(<BuilderResults surveyId="test-id" />)
    expect(getByText('Overview')).toBeInTheDocument()
    expect(getByText('Questions')).toBeInTheDocument()
    expect(getByText('Responses')).toBeInTheDocument()
    expect(getByText('Insights')).toBeInTheDocument()
  })

  it('shows no-responses empty state in Overview', () => {
    const { getByText } = renderWithProviders(<BuilderResults surveyId="test-id" />)
    expect(getByText('No responses yet')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/components/BuilderResults.test.tsx
```

Expected: FAIL — tabs not present in current design

---

## Task 5: Rewrite BuilderResults.tsx

**Files:**
- Modify: `src/app/components/BuilderResults.tsx`

- [ ] **Step 1: Replace the file with the new implementation**

```tsx
// src/app/components/BuilderResults.tsx
import React, { useState, useMemo } from 'react';
import {
  BarChart2, TrendingUp, Loader2, Download, FileDown,
  CheckCircle2, Clock, Eye, Inbox, Share, Lightbulb,
  Search, Calendar, ChevronRight,
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
```

---

## Task 6: Run Results tests and commit

- [ ] **Step 1: Run the tests**

```bash
npx vitest run src/app/components/BuilderResults.test.tsx
```

Expected: 4 tests passing

- [ ] **Step 2: Run full type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run all tests to check for regressions**

```bash
npx vitest run
```

Expected: all tests passing

- [ ] **Step 4: Commit**

```bash
git add src/app/components/BuilderResults.tsx src/app/components/BuilderResults.test.tsx
git commit -m "feat: redesign BuilderResults with 4-tab layout, new header, and Insights placeholder"
```

---

## Self-Review Checklist

- [x] **Connect header** → Task 2 renders "Connect & Automate" title + subtitle
- [x] **Apps tab** → Task 2 has search, category filters, 3-column grid, empty state, request section
- [x] **Request modal** → Task 2 preserves full modal with app name + reason fields
- [x] **Webhooks tab** → Task 2 has Add Endpoint button + Active Webhooks empty state
- [x] **Results header** → Task 5 shows survey title + status badge + Export + Share
- [x] **4 tabs** → Task 5 renders Overview / Questions / Responses / Insights
- [x] **Overview metrics** → Task 5 has 4 cards (1 live, 3 placeholders) + chart + chart footer
- [x] **Questions tab** → Task 5 uses `questionSummaries` (same computation as restored file)
- [x] **Responses tab** → Task 5 has simple list with date + first answer
- [x] **Insights tab** → Task 5 has static placeholder (AI Summary, Keywords, Quotes)
- [x] **Export gating** → Task 5 carries `useSubscription` / `limits.canExport` check unchanged
- [x] **Loading state** → Task 5 shows `Loader2` spinner while `isLoading`
- [x] **TypeScript** → Both tasks include `npx tsc --noEmit` verification step
- [x] **No unresolved error** → `BuilderResults` is restored; plan overwrites it cleanly
