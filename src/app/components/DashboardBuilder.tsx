import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ArrowLeft, Eye, Plus, GripVertical, Copy, Trash2, ChevronDown, Sparkles,
  LayoutTemplate, Settings, X, Loader2, Send, MessageSquare, Type, AlignLeft,
  List, CheckSquare, ChevronsUpDown, Star, Calendar, Clock, Grid3x3,
  AlertTriangle, Monitor, Smartphone, Undo2, Redo2, Palette, Upload,
  RotateCcw, SlidersHorizontal, Search, FileUp, Image as ImageIcon, Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSurvey, useUpdateSurvey } from '../../hooks/useSurveys';
import { useSubscription } from '../../hooks/useSubscription';
import { canUseAI } from '../../lib/planLimits';
import { callGenerateQuestions, type GeneratedQuestion } from '../../lib/functions';
import type { Question, QuestionType, SurveyClient, SurveySettings } from '../../types/survey';
import { DEFAULT_SURVEY_SETTINGS } from '../../types/survey';
import { BuilderLogic } from './BuilderLogic';
import { BuilderConnect } from './BuilderConnect';
import { BuilderShare } from './BuilderShare';
import { BuilderResults } from './BuilderResults';
import { ProfileDropdown } from './DashboardLayout';
import { SettingsModal as AccountSettingsModal } from './SettingsModal';

type BuilderTab = 'Build' | 'Logic' | 'Connect' | 'Share' | 'Results';
type RightTab = 'Edit' | 'AI';
interface DashboardBuilderProps { surveyId: string; }
interface QTypeOption { type: QuestionType; label: string; icon: React.ElementType; color: string; }

const QUESTION_TYPES: QTypeOption[] = [
  { type: 'short',         label: 'Short answer',          icon: Type,          color: 'bg-brand-blue' },
  { type: 'long',          label: 'Long answer',           icon: AlignLeft,     color: 'bg-brand-blue' },
  { type: 'multiple',      label: 'Multiple choice',       icon: List,          color: 'bg-brand-vanilla' },
  { type: 'checkbox',      label: 'Checkbox',              icon: CheckSquare,   color: 'bg-brand-vanilla' },
  { type: 'dropdown',      label: 'Dropdown',              icon: ChevronsUpDown,color: 'bg-brand-vanilla' },
  { type: 'rating',        label: 'Linear scale',          icon: Star,          color: 'bg-brand-honeydew' },
  { type: 'grid_multiple', label: 'Multiple choice grid',  icon: Grid3x3,       color: 'bg-brand-honeydew' },
  { type: 'grid_checkbox', label: 'Checkbox grid',         icon: Grid3x3,       color: 'bg-brand-honeydew' },
  { type: 'date',          label: 'Date',                  icon: Calendar,      color: 'bg-brand-ghost' },
  { type: 'time',          label: 'Time',                  icon: Clock,         color: 'bg-brand-ghost' },
  { type: 'welcome',       label: 'Welcome',        icon: LayoutTemplate,color: 'bg-brand-vanilla' },
  { type: 'ending',        label: 'Ending',         icon: LayoutTemplate,color: 'bg-brand-honeydew' },
];
const QTYPE_CATEGORIES = [
  { name: 'Text',    types: ['short', 'long'] },
  { name: 'Choice',  types: ['multiple', 'checkbox', 'dropdown'] },
  { name: 'Scale',   types: ['rating'] },
  { name: 'Grid',    types: ['grid_multiple', 'grid_checkbox'] },
  { name: 'Date & Time', types: ['date', 'time'] },
  { name: 'Screens', types: ['welcome', 'ending'] },
];
function typeOption(t: QuestionType): QTypeOption { return QUESTION_TYPES.find(o => o.type === t) ?? QUESTION_TYPES[0]; }
function newId(): string { return `q_${Math.random().toString(36).slice(2, 10)}`; }
function makeQuestion(type: QuestionType): Question {
  const b: Question = { id: newId(), type, text: '', required: false };
  switch (type) {
    case 'multiple': case 'checkbox': case 'dropdown': return { ...b, options: { choices: ['Option 1', 'Option 2'] } };
    case 'rating': return { ...b, options: { scale: 5, ratingLow: 1, ratingHigh: 5 } };
    case 'grid_multiple': case 'grid_checkbox': return { ...b, options: { rows: ['Row 1', 'Row 2'], columns: ['Col 1', 'Col 2'] } };
    case 'date': return { ...b, options: { dateFormat: 'MMDDYYYY', dateDivider: 'slash' } };
    case 'welcome': return { ...b, text: 'Welcome to our survey', required: false };
    case 'ending': return { ...b, text: 'Thank you for your responses!', required: false };
    default: return b;
  }
}
function mapAiType(t: GeneratedQuestion['type']): QuestionType {
  switch (t) { case 'multiple-choice': case 'yes-no': return 'multiple'; case 'checkbox': return 'checkbox'; case 'short-answer': return 'short'; case 'long-answer': return 'long'; case 'rating': return 'rating'; default: return 'short'; }
}
function aiToQuestion(g: GeneratedQuestion): Question {
  const type = mapAiType(g.type);
  const q: Question = { id: newId(), type, text: g.text, required: !!g.required };
  if (g.type === 'yes-no' && !g.options?.length) q.options = { choices: ['Yes', 'No'] };
  else if ((type === 'multiple' || type === 'checkbox') && g.options?.length) q.options = { choices: g.options };
  else if (type === 'rating') q.options = { scale: 5 };
  return q;
}
// ── Tooltip wrapper ──────────────────────────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-brand-black text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-20">
        {label}
      </div>
    </div>
  );
}

// ── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (<button type="button" onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${checked ? 'bg-brand-black' : 'bg-black/10'}`}><div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} /></button>);
}
function ColorSwatch({ color }: { color: string }) {
  return (<div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1.5 cursor-pointer hover:bg-brand-ghost transition-colors"><div className="w-4 h-4 rounded-full border border-black/15 shrink-0" style={{ background: color }} /><ChevronDown className="w-3 h-3 text-muted-foreground" /></div>);
}

// ── Survey Settings Modal ────────────────────────────────────────────────────
function SurveySettingsModal({ settings, onChange, onClose }: { settings: SurveySettings; onChange: (s: SurveySettings) => void; onClose: () => void; }) {
  const [tab, setTab] = useState<'general' | 'advanced'>('general');
  const set = <K extends keyof SurveySettings>(k: K, v: SurveySettings[K]) => onChange({ ...settings, [k]: v });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-display font-semibold text-brand-black">Survey Settings</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-brand-black hover:bg-brand-ghost transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {(['general', 'advanced'] as const).map(t => (<button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-brand-black text-white' : 'text-muted-foreground hover:text-brand-black'}`}>{t}</button>))}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-minimal p-6 space-y-4 max-h-[60vh]">
          {tab === 'general' ? (<>
            <SR label="Collect email addresses" desc="Require respondents to enter their email"><select value={settings.collectEmail} onChange={e => set('collectEmail', e.target.value)} className="appearance-none bg-input-background border-none rounded-lg py-1.5 pl-3 pr-8 text-sm font-medium text-brand-black outline-none"><option value="none">None</option><option value="optional">Optional</option><option value="required">Required</option></select></SR>
            <div className="h-px bg-border" />
            <SR label="Send copy to responder" desc="Email a copy of their responses"><select value={settings.sendCopy} onChange={e => set('sendCopy', e.target.value)} className="appearance-none bg-input-background border-none rounded-lg py-1.5 pl-3 pr-8 text-sm font-medium text-brand-black outline-none"><option value="off">No</option><option value="always">Yes</option><option value="whenRequested">Upon request</option></select></SR>
            <div className="h-px bg-border" />
            <SR label="Allow response editing" desc="Let respondents change answers after submitting"><Toggle checked={settings.allowEditing} onChange={v => set('allowEditing', v)} /></SR>
            <div className="h-px bg-border" />
            <SR label="Limit to 1 response" desc="Prevent the same person from responding twice"><Toggle checked={settings.limitOneResponse} onChange={v => set('limitOneResponse', v)} /></SR>
            <div className="h-px bg-border" />
            <SR label="Show progress bar" desc="Display completion progress to respondents"><Toggle checked={settings.showProgressBar} onChange={v => set('showProgressBar', v)} /></SR>
            <div className="h-px bg-border" />
            <SR label="Show question numbers" desc="Number each question in the survey"><Toggle checked={settings.showQuestionNumber ?? true} onChange={v => set('showQuestionNumber', v)} /></SR>
          </>) : (<div className="flex flex-col items-center justify-center py-12 text-center"><div className="w-12 h-12 rounded-xl bg-brand-ghost flex items-center justify-center mb-4"><Settings className="w-5 h-5 text-muted-foreground" /></div><p className="text-sm font-medium text-muted-foreground">Coming soon</p></div>)}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-ghost transition-colors">Cancel</button>
          <button onClick={onClose} className="px-5 py-2 bg-brand-black text-white rounded-lg text-sm font-medium hover:bg-black/90 transition-colors">Save changes</button>
        </div>
      </div>
    </div>
  );
}
function SR({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (<div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-brand-black">{label}</p><p className="text-xs text-muted-foreground mt-0.5">{desc}</p></div><div className="shrink-0">{children}</div></div>);
}

// ── Add Question Modal ───────────────────────────────────────────────────────
type AddQTab = 'elements' | 'import' | 'ai';
function AddQuestionModal({ onSelect, onClose }: { onSelect: (t: QuestionType) => void; onClose: () => void; }) {
  const [tab, setTab] = useState<AddQTab>('elements');
  const [search, setSearch] = useState('');
  const [importText, setImportText] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const filtered = search ? QTYPE_CATEGORIES.map(c => ({ ...c, types: c.types.filter(t => typeOption(t as QuestionType).label.toLowerCase().includes(search.toLowerCase())) })).filter(c => c.types.length) : QTYPE_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: '75vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
          <div className="flex gap-1">
            {([{ key: 'elements' as AddQTab, label: 'Add question' }, { key: 'import' as AddQTab, label: 'Import questions' }, { key: 'ai' as AddQTab, label: 'Create with AI' }]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tab === t.key ? 'bg-brand-black text-white' : 'text-muted-foreground hover:text-brand-black'}`}>{t.label}</button>
            ))}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-brand-black hover:bg-brand-ghost transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
        {tab === 'elements' && (
          <div className="flex-1 overflow-y-auto scrollbar-minimal p-5" style={{ minHeight: '280px' }}>
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-8 pr-3 py-2 bg-input-background rounded-lg text-xs outline-none placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-5">
              {filtered.map(cat => (
                <div key={cat.name}>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{cat.name}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {cat.types.map(t => { const opt = typeOption(t as QuestionType); const Icon = opt.icon; return (
                      <button key={t} onClick={() => { onSelect(t as QuestionType); onClose(); }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-white hover:bg-brand-ghost hover:border-brand-black/20 transition-all text-left">
                        <div className={`w-7 h-7 rounded-lg ${opt.color} flex items-center justify-center border border-black/5 shrink-0`}><Icon className="w-3.5 h-3.5 text-brand-black/70" /></div>
                        <span className="text-xs font-medium text-brand-black">{opt.label}</span>
                      </button>
                    ); })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'import' && (<>
          <div className="flex flex-1 min-h-0 p-5 gap-4 overflow-hidden" style={{ minHeight: '280px' }}>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-brand-black">Paste your questions</label>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Type or paste your questions, one per line."
                className="flex-1 resize-none border border-border rounded-xl p-3 text-xs text-brand-black outline-none placeholder:text-muted-foreground bg-input-background" />
            </div>
            <div className="w-44 shrink-0 flex flex-col gap-3 pt-5">
              <div className="bg-brand-blue/30 border border-brand-blue rounded-xl p-3">
                <FileUp className="w-4 h-4 text-brand-black/50 mb-1.5" />
                <ul className="space-y-1 text-[10px] text-brand-black/60 font-medium list-disc list-inside"><li>One question per line</li><li>Add answers below</li><li>Edit formatting later</li></ul>
              </div>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-border flex justify-end shrink-0">
            <button disabled={!importText.trim()} className="px-4 py-1.5 bg-brand-black text-white rounded-lg text-xs font-medium disabled:opacity-30 hover:bg-black/90 transition-colors">Import</button>
          </div>
        </>)}
        {tab === 'ai' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3" style={{ minHeight: '280px' }}>
            <div className="w-10 h-10 rounded-xl bg-brand-vanilla/30 flex items-center justify-center"><Sparkles className="w-4 h-4 text-brand-black" /></div>
            <div><p className="text-sm font-semibold text-brand-black mb-0.5">Generate with AI</p><p className="text-xs text-muted-foreground">Describe what you'd like to create</p></div>
            <div className="w-full max-w-sm relative">
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g. Create a customer satisfaction survey..."
                className="w-full h-20 resize-none border border-border rounded-xl p-3 text-xs text-brand-black outline-none placeholder:text-muted-foreground bg-input-background" />
              <button className="absolute bottom-2 right-2 w-6 h-6 bg-brand-black text-white rounded-lg flex items-center justify-center hover:bg-black/90 transition-colors"><Send className="w-3 h-3" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Auto-save ────────────────────────────────────────────────────────────────
function useAutoSave(surveyId: string, server: SurveyClient | null | undefined, local: { title: string; description: string; questions: Question[]; settings: SurveySettings }) {
  const update = useUpdateSurvey();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!server) return;
    const changed = server.title !== local.title || server.description !== local.description || JSON.stringify(server.questions) !== JSON.stringify(local.questions) || JSON.stringify(server.settings ?? DEFAULT_SURVEY_SETTINGS) !== JSON.stringify(local.settings);
    if (!changed) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => { setSaving(true); try { await update.mutateAsync({ id: surveyId, data: { title: local.title, description: local.description, questions: local.questions, settings: local.settings } }); setLastSaved(new Date()); } catch { toast.error('Could not save'); } finally { setSaving(false); } }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.title, local.description, local.questions, local.settings, server?.id]);
  return { saving, lastSaved };
}

// ── Undo/Redo ────────────────────────────────────────────────────────────────
function useUndoRedo<T>(initial: T) {
  const [state, setState] = useState(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const push = useCallback((next: T) => {
    past.current.push(state);
    future.current = [];
    setState(next);
  }, [state]);
  const undo = useCallback(() => {
    if (!past.current.length) return;
    future.current.push(state);
    setState(past.current.pop()!);
  }, [state]);
  const redo = useCallback(() => {
    if (!future.current.length) return;
    past.current.push(state);
    setState(future.current.pop()!);
  }, [state]);
  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;
  return { state, setState: push, setDirect: setState, undo, redo, canUndo, canRedo };
}

// ── AI Chat ──────────────────────────────────────────────────────────────────
interface ChatMsg { id: number; sender: 'user' | 'ai'; text: string; }
function AIChatPanel({ survey, existingQuestions, onAppendQuestions }: { survey: SurveyClient | null; existingQuestions: Question[]; onAppendQuestions: (q: Question[]) => void; }) {
  const { plan } = useSubscription();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([{ id: 1, sender: 'ai', text: "Hi! Describe what you'd like to add." }]);
  const handleSend = async () => {
    const text = input.trim(); if (!text || loading) return;
    if (!canUseAI(plan)) { toast.error('AI features require a Standard or Professional plan.'); return; }
    setMessages(p => [...p, { id: Date.now(), sender: 'user', text }]); setInput(''); setLoading(true);
    try {
      const result = await callGenerateQuestions({ surveyTitle: survey?.title ?? 'Untitled', surveyDescription: survey?.description ?? '', existingQuestions: existingQuestions.map(q => ({ text: q.text, type: q.type })), userPrompt: text });
      const nq = (result.data.questions ?? []).map(aiToQuestion);
      if (!nq.length) { setMessages(p => [...p, { id: Date.now()+1, sender: 'ai', text: "Couldn't generate. Try being more specific." }]); return; }
      onAppendQuestions(nq);
      setMessages(p => [...p, { id: Date.now()+1, sender: 'ai', text: `Added ${nq.length} question${nq.length===1?'':'s'}.` }]);
    } catch (err) { const msg = (err as {message?:string})?.message??''; setMessages(p => [...p, { id: Date.now()+1, sender: 'ai', text: msg.toLowerCase().includes('plan') ? 'Requires paid plan.' : 'Error. Try again.' }]); }
    finally { setLoading(false); }
  };
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-minimal">
        {messages.map(m => (<div key={m.id} className={`flex gap-2 ${m.sender==='user'?'flex-row-reverse':''}`}>{m.sender==='ai'&&<div className="w-6 h-6 rounded-full bg-brand-vanilla/40 flex items-center justify-center shrink-0 mt-0.5"><Sparkles className="w-3 h-3 text-brand-black" /></div>}<div className={`rounded-xl px-3 py-2 text-xs max-w-[85%] leading-relaxed ${m.sender==='user'?'bg-brand-black text-white':'bg-brand-ghost text-brand-black border border-border'}`}>{m.text}</div></div>))}
        {loading&&<div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-brand-vanilla/40 flex items-center justify-center shrink-0"><Loader2 className="w-3 h-3 text-brand-black animate-spin" /></div><div className="rounded-xl px-3 py-2 text-xs bg-brand-ghost text-muted-foreground border border-border">Thinking...</div></div>}
      </div>
      <div className="p-3 border-t border-border shrink-0">
        <div className="relative"><MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder={canUseAI(plan)?'Ask AI to help...':'Upgrade to use AI'} disabled={!canUseAI(plan)}
            className="w-full bg-input-background border border-border rounded-lg py-2 pl-8 pr-9 text-xs placeholder:text-muted-foreground outline-none focus:border-brand-black/20" />
          <button onClick={handleSend} disabled={loading||!input.trim()||!canUseAI(plan)} className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-brand-black text-white flex items-center justify-center disabled:opacity-40 hover:bg-black/90">{loading?<Loader2 className="w-3 h-3 animate-spin" />:<Send className="w-3 h-3" />}</button>
        </div>
      </div>
    </div>
  );
}

// ── Question Editor (right panel) ────────────────────────────────────────────
function QuestionEditor({ question, onChange }: { question: Question | null; onChange: (q: Question) => void; }) {
  if (!question) return <div className="p-5 text-xs text-muted-foreground text-center">Select a question to edit.</div>;
  const o = question.options ?? {};
  const setOpt = (u: Partial<NonNullable<Question['options']>>) => onChange({ ...question, options: { ...o, ...u } });
  const t = question.type;
  const isScreen = t === 'welcome' || t === 'ending';
  const selLimitOn = o.selectionLimit === 'exact' || o.selectionLimit === 'range';

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-4 space-y-5">
      {/* Question Type */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Question Type</label>
        <div className="relative"><select value={t} onChange={e=>{const nt=e.target.value as QuestionType;const r=makeQuestion(nt);onChange({...r,id:question.id,text:question.text,required:question.required});}} className="w-full appearance-none bg-input-background rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-brand-black outline-none">{QUESTION_TYPES.map(x=><option key={x.type} value={x.type}>{x.label}</option>)}</select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" /></div>
      </div>

      {/* Settings */}
      <div className="space-y-3">
        {!isScreen && (
          <label className="flex items-center justify-between cursor-pointer"><span className="text-xs text-brand-black">Required</span><Toggle checked={question.required} onChange={v=>onChange({...question,required:v})} /></label>
        )}

        {(t==='short'||t==='long')&&<>
          <div className="h-px bg-border" />
          <label className="flex items-center justify-between cursor-pointer"><span className="text-xs text-brand-black">Max characters</span><Toggle checked={!!o.charLimitEnabled} onChange={v=>setOpt({charLimitEnabled:v})} /></label>
          {o.charLimitEnabled&&<input type="number" min={1} value={o.charLimit??255} onChange={e=>setOpt({charLimit:Math.max(1,parseInt(e.target.value)||1)})} className="w-full bg-input-background rounded-lg px-3 py-1.5 text-xs outline-none" placeholder="255" />}
          <div className="h-px bg-border" />
          <label className="flex items-center justify-between cursor-pointer"><span className="text-xs text-brand-black">Validation (regex)</span><Toggle checked={!!o.validationEnabled} onChange={v=>setOpt({validationEnabled:v})} /></label>
          {o.validationEnabled&&<input type="text" value={o.validationRegex??''} onChange={e=>setOpt({validationRegex:e.target.value})} className="w-full bg-input-background rounded-lg px-3 py-1.5 text-xs outline-none font-mono" placeholder="^[A-Za-z]+$" />}
        </>}

        {t==='multiple'&&<><div className="h-px bg-border" /><label className="flex items-center justify-between cursor-pointer"><span className="text-xs text-brand-black">Randomize</span><Toggle checked={!!o.randomize} onChange={v=>setOpt({randomize:v})} /></label></>}

        {t==='checkbox'&&<>
          <div className="h-px bg-border" />
          <label className="flex items-center justify-between cursor-pointer"><span className="text-xs text-brand-black">Selection limit</span><Toggle checked={selLimitOn} onChange={v=>setOpt({selectionLimit:v?'exact':'unlimited'})} /></label>
          {selLimitOn&&<>
            <div className="relative"><select value={o.selectionLimit} onChange={e=>setOpt({selectionLimit:e.target.value as 'exact'|'range'})} className="w-full appearance-none bg-input-background rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-brand-black outline-none"><option value="exact">Exact number</option><option value="range">Range</option></select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" /></div>
            {o.selectionLimit==='exact'&&<input type="number" min={1} value={o.selectionExact??1} onChange={e=>setOpt({selectionExact:Math.max(1,parseInt(e.target.value)||1)})} className="w-full bg-input-background rounded-lg px-3 py-1.5 text-xs outline-none" placeholder="Number of selections" />}
            {o.selectionLimit==='range'&&<div className="flex gap-2"><input type="number" min={0} value={o.selectionMin??0} onChange={e=>setOpt({selectionMin:Math.max(0,parseInt(e.target.value)||0)})} className="flex-1 bg-input-background rounded-lg px-3 py-1.5 text-xs outline-none" placeholder="Min" /><input type="number" min={1} value={o.selectionMax??5} onChange={e=>setOpt({selectionMax:Math.max(1,parseInt(e.target.value)||1)})} className="flex-1 bg-input-background rounded-lg px-3 py-1.5 text-xs outline-none" placeholder="Max" /></div>}
          </>}
          <div className="h-px bg-border" />
          <label className="flex items-center justify-between cursor-pointer"><span className="text-xs text-brand-black">Randomize</span><Toggle checked={!!o.randomize} onChange={v=>setOpt({randomize:v})} /></label>
        </>}

        {t==='dropdown'&&<><div className="h-px bg-border" /><label className="flex items-center justify-between cursor-pointer"><span className="text-xs text-brand-black">Randomize</span><Toggle checked={!!o.randomize} onChange={v=>setOpt({randomize:v})} /></label></>}

        {t==='rating'&&<>
          <div className="h-px bg-border" />
          <div><span className="text-[10px] text-muted-foreground block mb-1">Display</span><div className="relative"><select value={o.ratingStyle??'numeric'} onChange={e=>setOpt({ratingStyle:e.target.value as 'numeric'|'star'})} className="w-full appearance-none bg-input-background rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-brand-black outline-none"><option value="numeric">Numbers</option><option value="star">Stars</option></select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" /></div></div>
          <div className="flex gap-2">
            <div className="flex-1"><span className="text-[10px] text-muted-foreground block mb-1">Lower</span><div className="relative"><select value={o.ratingLow??1} onChange={e=>setOpt({ratingLow:parseInt(e.target.value)})} className="w-full appearance-none bg-input-background rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-brand-black outline-none"><option value={0}>0</option><option value={1}>1</option></select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" /></div></div>
            <div className="flex-1"><span className="text-[10px] text-muted-foreground block mb-1">Upper</span><div className="relative"><select value={o.ratingHigh??5} onChange={e=>setOpt({ratingHigh:parseInt(e.target.value)})} className="w-full appearance-none bg-input-background rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-brand-black outline-none">{Array.from({length:9},(_,i)=>i+2).map(n=><option key={n} value={n}>{n}</option>)}</select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" /></div></div>
          </div>
          <input type="text" value={o.lowLabel??''} onChange={e=>setOpt({lowLabel:e.target.value})} placeholder="Min label" className="w-full bg-input-background rounded-lg px-3 py-1.5 text-xs outline-none" />
          <input type="text" value={o.midLabel??''} onChange={e=>setOpt({midLabel:e.target.value})} placeholder="Mid label" className="w-full bg-input-background rounded-lg px-3 py-1.5 text-xs outline-none" />
          <input type="text" value={o.highLabel??''} onChange={e=>setOpt({highLabel:e.target.value})} placeholder="Max label" className="w-full bg-input-background rounded-lg px-3 py-1.5 text-xs outline-none" />
        </>}

        {t==='date'&&<>
          <div className="h-px bg-border" />
          <div><span className="text-xs text-brand-black block mb-1.5">Date format</span><div className="relative"><select value={o.dateFormat??'MMDDYYYY'} onChange={e=>setOpt({dateFormat:e.target.value})} className="w-full appearance-none bg-input-background rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-brand-black outline-none"><option value="MMDDYYYY">MM/DD/YYYY</option><option value="DDMMYYYY">DD/MM/YYYY</option><option value="YYYYMMDD">YYYY/MM/DD</option></select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" /></div></div>
          <div><span className="text-xs text-brand-black block mb-1.5">Divider</span><div className="relative"><select value={o.dateDivider??'slash'} onChange={e=>setOpt({dateDivider:e.target.value})} className="w-full appearance-none bg-input-background rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-brand-black outline-none"><option value="slash">Slash (/)</option><option value="dash">Dash (-)</option><option value="period">Period (.)</option></select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" /></div></div>
        </>}
      </div>

      {/* Image/Video upload */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Media</label>
        <button className="w-full h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-brand-ghost/40 transition-colors">
          <ImageIcon className="w-4 h-4" /><span className="text-[10px] font-medium">Upload image or video</span>
        </button>
        <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, GIF, MP4 · Max 10 MB</p>
      </div>
    </div>
  );
}

// ── Question Card (canvas) ───────────────────────────────────────────────────
function QuestionCard({ question, index, selected, showNumber, onSelect, onChange, onDuplicate, onDelete, onDragStart }: {
  question: Question; index: number; selected: boolean; showNumber: boolean;
  onSelect: () => void; onChange: (q: Question) => void; onDuplicate: () => void; onDelete: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const opt = typeOption(question.type);
  const o = question.options ?? {};
  const choices = o.choices ?? [];
  const rows = o.rows ?? [];
  const cols = o.columns ?? [];
  const sel = () => onSelect();
  const handleFocus = (e: React.FocusEvent) => { e.stopPropagation(); sel(); };
  const handleClick = (e: React.MouseEvent) => { e.stopPropagation(); sel(); };
  const isScreen = question.type === 'welcome' || question.type === 'ending';
  const ratingLow = o.ratingLow ?? 1;
  const ratingHigh = o.ratingHigh ?? 5;
  const ratingNums = Array.from({ length: ratingHigh - ratingLow + 1 }, (_, i) => i + ratingLow);

  const updateChoiceAt = (i: number, v: string) => { const nc = [...choices]; nc[i] = v; onChange({ ...question, options: { ...o, choices: nc } }); };
  const removeChoice = (i: number) => onChange({ ...question, options: { ...o, choices: choices.filter((_, j) => j !== i) } });
  const addChoice = () => onChange({ ...question, options: { ...o, choices: [...choices, `Option ${choices.length + 1}`] } });
  const addRow = () => onChange({ ...question, options: { ...o, rows: [...rows, `Row ${rows.length + 1}`] } });
  const addCol = () => onChange({ ...question, options: { ...o, columns: [...cols, `Col ${cols.length + 1}`] } });
  const updateRow = (i: number, v: string) => { const nr = [...rows]; nr[i] = v; onChange({ ...question, options: { ...o, rows: nr } }); };
  const updateCol = (i: number, v: string) => { const nc = [...cols]; nc[i] = v; onChange({ ...question, options: { ...o, columns: nc } }); };

  return (
    <div id={`question-${question.id}`} onMouseDown={sel}
      className={`relative group bg-white rounded-xl p-5 border transition-all duration-200 ${selected ? 'border-brand-vanilla shadow-md ring-1 ring-brand-vanilla/40' : 'border-border shadow-sm hover:border-brand-black/15'}`}>
      {/* Floating actions */}
      <div className="absolute -right-10 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
        <Tooltip label="Drag to reorder"><button onMouseDown={onDragStart} className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center text-muted-foreground hover:text-brand-black hover:bg-brand-ghost shadow-sm cursor-grab active:cursor-grabbing"><GripVertical className="w-3 h-3" /></button></Tooltip>
        <Tooltip label="Duplicate"><button onClick={e=>{e.stopPropagation();onDuplicate();}} className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center text-muted-foreground hover:text-brand-black hover:bg-brand-ghost shadow-sm"><Copy className="w-3 h-3" /></button></Tooltip>
        <Tooltip label="Delete"><button onClick={e=>{e.stopPropagation();onDelete();}} className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 shadow-sm"><Trash2 className="w-3 h-3" /></button></Tooltip>
      </div>

      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start gap-2.5">
          {showNumber && !isScreen && <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${opt.color} text-brand-black/70 shrink-0 mt-0.5`}>{index+1}</div>}
          <div className="flex-1 min-w-0">
            <textarea value={question.text} onChange={e=>onChange({...question,text:e.target.value})} onClick={handleClick} onFocus={handleFocus} maxLength={500} rows={1}
              ref={el=>{if(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}}}
              onInput={e=>{const t=e.currentTarget;t.style.height='auto';t.style.height=t.scrollHeight+'px';}}
              placeholder={isScreen ? (question.type === 'welcome' ? 'Welcome title...' : 'Thank you message...') : 'Type your question here...'}
              className={`w-full bg-transparent outline-none placeholder:text-muted-foreground/50 border-b border-transparent focus:border-brand-black/20 pb-0.5 transition-colors resize-none overflow-hidden ${isScreen ? 'text-lg font-display font-semibold text-brand-black' : 'text-sm font-medium text-brand-black'}`} />
            {question.text.length > 400 && <p className="text-[10px] text-muted-foreground text-right">{500 - question.text.length} characters remaining</p>}
            <textarea placeholder="Description (optional)" onClick={handleClick} onFocus={handleFocus} rows={1}
              ref={el=>{if(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}}}
              onInput={e=>{const t=e.currentTarget;t.style.height='auto';t.style.height=t.scrollHeight+'px';}}
              className="w-full text-xs text-muted-foreground bg-transparent outline-none placeholder:text-muted-foreground/40 mt-0.5 resize-none overflow-hidden" />
          </div>
          {question.required && <span className="text-destructive text-base font-bold shrink-0">*</span>}
        </div>
      </div>

      {/* Answer area */}
      <div className={showNumber && !isScreen ? 'ml-7' : ''}>
        {/* Short answer: clear bg, underline on focus, no wrap, horizontal scroll */}
        {question.type==='short'&&<div>
          <input disabled placeholder="Short text answer" className="w-full bg-transparent border-b border-border focus:border-brand-black/30 px-0 py-2 text-xs placeholder:text-muted-foreground outline-none overflow-x-auto whitespace-nowrap" />
          {o.charLimitEnabled&&o.charLimit&&<p className="text-[10px] text-muted-foreground mt-1 text-right">{o.charLimit} character limit</p>}
        </div>}

        {/* Long answer: clear bg, underline, auto-grow */}
        {question.type==='long'&&<div>
          <textarea disabled placeholder="Long text answer" rows={2} className="w-full bg-transparent border-b border-border focus:border-brand-black/30 px-0 py-2 text-xs placeholder:text-muted-foreground outline-none resize-none overflow-hidden" style={{ minHeight: '3rem' }} />
          {o.charLimitEnabled&&o.charLimit&&<p className="text-[10px] text-muted-foreground mt-1 text-right">{o.charLimit} character limit</p>}
        </div>}

        {/* Multiple choice / Dropdown — no gray bg on options */}
        {(question.type==='multiple'||question.type==='dropdown')&&<div className="space-y-1">
          {choices.map((c,i)=>(<div key={i} className="group/opt flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-brand-ghost/40 transition-colors"><div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" /><input type="text" value={c} onChange={e=>updateChoiceAt(i,e.target.value)} onClick={handleClick} onFocus={handleFocus} className="flex-1 text-xs text-brand-black/70 bg-transparent outline-none border-b border-transparent focus:border-brand-black/20 pb-0.5" />{choices.length>2&&<button onClick={e=>{e.stopPropagation();removeChoice(i);}} className="opacity-0 group-hover/opt:opacity-100 w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all shrink-0"><X className="w-3 h-3" /></button>}</div>))}
          <button onClick={e=>{e.stopPropagation();addChoice();}} className="flex items-center gap-2.5 px-1 py-1.5 text-muted-foreground text-xs hover:text-brand-black transition-colors rounded-lg hover:bg-brand-ghost/40"><div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-muted-foreground/30 shrink-0" /><span>Add option</span></button>
        </div>}

        {/* Checkbox — no gray bg on options */}
        {question.type==='checkbox'&&<div className="space-y-1">
          {choices.map((c,i)=>(<div key={i} className="group/opt flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-brand-ghost/40 transition-colors"><div className="w-3.5 h-3.5 rounded border-2 border-muted-foreground/30 shrink-0" /><input type="text" value={c} onChange={e=>updateChoiceAt(i,e.target.value)} onClick={handleClick} onFocus={handleFocus} className="flex-1 text-xs text-brand-black/70 bg-transparent outline-none border-b border-transparent focus:border-brand-black/20 pb-0.5" />{choices.length>2&&<button onClick={e=>{e.stopPropagation();removeChoice(i);}} className="opacity-0 group-hover/opt:opacity-100 w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all shrink-0"><X className="w-3 h-3" /></button>}</div>))}
          <button onClick={e=>{e.stopPropagation();addChoice();}} className="flex items-center gap-2.5 px-1 py-1.5 text-muted-foreground text-xs hover:text-brand-black transition-colors rounded-lg hover:bg-brand-ghost/40"><div className="w-3.5 h-3.5 rounded border-2 border-dashed border-muted-foreground/30 shrink-0" /><span>Add option</span></button>
        </div>}

        {/* Rating / Linear scale — labels underneath */}
        {question.type==='rating'&&<div className="flex flex-col items-center w-full">
          <div className="flex items-center justify-center gap-1.5 w-full">
            {ratingNums.map(n=>(o.ratingStyle==='star'
              ?<div key={n} className="flex-1 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"><Star className="w-6 h-6 text-brand-vanilla stroke-brand-black/40" style={{ fill: 'currentColor' }} /></div>
              :<div key={n} className="flex-1 h-8 rounded-lg border border-border flex items-center justify-center text-xs font-medium text-brand-black/60 hover:bg-brand-ghost transition-colors">{n}</div>))}
          </div>
          {(o.lowLabel || o.midLabel || o.highLabel) && (
            <div className="flex w-full mt-1">
              <span className="text-[10px] text-muted-foreground flex-1 text-left truncate">{o.lowLabel ?? ''}</span>
              {o.midLabel && <span className="text-[10px] text-muted-foreground flex-1 text-center truncate">{o.midLabel}</span>}
              <span className="text-[10px] text-muted-foreground flex-1 text-right truncate">{o.highLabel ?? ''}</span>
            </div>
          )}
        </div>}

        {question.type==='date'&&<input disabled type="text" placeholder={`${(o.dateFormat??'MMDDYYYY').replace(/(.{2,4})/g,'$1'+({slash:'/',dash:'-',period:'.'}[o.dateDivider??'slash']??'/')).slice(0,-1)}`} className="bg-transparent border-b border-border px-0 py-2 text-xs placeholder:text-muted-foreground outline-none" />}
        {question.type==='time'&&<input disabled type="time" className="bg-transparent border-b border-border px-0 py-2 text-xs outline-none" />}

        {/* Grid — with add row/col buttons */}
        {(question.type==='grid_multiple'||question.type==='grid_checkbox')&&<div className="overflow-x-auto">
          <table className="text-xs text-brand-black/70 table-fixed w-full" style={{ wordBreak: 'break-word' }}>
            <thead><tr><th className="w-1/4" />
              {cols.map((c,i)=><th key={i} className="px-2 py-1"><input type="text" value={c} onChange={e=>updateCol(i,e.target.value)} onClick={handleClick} onFocus={handleFocus} className="w-full min-w-0 text-center text-[10px] font-medium text-muted-foreground bg-transparent outline-none border-b border-transparent focus:border-brand-black/20" /></th>)}
              <th className="w-10"><button onClick={e=>{e.stopPropagation();addCol();}} className="px-2 py-1 text-[10px] text-muted-foreground hover:text-brand-black transition-colors whitespace-nowrap">+ Col</button></th>
            </tr></thead>
            <tbody>
              {rows.map((r,ri)=>(<tr key={ri}><td className="pr-2 py-1"><input type="text" value={r} onChange={e=>updateRow(ri,e.target.value)} onClick={handleClick} onFocus={handleFocus} className="w-full min-w-0 text-xs font-medium bg-transparent outline-none border-b border-transparent focus:border-brand-black/20" /></td>{cols.map((_,ci)=>(<td key={ci} className="px-2 py-1 text-center"><span className={`inline-block w-3.5 h-3.5 border-2 border-muted-foreground/30 ${question.type==='grid_checkbox'?'rounded':'rounded-full'}`} /></td>))}<td /></tr>))}
              <tr><td><button onClick={e=>{e.stopPropagation();addRow();}} className="text-[10px] text-muted-foreground hover:text-brand-black transition-colors py-1">+ Row</button></td></tr>
            </tbody>
          </table>
        </div>}

        {/* Welcome / Ending screen */}
        {isScreen && <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-brand-ghost/30 transition-colors cursor-pointer">
          <ImageIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium">Add image or video</span>
        </div>}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function DashboardBuilder({ surveyId }: DashboardBuilderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: survey, isLoading, error } = useSurvey(surveyId);
  const updateMut = useUpdateSurvey();

  const initialTab = (searchParams.get('tab') as BuilderTab) || 'Build';
  const [activeTab, setActiveTab] = useState<BuilderTab>(initialTab);
  const [activeRightTab, setActiveRightTab] = useState<RightTab>('Edit');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { state: questions, setState: setQuestions, setDirect: setQuestionsDirect, undo, redo, canUndo, canRedo } = useUndoRedo<Question[]>([]);
  const [surveySettings, setSurveySettings] = useState<SurveySettings>(DEFAULT_SURVEY_SETTINGS);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deviceView, setDeviceView] = useState<'desktop'|'mobile'>('desktop');
  const [designTab, setDesignTab] = useState<'logo'|'font'|'buttons'|'background'>('logo');
  const [designHeight, setDesignHeight] = useState(250);
  const isDragging = useRef(false);
  const dragFromIdx = useRef<number|null>(null);
  const dragToIdx = useRef<number|null>(null);
  const [dragVisualIdx, setDragVisualIdx] = useState<number|null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sidebarDragFrom = useRef<number|null>(null);
  const sidebarDragTo = useRef<number|null>(null);
  const [sidebarDragVisualIdx, setSidebarDragVisualIdx] = useState<number|null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Design panel resizer
  useEffect(() => {
    const move = (e: MouseEvent) => { if (!isDragging.current) return; setDesignHeight(Math.max(150, Math.min(window.innerHeight - e.clientY - 24, window.innerHeight * 0.6))); };
    const up = () => { isDragging.current = false; document.body.style.cursor = 'default'; };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  }, [undo, redo]);

  // Load survey
  useEffect(() => {
    if (survey) {
      setTitle(survey.title); setDescription(survey.description); setQuestionsDirect(survey.questions);
      setSurveySettings(survey.settings ?? DEFAULT_SURVEY_SETTINGS);
      if (!selectedQuestionId && survey.questions.length > 0) setSelectedQuestionId(survey.questions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survey?.id]);

  useEffect(() => {
    const c = searchParams.get('tab');
    if (activeTab === 'Build' && c) { const n = new URLSearchParams(searchParams); n.delete('tab'); setSearchParams(n, { replace: true }); }
    else if (activeTab !== 'Build' && c !== activeTab) { const n = new URLSearchParams(searchParams); n.set('tab', activeTab); setSearchParams(n, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const { saving, lastSaved } = useAutoSave(surveyId, survey ?? null, { title, description, questions, settings: surveySettings });
  const selectedQuestion = useMemo(() => questions.find(q => q.id === selectedQuestionId) ?? null, [questions, selectedQuestionId]);
  const updateQuestion = useCallback((q: Question) => setQuestions(questions.map(p => (p.id === q.id ? q : p))), [questions, setQuestions]);

  const handleAddQuestion = (t: QuestionType) => {
    const q = makeQuestion(t);
    let next: Question[];
    if (t === 'welcome') {
      next = [q, ...questions.filter(x => x.type !== 'welcome')];
    } else if (t === 'ending') {
      const withoutEnding = questions.filter(x => x.type !== 'ending');
      next = [...withoutEnding, q];
    } else {
      const endingIdx = questions.findIndex(x => x.type === 'ending');
      if (endingIdx >= 0) { next = [...questions]; next.splice(endingIdx, 0, q); }
      else next = [...questions, q];
    }
    setQuestions(next); setSelectedQuestionId(q.id);
    setTimeout(() => document.getElementById(`question-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };
  const handleAppendAi = (nq: Question[]) => { setQuestions([...questions, ...nq]); if (nq.length && !selectedQuestionId) setSelectedQuestionId(nq[0].id); };
  const handleDuplicate = (id: string) => { const idx = questions.findIndex(q => q.id === id); if (idx === -1) return; const next = [...questions]; next.splice(idx + 1, 0, { ...questions[idx], id: newId() }); setQuestions(next); };
  const handleDelete = (id: string) => { setQuestions(questions.filter(q => q.id !== id)); if (selectedQuestionId === id) setSelectedQuestionId(null); };
  const handleSelectQuestion = useCallback((id: string) => { setSelectedQuestionId(id); setTimeout(() => document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }, []);

  // Drag-to-reorder
  const handleDragStart = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragFromIdx.current = idx;
    dragToIdx.current = idx;
    setDragVisualIdx(idx);
    const onMove = (me: MouseEvent) => {
      const cards = canvasRef.current?.querySelectorAll('[data-qidx]');
      if (!cards) return;
      let closest = idx, closestDist = Infinity;
      cards.forEach(el => { const r = el.getBoundingClientRect(); const d = Math.abs(me.clientY - (r.top + r.height / 2)); if (d < closestDist) { closestDist = d; closest = parseInt(el.getAttribute('data-qidx')!); } });
      dragToIdx.current = closest;
      setDragVisualIdx(closest);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
      const from = dragFromIdx.current!, to = dragToIdx.current!;
      dragFromIdx.current = null; dragToIdx.current = null; setDragVisualIdx(null);
      if (from !== to) {
        const next = [...questions]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); setQuestions(next);
      }
    };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  }, [setQuestions, questions]);

  const handleSidebarDragStart = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    sidebarDragFrom.current = idx;
    sidebarDragTo.current = idx;
    setSidebarDragVisualIdx(idx);
    const onMove = (me: MouseEvent) => {
      const items = sidebarRef.current?.querySelectorAll('[data-sidx]');
      if (!items) return;
      let closest = idx, closestDist = Infinity;
      items.forEach(el => { const r = el.getBoundingClientRect(); const d = Math.abs(me.clientY - (r.top + r.height / 2)); if (d < closestDist) { closestDist = d; closest = parseInt(el.getAttribute('data-sidx')!); } });
      sidebarDragTo.current = closest;
      setSidebarDragVisualIdx(closest);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
      const from = sidebarDragFrom.current!, to = sidebarDragTo.current!;
      sidebarDragFrom.current = null; sidebarDragTo.current = null; setSidebarDragVisualIdx(null);
      if (from !== to) {
        const next = [...questions]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); setQuestions(next);
      }
    };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  }, [setQuestions, questions]);

  const handlePublish = async () => {
    if (publishing || !survey) return;
    if (!questions.length) { toast.error('Add at least one question'); return; }
    setPublishing(true);
    try { await updateMut.mutateAsync({ id: surveyId, data: { title, description, questions, status: 'active' } }); toast.success('Published!'); }
    catch { toast.error('Could not publish'); } finally { setPublishing(false); }
  };
  const handleCopyLink = () => { navigator.clipboard.writeText(`${window.location.origin}/s/${surveyId}`); toast.success('Link copied'); };
  const [accountSettingsSection, setAccountSettingsSection] = useState<string | null>(null);

  const isActive = survey?.status === 'active';
  const showNum = surveySettings.showQuestionNumber ?? true;
  const NAV = [{ label: 'Build' as BuilderTab, step: 1 }, { label: 'Logic' as BuilderTab, step: 2 }, { label: 'Connect' as BuilderTab, step: 3 }, { label: 'Share' as BuilderTab, step: 4 }, ...(isActive ? [{ label: 'Results' as BuilderTab, step: 5 }] : [])];
  const DT = ['logo', 'font', 'buttons', 'background'] as const;

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-brand-ghost"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (error || !survey) return (<div className="flex flex-col items-center justify-center h-screen bg-brand-ghost gap-3"><AlertTriangle className="w-8 h-8 text-destructive" /><p className="text-sm text-muted-foreground">Survey not found.</p><Link to="/dashboard" className="text-sm font-medium text-brand-black underline">Back</Link></div>);

  return (
    <div className="flex flex-col h-screen bg-brand-ghost font-sans text-brand-black overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 bg-white border-b border-border flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3 w-1/4 min-w-0">
          <Link to="/dashboard" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-brand-ghost text-muted-foreground hover:text-brand-black transition-colors shrink-0"><ArrowLeft className="w-4 h-4" /></Link>
          <input type="text" value={title} onChange={e=>setTitle(e.target.value)} className="text-sm font-medium bg-transparent border border-transparent hover:border-border focus:border-brand-black/20 rounded-lg px-2 py-1 outline-none w-full max-w-[220px] truncate transition-colors" placeholder="Survey Title" />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 hidden md:block">{saving?'Saving...':lastSaved?`Saved ${lastSaved.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:''}</span>
        </div>
        <nav className="flex items-center">
          {NAV.map((item, idx) => (<React.Fragment key={item.label}><button onClick={()=>setActiveTab(item.label)} className="flex items-center gap-1.5 group"><div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${activeTab===item.label?'bg-brand-black text-white':'bg-muted text-muted-foreground group-hover:bg-brand-black/15'}`}>{item.step}</div><span className={`text-xs font-medium transition-colors ${activeTab===item.label?'text-brand-black':'text-muted-foreground group-hover:text-brand-black/60'}`}>{item.label}</span></button>{idx<NAV.length-1&&<div className="mx-3 w-8 border-t-2 border-dashed border-border shrink-0" />}</React.Fragment>))}
        </nav>
        <div className="flex items-center justify-end gap-2 w-1/4">
          {isActive ? (
            <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-ghost text-brand-black border border-border text-xs font-medium rounded-lg hover:bg-white transition-colors"><Link2 className="w-3.5 h-3.5" />Share Link</button>
          ) : (<>
            <Link to="/dashboard/pricing" className="px-4 py-1.5 bg-brand-vanilla text-brand-black text-xs font-medium rounded-lg hover:opacity-90 transition-colors shadow-sm">View Plans</Link>
            <button onClick={handlePublish} disabled={publishing} className="px-4 py-1.5 bg-brand-black text-white text-xs font-medium rounded-lg hover:bg-black/90 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-60">{publishing&&<Loader2 className="w-3 h-3 animate-spin" />}Publish</button>
          </>)}
          <ProfileDropdown align="right" onOpenSettings={(s) => setAccountSettingsSection(s)} />
        </div>
      </header>

      {activeTab==='Logic'&&<BuilderLogic questions={questions} />}
      {activeTab==='Connect'&&<BuilderConnect />}
      {activeTab==='Share'&&<BuilderShare surveyId={surveyId} survey={survey} onPublish={handlePublish} publishing={publishing} />}
      {activeTab==='Results'&&isActive&&<BuilderResults surveyId={surveyId} />}

      {activeTab==='Build'&&(
        <div className="flex flex-1 overflow-hidden p-3 gap-3">
          {/* Left */}
          <aside className="w-[260px] flex flex-col shrink-0 gap-1.5">
            <div className="flex-1 bg-white rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium text-brand-black">Questions</span></div>
              <div ref={sidebarRef} className="flex-1 overflow-y-auto scrollbar-minimal p-2 space-y-0.5">
                {questions.length===0?<div className="text-center py-8 px-3 text-xs text-muted-foreground">No questions yet.</div>:(()=>{let sNum=0;return questions.map((q,i)=>{const o=typeOption(q.type);const isScr=q.type==='welcome'||q.type==='ending';if(!isScr)sNum++;return(
                  <div key={q.id} data-sidx={i} className={`transition-opacity ${sidebarDragFrom.current===i?'opacity-40':''} ${sidebarDragVisualIdx===i&&sidebarDragFrom.current!==null&&sidebarDragFrom.current!==i?'border-t-2 border-brand-vanilla':''}`}>
                    <button onClick={()=>handleSelectQuestion(q.id)} className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${selectedQuestionId===q.id?'bg-brand-vanilla/40 text-brand-black font-medium':'text-brand-black/70 hover:bg-brand-ghost'}`}>
                      <GripVertical onMouseDown={e=>handleSidebarDragStart(i,e)} className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${o.color} text-brand-black/70 shrink-0`}>{isScr?(q.type==='welcome'?'W':'E'):sNum}</div>
                      <span className="truncate flex-1">{q.text||'Untitled'}</span>
                    </button>
                  </div>);})})()}
              </div>
            </div>
            <div className="h-1.5 cursor-ns-resize flex items-center justify-center group -my-0.5 z-10" onMouseDown={e=>{isDragging.current=true;document.body.style.cursor='ns-resize';e.preventDefault();}}><div className="w-8 h-0.5 bg-border rounded-full group-hover:bg-brand-black/30 transition-colors" /></div>
            <div style={{height:designHeight}} className="bg-white rounded-xl border border-border shadow-sm flex flex-col overflow-hidden shrink-0">
              <div className="px-3 pt-3 border-b border-border shrink-0">
                <div className="flex items-center justify-between mb-2 px-0.5"><span className="text-xs font-medium text-brand-black flex items-center gap-1.5"><Palette className="w-3.5 h-3.5 text-muted-foreground" />Design</span><button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-brand-black transition-colors"><RotateCcw className="w-3 h-3" />Revert</button></div>
                <div className="flex">{DT.map(t=>(<button key={t} onClick={()=>setDesignTab(t)} className={`flex-1 py-1.5 text-[10px] font-medium capitalize transition-colors border-b-2 ${designTab===t?'text-brand-black border-brand-black':'text-muted-foreground border-transparent hover:text-brand-black/60'}`}>{t}</button>))}</div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-minimal">
                {designTab==='logo'&&<div className="p-3 space-y-2"><button className="w-full h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-brand-ghost/40 transition-colors"><Upload className="w-4 h-4" /><span className="text-[10px] font-medium">Upload logo</span></button><p className="text-[10px] text-muted-foreground text-center">PNG, SVG or JPG · up to 2 MB</p></div>}
                {designTab==='font'&&<div className="p-3 space-y-3"><div><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Font</p><select className="w-full appearance-none bg-input-background rounded-lg py-1.5 pl-2.5 pr-6 text-xs text-brand-black outline-none"><option>System font</option><option>Inter</option><option>Geist</option></select></div><div><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Color</p><div className="flex items-center justify-between"><span className="text-[11px] text-brand-black/70">Titles</span><ColorSwatch color="#111111" /></div></div></div>}
                {designTab==='buttons'&&<div className="p-3 space-y-2"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Color</p><div className="flex items-center justify-between"><span className="text-[11px] text-brand-black/70">Buttons</span><ColorSwatch color="#111111" /></div><div className="flex items-center justify-between"><span className="text-[11px] text-brand-black/70">Text</span><ColorSwatch color="#ffffff" /></div></div>}
                {designTab==='background'&&<div className="p-3 space-y-2"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Color</p><div className="flex items-center justify-between"><span className="text-[11px] text-brand-black/70">Background</span><ColorSwatch color="#F9F9FB" /></div></div>}
              </div>
            </div>
          </aside>

          {/* Center */}
          <main className="flex-1 flex flex-col bg-white rounded-xl border border-border shadow-sm overflow-hidden relative">
            <div className="h-12 border-b border-border bg-white flex items-center justify-between px-4 shrink-0 z-10">
              <button onClick={()=>setIsAddModalOpen(true)} className="flex items-center gap-1.5 bg-brand-black text-white px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-black/90 transition-colors shadow-sm"><Plus className="w-3.5 h-3.5" />Add Question</button>
              <div className="flex items-center gap-0.5 border border-border rounded-lg p-0.5 bg-brand-ghost">
                <button onClick={()=>setDeviceView('desktop')} className={`p-1 rounded-md transition-colors ${deviceView==='desktop'?'bg-white text-brand-black shadow-sm':'text-muted-foreground hover:text-brand-black'}`}><Monitor className="w-3.5 h-3.5" /></button>
                <button onClick={()=>setDeviceView('mobile')} className={`p-1 rounded-md transition-colors ${deviceView==='mobile'?'bg-white text-brand-black shadow-sm':'text-muted-foreground hover:text-brand-black'}`}><Smartphone className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip label="Undo (⌘Z)"><button onClick={undo} disabled={!canUndo} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-brand-ghost text-muted-foreground hover:text-brand-black transition-colors disabled:opacity-30"><Undo2 className="w-3.5 h-3.5" /></button></Tooltip>
                <Tooltip label="Redo (⌘⇧Z)"><button onClick={redo} disabled={!canRedo} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-brand-ghost text-muted-foreground hover:text-brand-black transition-colors disabled:opacity-30"><Redo2 className="w-3.5 h-3.5" /></button></Tooltip>
                <div className="w-px h-4 bg-border mx-1" />
                <Tooltip label="Survey settings"><button onClick={()=>setIsSettingsOpen(true)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-brand-ghost text-muted-foreground hover:text-brand-black transition-colors"><Settings className="w-3.5 h-3.5" /></button></Tooltip>
                {isActive&&<><div className="w-px h-4 bg-border mx-1" /><Link to={`/s/${surveyId}`} target="_blank" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand-black transition-colors px-2 py-1 rounded-lg hover:bg-brand-ghost"><Eye className="w-3.5 h-3.5" />Preview</Link></>}
              </div>
            </div>
            <div ref={canvasRef} className="flex-1 overflow-y-auto scrollbar-minimal py-6 px-6 flex flex-col items-center bg-brand-ghost">
              <div className={`w-full transition-all duration-300 ${deviceView==='mobile'?'max-w-[375px]':'max-w-[640px]'}`}>
                {questions.length===0?<div className="text-center py-20 text-muted-foreground"><MessageSquare className="w-6 h-6 mx-auto mb-3 text-muted-foreground/40" /><p className="text-sm">Add your first question.</p></div>
                :(()=>{let qNum=0;return questions.map((q,idx)=>{const isScr=q.type==='welcome'||q.type==='ending';if(!isScr)qNum++;return(<React.Fragment key={q.id}>
                  <div data-qidx={idx} className={`mb-3 transition-opacity ${dragFromIdx.current===idx?'opacity-50':''} ${dragVisualIdx===idx&&dragFromIdx.current!==null&&dragFromIdx.current!==idx?'border-t-2 border-brand-vanilla':''}`}>
                    <QuestionCard question={q} index={isScr?-1:qNum-1} selected={selectedQuestionId===q.id} showNumber={showNum}
                      onSelect={()=>setSelectedQuestionId(q.id)} onChange={updateQuestion} onDuplicate={()=>handleDuplicate(q.id)} onDelete={()=>handleDelete(q.id)} onDragStart={e=>handleDragStart(idx,e)} />
                  </div>
                  {idx<questions.length-1&&<div className="w-full flex justify-center opacity-0 hover:opacity-100 transition-opacity -mt-1 mb-1 relative z-10"><button onClick={()=>{const nq=makeQuestion('short');const next=[...questions];next.splice(idx+1,0,nq);setQuestions(next);setSelectedQuestionId(nq.id);}} className="w-6 h-6 rounded-full bg-brand-black text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm"><Plus className="w-3 h-3" /></button></div>}
                </React.Fragment>);})})()}
              </div>
            </div>
          </main>

          {/* Right */}
          <aside className="w-[300px] flex flex-col shrink-0">
            <div className="flex-1 bg-white rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
              <div className="flex p-2 border-b border-border shrink-0 gap-1.5 bg-brand-ghost/30">
                <button onClick={()=>setActiveRightTab('Edit')} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeRightTab==='Edit'?'bg-white text-brand-black shadow-sm border border-border':'text-muted-foreground hover:text-brand-black border border-transparent'}`}><SlidersHorizontal className="w-3.5 h-3.5" />Edit</button>
                <button onClick={()=>setActiveRightTab('AI')} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeRightTab==='AI'?'bg-brand-vanilla/20 text-brand-black shadow-sm border border-brand-vanilla/40':'text-muted-foreground hover:text-brand-black border border-transparent'}`}><Sparkles className="w-3.5 h-3.5" />AI Assistant</button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeRightTab==='Edit'?<QuestionEditor question={selectedQuestion} onChange={updateQuestion} />:<AIChatPanel survey={survey} existingQuestions={questions} onAppendQuestions={handleAppendAi} />}
              </div>
            </div>
          </aside>
        </div>
      )}

      {isAddModalOpen&&<AddQuestionModal onSelect={handleAddQuestion} onClose={()=>setIsAddModalOpen(false)} />}
      {isSettingsOpen&&<SurveySettingsModal settings={surveySettings} onChange={setSurveySettings} onClose={()=>setIsSettingsOpen(false)} />}
      {accountSettingsSection&&<AccountSettingsModal open onClose={()=>setAccountSettingsSection(null)} initialSection={accountSettingsSection as 'profile'|'notifications'|'billing'} />}
    </div>
  );
}
