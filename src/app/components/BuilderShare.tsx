import React, { useState } from 'react';
import { Copy, Code2, Link2, Mail, X, Check, Facebook, Linkedin, Twitter, TreePine, Loader2, Download, Rocket } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import type { SurveyClient } from '../../types/survey';
import { useSubscription } from '../../hooks/useSubscription';
import { callSendSurveyInvitation } from '../../lib/functions';

type ShareTab = 'link' | 'email' | 'qr' | 'embed';

const TABS: { id: ShareTab; label: string }[] = [
  { id: 'link',  label: 'Link' },
  { id: 'email', label: 'Email' },
  { id: 'qr',    label: 'QR Code' },
  { id: 'embed', label: 'Embed' },
];

const SOCIALS = [
  { name: 'Facebook',  Icon: Facebook,  color: '#1877F2', url: (link: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}` },
  { name: 'LinkedIn',  Icon: Linkedin,  color: '#0A66C2', url: (link: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}` },
  { name: 'X',         Icon: Twitter,   color: '#000000', url: (link: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}` },
  { name: 'LinkTree',  Icon: TreePine,  color: '#43E660', url: () => 'https://linktr.ee/' },
];

interface BuilderShareProps {
  surveyId: string;
  survey: SurveyClient;
  onPublish: () => void | Promise<void>;
  publishing: boolean;
}

export function BuilderShare({ surveyId, survey, onPublish, publishing }: BuilderShareProps) {
  const [tab, setTab] = useState<ShareTab>('link');
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
    <div className="flex-1 flex flex-col overflow-hidden bg-brand-ghost">
      <div className="p-4 pb-0 shrink-0">
        <div className="max-w-[640px] mx-auto">
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

      <div className="flex-1 overflow-y-auto scrollbar-minimal p-4">
        <div className="max-w-[640px] mx-auto">
          {tab === 'link'  && <LinkView surveyUrl={surveyUrl} />}
          {tab === 'email' && <EmailView surveyUrl={surveyUrl} surveyId={surveyId} />}
          {tab === 'qr'    && <QRView surveyUrl={surveyUrl} surveyId={surveyId} />}
          {tab === 'embed' && <EmbedView surveyUrl={surveyUrl} />}
        </div>
      </div>
    </div>
  );
}

function LinkView({ surveyUrl }: { surveyUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-5">
        <div>
          <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider block mb-2">Survey link</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#f3f3f5] rounded-lg px-4 py-2.5 min-w-0">
              <Link2 className="w-4 h-4 text-brand-black/30 shrink-0" />
              <span className="text-sm text-brand-black truncate">{surveyUrl}</span>
            </div>
            <button onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                copied ? 'bg-brand-honeydew text-green-700' : 'bg-brand-vanilla text-brand-black hover:opacity-90'
              }`}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider block mb-3">Share on</label>
          <div className="flex items-center gap-3">
            {SOCIALS.map(s => (
              <a
                key={s.name}
                title={s.name}
                href={s.url(surveyUrl)}
                target="_blank"
                rel="noreferrer noopener"
                className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:opacity-90 hover:scale-105 transition-all shadow-sm"
                style={{ backgroundColor: s.color }}>
                <s.Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
        <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider block mb-2">Include a message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Write a message to share with your link..."
          rows={4}
          maxLength={500}
          className="w-full bg-[#f3f3f5] rounded-lg px-4 py-3 text-sm text-brand-black placeholder:text-brand-black/30 outline-none resize-none focus:ring-1 focus:ring-brand-black/20 transition-all"
        />
        <p className="text-xs text-brand-black/25 text-right mt-1.5">{message.length}/500</p>
      </div>
    </div>
  );
}

function EmailView({ surveyUrl, surveyId }: { surveyUrl: string; surveyId: string }) {
  const { limits } = useSubscription();
  const [emails, setEmails] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [subject, setSubject] = useState("You're invited to take a survey");
  const [body, setBody] = useState(`Hi there,\n\nI'd love to get your feedback. Please take a moment to complete this short survey:\n\n${surveyUrl}\n\nThank you!`);
  const [sending, setSending] = useState(false);

  const addEmail = () => {
    const trimmed = input.trim();
    if (trimmed && trimmed.includes('@') && !emails.includes(trimmed)) {
      setEmails([...emails, trimmed]);
      setInput('');
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
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-5">
      <div>
        <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider block mb-2">To</label>
        <div className="flex flex-wrap items-center gap-2 bg-[#f3f3f5] rounded-lg px-3 py-2 min-h-[44px]">
          {emails.map(e => (
            <span key={e} className="flex items-center gap-1 bg-white border border-black/5 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-black shadow-sm">
              {e}
              <button onClick={() => setEmails(emails.filter(x => x !== e))} className="text-brand-black/30 hover:text-brand-black transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="email"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(); } }}
            onBlur={addEmail}
            placeholder={emails.length === 0 ? 'Add email addresses...' : ''}
            className="flex-1 min-w-[150px] bg-transparent text-sm text-brand-black placeholder:text-brand-black/30 outline-none py-0.5"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider block mb-2">Subject</label>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
          className="w-full bg-[#f3f3f5] rounded-lg px-4 py-2.5 text-sm text-brand-black placeholder:text-brand-black/30 outline-none focus:ring-1 focus:ring-brand-black/20 transition-all" />
      </div>

      <div>
        <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider block mb-2">Message</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
          className="w-full bg-[#f3f3f5] rounded-lg px-4 py-3 text-sm text-brand-black placeholder:text-brand-black/30 outline-none resize-none focus:ring-1 focus:ring-brand-black/20 transition-all" />
      </div>

      {!limits.canSendInvites && (
        <p className="text-xs text-brand-black/50 bg-brand-ghost rounded-lg px-3 py-2">
          Email invitations require a Standard or Professional plan.
        </p>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={emails.length === 0 || sending || !limits.canSendInvites}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            emails.length > 0 && limits.canSendInvites
              ? 'bg-brand-vanilla text-brand-black hover:opacity-90'
              : 'bg-brand-ghost text-brand-black/30 cursor-not-allowed'
          }`}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {sending ? 'Sending...' : `Send invitation${emails.length > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

function QRView({ surveyUrl, surveyId }: { surveyUrl: string; surveyId: string }) {
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
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-8 flex flex-col items-center gap-6">
      <div className="p-4 bg-white rounded-2xl border border-black/5">
        <QRCodeSVG id="survey-qr-code" value={surveyUrl} size={192} level="H" includeMargin bgColor="#ffffff" fgColor="#000000" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-brand-black mb-1">Scan to open survey</p>
        <p className="text-xs text-brand-black/40 break-all">{surveyUrl}</p>
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand-ghost border border-black/5 rounded-lg text-sm font-medium text-brand-black/70 hover:bg-black/5 transition-colors"
      >
        <Download className="w-4 h-4" />
        Download PNG
      </button>
    </div>
  );
}

function EmbedView({ surveyUrl }: { surveyUrl: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<iframe\n  src="${surveyUrl}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border:none; border-radius:12px;"\n></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success('Embed code copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider">Embed code</label>
          <button onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied ? 'bg-brand-honeydew text-green-700' : 'bg-brand-ghost text-brand-black/60 hover:bg-black/5'
            }`}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
        <pre className="bg-brand-black text-white rounded-xl p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre">
{snippet}
        </pre>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
        <label className="text-xs font-bold text-brand-black/40 uppercase tracking-wider block mb-3">Preview</label>
        <div className="border border-black/5 rounded-xl bg-brand-ghost/30 h-40 flex items-center justify-center">
          <div className="text-center">
            <Code2 className="w-6 h-6 text-brand-black/20 mx-auto mb-2" />
            <p className="text-xs text-brand-black/30">Your survey will appear here when embedded</p>
          </div>
        </div>
      </div>
    </div>
  );
}
