import React, { useState, useMemo } from 'react';
import { Search, Link2, Plus, X, Send } from 'lucide-react';

// ── Types & data ──────────────────────────────────────────────────────────────

type ConnectTab = 'integrations' | 'webhooks';

interface AppEntry {
  name: string;
  desc: string;
  color: string;
  logo: string;
  category: string;
  popular?: boolean;
}

const APPS: AppEntry[] = [
  { name: 'Zapier',           desc: 'Connect to 5,000+ apps via Zapier.',         color: '#FF4A00', logo: '⚡', category: 'Automation', popular: true },
  { name: 'Make',             desc: 'Build complex automations visually.',         color: '#6D00CC', logo: 'M',  category: 'Automation' },
  { name: 'HubSpot',          desc: 'Sync responses to HubSpot contacts.',        color: '#FF7A59', logo: 'H',  category: 'CRM' },
  { name: 'Salesforce',       desc: 'Push survey data to Salesforce.',            color: '#00A1E0', logo: 'SF', category: 'CRM' },
  { name: 'ActiveCampaign',   desc: 'Trigger automations from responses.',        color: '#356AE6', logo: 'AC', category: 'CRM' },
  { name: 'Slack',            desc: 'Send notifications to Slack channels.',      color: '#4A154B', logo: '#',  category: 'Communication', popular: true },
  { name: 'Microsoft Teams',  desc: 'Post updates to Teams channels.',            color: '#6264A7', logo: 'T',  category: 'Communication' },
  { name: 'Discord',          desc: 'Send response alerts to Discord.',           color: '#5865F2', logo: 'D',  category: 'Communication' },
  { name: 'Google Sheets',    desc: 'Export responses to Google Sheets.',         color: '#0F9D58', logo: 'GS', category: 'Productivity', popular: true },
  { name: 'Notion',           desc: 'Save responses to Notion databases.',        color: '#191919', logo: 'N',  category: 'Productivity' },
  { name: 'Airtable',         desc: 'Sync data to Airtable bases.',              color: '#18BFFF', logo: 'AT', category: 'Productivity' },
  { name: 'Asana',            desc: 'Create tasks from survey responses.',        color: '#F06A6A', logo: 'As', category: 'Productivity' },
  { name: 'Monday.com',       desc: 'Add items to Monday boards.',               color: '#FF3D57', logo: 'Mo', category: 'Productivity' },
  { name: 'Jira',             desc: 'Create Jira issues from feedback.',          color: '#0052CC', logo: 'J',  category: 'Productivity' },
  { name: 'Mailchimp',        desc: 'Add respondents to Mailchimp lists.',        color: '#FFE01B', logo: 'MC', category: 'Email' },
  { name: 'ConvertKit',       desc: 'Tag subscribers based on responses.',        color: '#FB6970', logo: 'CK', category: 'Email' },
  { name: 'Intercom',         desc: 'Create Intercom conversations.',             color: '#1F8DED', logo: 'IC', category: 'Support' },
  { name: 'Zendesk',          desc: 'Create support tickets from surveys.',       color: '#03363D', logo: 'Z',  category: 'Support' },
  { name: 'Stripe',           desc: 'Collect payments with surveys.',             color: '#635BFF', logo: 'S',  category: 'Payment' },
  { name: 'Webhooks',         desc: 'Send data to any URL endpoint.',            color: '#333333', logo: '{}', category: 'Developer' },
];

const CATEGORIES = ['All', ...Array.from(new Set(APPS.map(a => a.category)))];

const TABS: { id: ConnectTab; label: string }[] = [
  { id: 'integrations', label: 'Integrations' },
  { id: 'webhooks',     label: 'Webhooks' },
];

// ── Root component ────────────────────────────────────────────────────────────

