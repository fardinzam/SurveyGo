import { useState } from 'react';
import {
  Copy, Code2, Link2, Mail, X, Check,
  Loader2, Download, Rocket, QrCode, MessageCircle, ExternalLink, Send,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import type { SurveyClient } from '../../types/survey';
import { useSubscription } from '../../hooks/useSubscription';
import { callSendSurveyInvitation } from '../../lib/functions';

type ShareTab = 'Link' | 'QR Code' | 'Embed' | 'Email';

const TABS: { id: ShareTab; label: string; icon: React.ElementType }[] = [
  { id: 'Link',    label: 'Share Link',       icon: Link2 },
  { id: 'QR Code', label: 'QR Code',          icon: QrCode },
  { id: 'Embed',   label: 'Embed on Website', icon: Code2 },
  { id: 'Email',   label: 'Send via Email',   icon: Mail },
];

interface BuilderShareProps {
  surveyId: string;
  survey: SurveyClient;
  onPublish: () => void | Promise<void>;
  publishing: boolean;
}

export function BuilderShare({ surveyId, survey, onPublish, publishing }: BuilderShareProps) {
  const [tab, setTab] = useState<ShareTab>('Link');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const surveyUrl = `${origin}/s/${surveyId}`;

  if (survey.status !== 'active') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-brand-ghost p-6">
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 max-w-md text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-vanilla/60 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-brand-black" />
          </div>
          <h2 className="text-xl font-display font-bold text-brand-black mb-2">Ready to go live?</h2>
          <p className="text-sm text-brand-black/60 mb-6">
            Publish your survey to unlock sharing options — direct link, QR code, embeds, and email invitations.
          </p>
          <button
            onClick={onPublish}
            disabled={publishing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-black text-white rounded-xl font-semibold text-sm hover:bg-black/90 transition-colors shadow-sm disabled:opacity-60"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            Publish Survey
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto bg-brand-ghost pt-8 pb-20 px-4">
      <div className="w-full max-w-4xl flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-brand-black mb-1">Share Survey</h1>
          <p className="text-[15px] text-brand-black/60">Choose how you want to collect responses.</p>
        </div>

        {/* Split layout */}
        <div className="flex flex-col md:flex-row gap-6">

          {/* Left sidebar tabs */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left ${
                  tab === t.id
                    ? 'bg-white text-brand-black shadow-sm border border-black/5 ring-1 ring-black/5 font-medium'
                    : 'text-brand-black/60 hover:bg-black/5 hover:text-brand-black border border-transparent'
                }`}
              >
                <t.icon className={`w-5 h-5 shrink-0 ${tab === t.id ? 'text-brand-blue' : 'text-brand-black/40'}`} />
                <span className="text-[15px]">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Right content panel */}
          <div className="flex-1 bg-white rounded-3xl border border-black/5 shadow-sm p-6 md:p-10 min-h-[500px]">
            {tab === 'Link'    && <LinkPanel surveyUrl={surveyUrl} />}
            {tab === 'QR Code' && <QRPanel surveyUrl={surveyUrl} surveyId={surveyId} />}
            {tab === 'Embed'   && <EmbedPanel surveyUrl={surveyUrl} />}
            {tab === 'Email'   && <EmailPanel surveyUrl={surveyUrl} surveyId={surveyId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Brand SVG icons (lucide dropped social brand icons) ──────────────────────

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// ── Link tab ──────────────────────────────────────────────────────────────────

function LinkPanel({ surveyUrl }: { surveyUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const socials = [
    { label: 'Facebook',    icon: IconFacebook,    colorClass: 'text-blue-600',    hoverClass: 'hover:border-blue-600/30',  href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(surveyUrl)}` },
    { label: 'LinkedIn',    icon: IconLinkedIn,    colorClass: 'text-blue-700',    hoverClass: 'hover:border-blue-700/30',  href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(surveyUrl)}` },
    { label: 'X (Twitter)', icon: IconX,           colorClass: 'text-brand-black', hoverClass: 'hover:border-black/30',     href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(surveyUrl)}` },
    { label: 'WhatsApp',    icon: MessageCircle,   colorClass: 'text-green-500',   hoverClass: 'hover:border-green-500/30', href: `https://wa.me/?text=${encodeURIComponent(surveyUrl)}` },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="w-12 h-12 bg-brand-blue/20 rounded-xl flex items-center justify-center mb-6 border border-brand-blue/30 shadow-sm">
        <Link2 className="w-6 h-6 text-brand-black" />
      </div>
      <h2 className="text-xl font-bold text-brand-black mb-2">Share Link</h2>
      <p className="text-[15px] text-brand-black/60 mb-8 leading-relaxed max-w-lg">
        Copy the direct link to your survey. Anyone with this link will be able to submit a response.
      </p>

      <div className="flex items-center gap-3 mb-10">
        <input
          type="text"
          readOnly
          value={surveyUrl}
          className="flex-1 bg-brand-ghost border border-black/5 rounded-xl py-3 px-4 text-[15px] text-brand-black outline-none font-medium"
        />
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-all shadow-sm shrink-0 ${
            copied
              ? 'bg-brand-honeydew text-green-800 border border-green-200'
              : 'bg-brand-black text-white hover:bg-black/90 border border-transparent'
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      <div className="border-t border-black/5 pt-8">
        <h3 className="text-[14px] font-bold text-brand-black/60 uppercase tracking-wider mb-4">Share on Social Media</h3>
        <div className="flex flex-wrap gap-3">
          {socials.map(s => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              className={`flex items-center justify-center gap-2 flex-1 min-w-[120px] py-3 px-4 rounded-xl border border-black/5 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${s.hoverClass}`}
            >
              <s.icon className={`w-5 h-5 ${s.colorClass}`} />
              <span className="text-[14px] font-medium text-brand-black">{s.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── QR Code tab ───────────────────────────────────────────────────────────────

function QRPanel({ surveyUrl, surveyId }: { surveyUrl: string; surveyId: string }) {
  const handleDownload = () => {
    const svg = document.getElementById('survey-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 400, 400);
      const link = document.createElement('a');
      link.download = `survey-qr-${surveyId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="w-12 h-12 bg-brand-vanilla/50 rounded-xl flex items-center justify-center mb-6 border border-brand-vanilla shadow-sm">
        <QrCode className="w-6 h-6 text-brand-black" />
      </div>
      <h2 className="text-xl font-bold text-brand-black mb-2">QR Code</h2>
      <p className="text-[15px] text-brand-black/60 mb-8 leading-relaxed max-w-lg">
        Download and print this QR code. Respondents can scan it with their mobile devices to open the survey instantly.
      </p>

      <div className="flex flex-col items-center bg-brand-ghost rounded-3xl p-8 border border-black/5 shadow-inner">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 mb-4">
          <QRCodeSVG
            id="survey-qr-code"
            value={surveyUrl}
            size={200}
            level="Q"
            bgColor="#ffffff"
            fgColor="#1a1a1a"
          />
        </div>
        <span className="text-[13px] font-medium text-brand-black/50 mb-8 font-mono break-all text-center">{surveyUrl}</span>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-black/10 text-brand-black rounded-xl text-[14px] font-medium hover:bg-brand-ghost transition-all shadow-sm hover:-translate-y-px"
        >
          <Download className="w-4 h-4" />
          Download PNG
        </button>
      </div>
    </div>
  );
}

// ── Embed tab ─────────────────────────────────────────────────────────────────

function EmbedPanel({ surveyUrl }: { surveyUrl: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<iframe\n  src="${surveyUrl}"\n  width="100%"\n  height="600px"\n  frameborder="0"\n  style="border-radius: 12px; overflow: hidden; border: none;">\n</iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success('Embed code copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 border border-purple-200 shadow-sm">
        <Code2 className="w-6 h-6 text-purple-800" />
      </div>
      <h2 className="text-xl font-bold text-brand-black mb-2">Embed on Website</h2>
      <p className="text-[15px] text-brand-black/60 mb-8 leading-relaxed max-w-lg">
        Embed your survey directly into your website or blog. Copy the HTML code snippet below.
      </p>

      <div className="relative group mb-6">
        <div className="absolute right-3 top-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all shadow-sm ${
              copied
                ? 'bg-brand-honeydew text-green-800 border border-green-200'
                : 'bg-white text-brand-black border border-black/10 hover:bg-brand-ghost'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
        <pre className="w-full bg-[#1a1a1a] text-[#eef2ff] rounded-2xl p-6 text-[13px] font-mono leading-relaxed overflow-x-auto border border-black/10 shadow-inner whitespace-pre">
          <code>{snippet}</code>
        </pre>
      </div>

      <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-xl p-4 flex gap-3">
        <ExternalLink className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
        <div className="text-[14px] text-brand-black/80 leading-relaxed">
          <strong className="font-medium text-brand-black block mb-1">Responsive by default</strong>
          This embed code includes a 100% width constraint and a fixed 600px height. It will adapt to fit perfectly inside whatever container you place it in on your site.
        </div>
      </div>
    </div>
  );
}

// ── Email tab ─────────────────────────────────────────────────────────────────

function EmailPanel({ surveyUrl, surveyId }: { surveyUrl: string; surveyId: string }) {
  const { limits } = useSubscription();
  const [emails, setEmails] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [subject, setSubject] = useState("We would love your feedback!");
  const [body, setBody] = useState(`Hi there,\n\nI'd love to get your feedback. Please take a moment to complete this short survey:\n\n${surveyUrl}\n\nThank you!`);
  const [sending, setSending] = useState(false);

  const addEmail = (raw: string) => {
    const val = raw.trim().replace(',', '');
    if (val && val.includes('@') && !emails.includes(val)) {
      setEmails(prev => [...prev, val]);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(input);
    } else if (e.key === 'Backspace' && input === '' && emails.length > 0) {
      setEmails(prev => prev.slice(0, -1));
    }
  };

  const handleSend = async () => {
    if (sending || emails.length === 0) return;
    if (!limits.canSendInvites) {
      toast.error('Email invitations require a Standard or Professional plan.');
      return;
    }
    setSending(true);
    try {
      const res = await callSendSurveyInvitation({
        surveyId,
        recipients: emails,
        subject: subject.trim(),
        body: body.trim(),
      });
      toast.success(`Sent ${res.data.sent} invitation${res.data.sent === 1 ? '' : 's'}`);
      setEmails([]);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? '';
      if (msg.toLowerCase().includes('plan') || msg.toLowerCase().includes('permission')) {
        toast.error('Email invitations require a paid plan.');
      } else if (msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('exhausted')) {
        toast.error('Daily invitation limit reached for this survey.');
      } else {
        toast.error('Could not send invitations. Try again.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="w-12 h-12 bg-brand-honeydew/50 rounded-xl flex items-center justify-center mb-6 border border-brand-honeydew shadow-sm">
        <Mail className="w-6 h-6 text-green-800" />
      </div>
      <h2 className="text-xl font-bold text-brand-black mb-2">Send Invitations</h2>
      <p className="text-[15px] text-brand-black/60 mb-8 leading-relaxed max-w-lg">
        Email your survey directly to respondents. We'll include a personalized link to the survey in the message.
      </p>

      <div className="space-y-5">
        {/* To */}
        <div>
          <label className="text-[13px] font-bold text-brand-black/60 uppercase tracking-wider block mb-2">To</label>
          <div className="flex flex-wrap items-center gap-2 p-2 min-h-[50px] bg-brand-ghost border border-black/5 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue/50 rounded-xl transition-all">
            {emails.map(e => (
              <span key={e} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-white border border-black/10 shadow-sm rounded-lg text-[13px] font-medium text-brand-black">
                {e}
                <button
                  onClick={() => setEmails(prev => prev.filter(x => x !== e))}
                  className="w-5 h-5 rounded hover:bg-black/5 flex items-center justify-center text-brand-black/40 hover:text-brand-black transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            <input
              type="email"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => addEmail(input)}
              placeholder={emails.length === 0 ? 'Enter email addresses...' : ''}
              className="flex-1 min-w-[150px] bg-transparent outline-none text-[14px] px-2 placeholder:text-brand-black/30"
            />
          </div>
          <p className="text-[12px] text-brand-black/40 mt-1.5 ml-1">Press Enter or comma to add multiple recipients.</p>
        </div>

        {/* Subject */}
        <div>
          <label className="text-[13px] font-bold text-brand-black/60 uppercase tracking-wider block mb-2">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full bg-brand-ghost border border-black/5 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 rounded-xl px-4 py-3 text-[14px] outline-none transition-all shadow-sm"
          />
        </div>

        {/* Message */}
        <div>
          <label className="text-[13px] font-bold text-brand-black/60 uppercase tracking-wider block mb-2">Message</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            className="w-full bg-brand-ghost border border-black/5 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 rounded-xl p-4 text-[14px] outline-none transition-all shadow-sm resize-none leading-relaxed"
          />
        </div>

        {!limits.canSendInvites && (
          <p className="text-[13px] text-brand-black/50 bg-brand-ghost rounded-xl px-4 py-3">
            Email invitations require a Standard or Professional plan.
          </p>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSend}
            disabled={emails.length === 0 || sending || !limits.canSendInvites}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-all shadow-sm ${
              emails.length > 0 && limits.canSendInvites && !sending
                ? 'bg-brand-black text-white hover:bg-black/90 hover:-translate-y-px'
                : 'bg-brand-ghost text-brand-black/30 cursor-not-allowed'
            }`}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : `Send invitation${emails.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
