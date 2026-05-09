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