export function BuilderConnect() {
  const [tab, setTab]                 = useState<ConnectTab>('integrations');
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('All');
  const [requestOpen, setRequestOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-brand-ghost">
      {/* Toolbar */}
      <div className="p-4 pb-0 shrink-0">
        <div className="max-w-[960px] mx-auto">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm h-12 flex items-center justify-center px-4">
            <div className="flex items-center gap-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    tab === t.id ? 'bg-brand-black text-white' : 'text-brand-black/50 hover:text-brand-black hover:bg-black/5'
                  }`}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-minimal p-4">
        {tab === 'integrations' ? (
          <IntegrationsView search={search} onSearch={setSearch} category={category} onCategory={setCategory} onRequestOpen={() => setRequestOpen(true)} />
        ) : (
          <WebhooksEmpty />
        )}
      </div>

      {requestOpen && <RequestModal onClose={() => setRequestOpen(false)} />}
    </div>
  );
}

// ── Integrations view ─────────────────────────────────────────────────────────

function IntegrationsView({ search, onSearch, category, onCategory, onRequestOpen }: {
  search: string; onSearch: (v: string) => void;
  category: string; onCategory: (v: string) => void;
  onRequestOpen: () => void;
}) {
  const filtered = useMemo(() => {
    let apps = APPS;
    if (category !== 'All') apps = apps.filter(a => a.category === category);
    if (search) {
      const q = search.toLowerCase();
      apps = apps.filter(a => a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
    }
    return apps;
  }, [search, category]);

  return (
    <div className="max-w-[960px] mx-auto space-y-5">
      {/* Search */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm px-4 py-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-brand-black/30 shrink-0" />
        <input type="text" value={search} onChange={e => onSearch(e.target.value)} placeholder="Search integrations..."
          className="flex-1 bg-transparent text-sm text-brand-black placeholder:text-brand-black/30 outline-none" />
        {search && (
          <button onClick={() => onSearch('')} className="w-5 h-5 flex items-center justify-center rounded-md text-brand-black/25 hover:text-brand-black transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => onCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
              category === cat
                ? 'bg-brand-black text-white shadow-sm'
                : 'bg-white text-brand-black/50 border border-black/5 hover:bg-brand-ghost hover:text-brand-black'
            }`}>{cat}{cat !== 'All' && <span className="ml-1 opacity-50">({APPS.filter(a => a.category === cat).length})</span>}</button>
        ))}
      </div>

      {/* App grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(app => (
            <div key={app.name} className="group bg-white rounded-2xl border border-black/5 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm" style={{ backgroundColor: app.color }}>
                  {app.logo}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-brand-black">{app.name}</p>
                    {app.popular && <span className="text-[9px] font-bold uppercase tracking-wider text-brand-black/40 bg-brand-vanilla/50 rounded-full px-1.5 py-0.5">Popular</span>}
                  </div>
                  <p className="text-xs text-brand-black/45 mt-1 leading-relaxed">{app.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-black/30">{app.category}</span>
                <button className="text-xs font-medium text-brand-black bg-brand-ghost border border-black/5 px-3.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-brand-vanilla hover:border-brand-vanilla/50">
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-6 h-6 text-brand-black/20 mb-3" />
          <p className="text-sm font-medium text-brand-black/50">No integrations found</p>
          <p className="text-xs text-brand-black/30 mt-1">Try a different search or category.</p>
        </div>
      )}

      {/* Request section */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-brand-black">Can&apos;t find the app you&apos;re looking for?</p>
          <p className="text-xs text-brand-black/40 mt-0.5">Let us know and we&apos;ll look into adding it.</p>
        </div>
        <button onClick={onRequestOpen} className="flex items-center gap-2 px-4 py-2 bg-brand-ghost border border-black/5 rounded-lg text-sm font-medium text-brand-black/70 hover:bg-black/5 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Request
        </button>
      </div>
    </div>
  );
}

// ── Webhooks empty state ──────────────────────────────────────────────────────

function WebhooksEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 min-h-[400px]">
      <div className="w-14 h-14 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center">
        <Link2 className="w-6 h-6 text-brand-black/25" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-brand-black mb-1">Webhooks</h3>
        <p className="text-sm text-brand-black/40 max-w-xs leading-relaxed">Send real-time data to any URL when responses are submitted. Coming soon.</p>
      </div>
      <button disabled className="mt-1 px-5 py-2 bg-brand-ghost border border-black/5 rounded-lg text-sm font-medium text-brand-black/30 cursor-not-allowed">Create webhook</button>
    </div>
  );
}

// ── Request modal ─────────────────────────────────────────────────────────────

function RequestModal({ onClose }: { onClose: () => void }) {
  const [appName, setAppName] = useState('');
  const [reason, setReason]   = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
          <h2 className="text-lg font-semibold text-brand-black font-display">Request an integration</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-brand-ghost text-brand-black/40 hover:text-brand-black transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider block mb-2">App name</label>
            <input type="text" value={appName} onChange={e => setAppName(e.target.value)} placeholder="e.g. Monday.com"
              className="w-full bg-[#f3f3f5] rounded-lg px-4 py-2.5 text-sm text-brand-black placeholder:text-brand-black/30 outline-none focus:ring-1 focus:ring-brand-black/20 transition-all" />
          </div>
          <div>
            <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider block mb-2">How would you use it? <span className="text-brand-black/20 normal-case tracking-normal">(optional)</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="I'd use this to..." rows={3}
              className="w-full bg-[#f3f3f5] rounded-lg px-4 py-2.5 text-sm text-brand-black placeholder:text-brand-black/30 outline-none resize-none focus:ring-1 focus:ring-brand-black/20 transition-all" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-black/5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-brand-black/60 hover:text-brand-black transition-colors rounded-lg hover:bg-brand-ghost">Cancel</button>
          <button disabled={!appName.trim()}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              appName.trim() ? 'bg-brand-vanilla text-brand-black hover:opacity-90' : 'bg-brand-ghost text-brand-black/30 cursor-not-allowed'
            }`}>
            <Send className="w-3.5 h-3.5" />
            Submit request
          </button>
        </div>
      </div>
    </div>
  );
}
