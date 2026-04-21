import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  GitBranch, Tag, Plus, X, Crosshair, Minus, ArrowRight, ArrowLeft,
  Settings, Undo2, Redo2, Zap, Mail, Hash, Link2, Sparkles, MessageSquare,
} from 'lucide-react';

// ── Types & data ──────────────────────────────────────────────────────────────

type LogicTab = 'branching' | 'scoring' | 'tagging';
type PanelTab = 'rules' | 'actions';
interface NodePos {
  id: string; x: number; y: number; w: number; h: number;
  type: 'start' | 'end' | 'question';
  num?: number; label: string; color?: string;
}
interface Xfm { z: number; px: number; py: number }

const CW = 1360, CH = 400;
const CTX = 20, CTY = 60, CTW = 1300, CTH = 300;

const NODES: NodePos[] = [
  { id: 'start', x: 40,   y: 192, w: 90,  h: 36,  type: 'start',    label: 'Start' },
  { id: 'q1',    x: 190,  y: 168, w: 192, h: 72,  type: 'question', num: 1, label: 'What is your name?',    color: 'bg-brand-blue' },
  { id: 'q2',    x: 450,  y: 168, w: 192, h: 72,  type: 'question', num: 2, label: 'Are you satisfied?',    color: 'bg-brand-vanilla' },
  { id: 'q3',    x: 710,  y: 80,  w: 192, h: 72,  type: 'question', num: 3, label: 'Rate your experience',  color: 'bg-brand-honeydew' },
  { id: 'q4',    x: 710,  y: 272, w: 192, h: 72,  type: 'question', num: 4, label: 'What went wrong?',      color: 'bg-brand-blue' },
  { id: 'q5',    x: 970,  y: 168, w: 192, h: 72,  type: 'question', num: 5, label: 'Any other comments?',   color: 'bg-brand-honeydew' },
  { id: 'end',   x: 1230, y: 192, w: 90,  h: 36,  type: 'end',      label: 'End' },
];

function nodeRx(n: NodePos) { return n.x + n.w; }
function nodeCy(n: NodePos) { return n.y + n.h / 2; }
function byId(id: string) { return NODES.find(n => n.id === id)!; }

function bez(a: string, b: string, yOff = 0): string {
  const f = byId(a), t = byId(b);
  const x1 = nodeRx(f), y1 = nodeCy(f) + yOff, x2 = t.x, y2 = nodeCy(t);
  if (Math.abs(y1 - y2) < 8) return `M ${x1} ${y1} H ${x2}`;
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
}

const MOCK_RULES: Record<string, { condition: string; target: string }[]> = {
  q2: [
    { condition: 'Yes', target: 'Q3: Rate your experience' },
    { condition: 'No',  target: 'Q4: What went wrong?' },
  ],
};

const SCORING_ROWS = [
  { num: 1, label: 'What is your name?',   type: 'Short Text',      points: '—' },
  { num: 2, label: 'Are you satisfied?',   type: 'Multiple Choice', points: '—' },
  { num: 3, label: 'Rate your experience', type: 'Rating',          points: '1 – 5 pts' },
  { num: 4, label: 'What went wrong?',     type: 'Long Text',       points: '—' },
  { num: 5, label: 'Any other comments?',  type: 'Long Text',       points: '—' },
];

const ACTION_ITEMS = [
  { Icon: Mail,       label: 'Send email',      desc: 'Trigger an email when this question is answered.' },
  { Icon: ArrowRight, label: 'Jump to question', desc: 'Skip to a specific question unconditionally.' },
  { Icon: Hash,       label: 'Calculate score',  desc: 'Add or subtract points based on the answer.' },
  { Icon: Link2,      label: 'Webhook',          desc: 'POST answer data to an external URL.' },
];

const TABS: { id: LogicTab; label: string }[] = [
  { id: 'branching', label: 'Branching' },
  { id: 'scoring',   label: 'Scoring' },
  { id: 'tagging',   label: 'Tagging' },
];

// ── Root component ────────────────────────────────────────────────────────────

interface BuilderLogicProps {
  onOpenSettings?: () => void;
  questions?: Array<{ id: string; text: string; type: string }>;
}

export function BuilderLogic({ onOpenSettings = () => {}, questions: _questions }: BuilderLogicProps = {}) {
  const [tab, setTab]           = useState<LogicTab>('branching');
  const [selected, setSelected] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('rules');
  const [aiOpen, setAiOpen]     = useState(false);

  const isQ = (id: string | null) => id && id !== 'start' && id !== 'end';

  return (
    <div className="flex-1 relative overflow-hidden bg-brand-ghost">
      {/* ── Canvas (full background) ── */}
      {tab === 'branching' && (
        <BranchingCanvas selected={selected} onSelect={setSelected} />
      )}

      {/* ── Floating UI layer ── */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
        {/* Top row */}
        <div className="flex items-start p-4 gap-4">
          {/* Left panel — Rules/Actions */}
          {tab === 'branching' && (
            <div className="w-[280px] shrink-0 pointer-events-auto">
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <div className="flex border-b border-black/5 shrink-0">
                  {(['rules', 'actions'] as PanelTab[]).map(pt => (
                    <button key={pt} onClick={() => setPanelTab(pt)}
                      className={`flex-1 py-3 text-sm font-medium capitalize transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                        panelTab === pt ? 'text-brand-black border-brand-black' : 'text-brand-black/40 border-transparent hover:text-brand-black'
                      }`}>
                      {pt === 'actions' && <Zap className="w-3.5 h-3.5" />}
                      {pt === 'rules' ? 'Rules' : 'Actions'}
                    </button>
                  ))}
                </div>
                <div className="px-4 pt-3 pb-2.5 border-b border-black/5 shrink-0">
                  {isQ(selected) ? (
                    <p className="text-xs font-medium text-brand-black/50 truncate">{byId(selected!).label}</p>
                  ) : (
                    <p className="text-xs text-brand-black/25 italic">No question selected</p>
                  )}
                </div>
                {!isQ(selected) ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-brand-ghost flex items-center justify-center">
                      {panelTab === 'rules' ? <GitBranch className="w-5 h-5 text-brand-black/25" /> : <Zap className="w-5 h-5 text-brand-black/25" />}
                    </div>
                    <p className="text-sm font-medium text-brand-black/40 leading-snug">Select a question to<br />view or add {panelTab}</p>
                  </div>
                ) : panelTab === 'rules' ? (
                  <RulesPanel nodeId={selected!} />
                ) : (
                  <ActionsPanel />
                )}
              </div>
            </div>
          )}

          {/* Toolbar (freestanding) */}
          <div className="flex-1 pointer-events-auto">
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm h-12 flex items-center px-4">
              <div className="flex items-center gap-1">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                      tab === t.id ? 'bg-brand-black text-white' : 'text-brand-black/50 hover:text-brand-black hover:bg-black/5'
                    }`}>{t.label}</button>
                ))}
              </div>
              <div className="w-px h-4 bg-black/10 mx-2" />
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-brand-ghost text-brand-black/40 hover:text-brand-black transition-colors" title="Undo">
                <Undo2 className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-brand-ghost text-brand-black/40 hover:text-brand-black transition-colors" title="Redo">
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-black/10 mx-1" />
              <button onClick={onOpenSettings} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-brand-ghost text-brand-black/40 hover:text-brand-black transition-colors" title="Survey settings">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right AI panel */}
          <div className="shrink-0 pointer-events-auto">
            {aiOpen ? (
              <div className="w-[300px] bg-white rounded-2xl border border-black/5 shadow-sm flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#9b51e0]" />
                    <span className="text-sm font-medium text-brand-black">AI Assistant</span>
                  </div>
                  <button onClick={() => setAiOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-md text-brand-black/30 hover:text-brand-black hover:bg-brand-ghost transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-minimal p-4 space-y-4">
                  <div className="bg-brand-ghost/30 border border-black/5 rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#9b51e0] to-[#7f3db5]" />
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#9b51e0]/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-[#9b51e0]" />
                      </div>
                      <p className="text-[14px] text-brand-black leading-relaxed">I can help you with your survey logic. What would you like to do?</p>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 pl-9">
                      {['Add branching logic', 'Optimize question flow', 'Suggest skip patterns'].map(s => (
                        <button key={s} className="text-[13px] font-medium text-left px-3 py-2 rounded-lg bg-white shadow-sm hover:shadow hover:-translate-y-px transition-all border border-black/5 text-brand-black/80 hover:text-[#7f3db5]">{s}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-black/5 bg-brand-ghost/30 shrink-0">
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-black/30" />
                    <input type="text" placeholder="Ask AI to help..." className="w-full bg-white shadow-sm border border-black/5 hover:border-black/10 focus:border-[#9b51e0]/50 rounded-xl py-2.5 pl-9 pr-10 text-[14px] placeholder:text-brand-black/40 outline-none transition-all" />
                    <button className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#9b51e0] text-white flex items-center justify-center hover:brightness-110 transition-all shadow-sm">
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => setAiOpen(true)}
                className="h-12 px-4 bg-white rounded-2xl border border-black/5 shadow-sm flex items-center gap-2 text-sm font-medium text-brand-black/60 hover:text-[#7f3db5] transition-colors">
                <Sparkles className="w-4 h-4" />
                AI
              </button>
            )}
          </div>
        </div>

        {/* Scoring / Tagging fill the remaining space */}
        {tab === 'scoring' && <div className="flex-1 pointer-events-auto overflow-hidden"><ScoringView /></div>}
        {tab === 'tagging' && <div className="flex-1 pointer-events-auto overflow-hidden"><TaggingView /></div>}
      </div>
    </div>
  );
}

// ── Branching canvas (pan/zoom, full background) ─────────────────────────────

function BranchingCanvas({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const cRef  = useRef<HTMLDivElement>(null);
  const tRef  = useRef<Xfm>({ z: 1, px: 0, py: 0 });
  const [t, setT] = useState<Xfm>({ z: 1, px: 0, py: 0 });
  const minZ  = useRef(0.15);
  const maxZ  = useRef(3);
  const panning = useRef(false);
  const last  = useRef({ x: 0, y: 0 });

  const push = useCallback((v: Xfm) => { tRef.current = v; setT(v); }, []);

  const fitToView = useCallback(() => {
    const el = cRef.current; if (!el) return;
    const cw = el.clientWidth, ch = el.clientHeight, pad = 60;
    const fz = Math.min((cw - pad * 2) / CTW, (ch - pad * 2) / CTH);
    minZ.current = Math.max(0.08, fz * 0.9);
    maxZ.current = Math.min(cw / 192, ch / 72) * 0.85;
    const z = Math.min(maxZ.current, Math.max(minZ.current, fz));
    push({ z, px: (cw - CTW * z) / 2 - CTX * z, py: (ch - CTH * z) / 2 - CTY * z });
  }, [push]);

  useEffect(() => { const id = setTimeout(fitToView, 20); return () => clearTimeout(id); }, [fitToView]);

  useEffect(() => {
    const el = cRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { z, px, py } = tRef.current;
      if (e.ctrlKey || e.metaKey) {
        const f = e.deltaY < 0 ? 1.08 : 0.926;
        const nz = Math.min(maxZ.current, Math.max(minZ.current, z * f));
        const r = el.getBoundingClientRect();
        const cx = e.clientX - r.left, cy2 = e.clientY - r.top;
        push({ z: nz, px: cx - (cx - px) * (nz / z), py: cy2 - (cy2 - py) * (nz / z) });
      } else {
        push({ z, px: px - e.deltaX, py: py - e.deltaY });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [push]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panning.current) return;
      const dx = e.clientX - last.current.x, dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      const { z, px, py } = tRef.current;
      push({ z, px: px + dx, py: py + dy });
    };
    const onUp = () => { if (panning.current) { panning.current = false; if (cRef.current) cRef.current.style.cursor = 'grab'; } };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [push]);

  const zoomBy = (f: number) => {
    const { z, px, py } = tRef.current;
    const el = cRef.current; if (!el) return;
    const nz = Math.min(maxZ.current, Math.max(minZ.current, z * f));
    const cx = el.clientWidth / 2, cy2 = el.clientHeight / 2;
    push({ z: nz, px: cx - (cx - px) * (nz / z), py: cy2 - (cy2 - py) * (nz / z) });
  };

  return (
    <div
      ref={cRef}
      className="absolute inset-0 overflow-hidden"
      style={{ cursor: 'grab' }}
      onMouseDown={e => {
        if (e.button !== 0 || (e.target as HTMLElement).closest('[data-flow-node]')) return;
        panning.current = true;
        last.current = { x: e.clientX, y: e.clientY };
        if (cRef.current) cRef.current.style.cursor = 'grabbing';
      }}
      onClick={e => { if (!(e.target as HTMLElement).closest('[data-flow-node]')) onSelect(null); }}
    >
      {/* Dot grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <pattern id="dot-grid" width={20 * t.z} height={20 * t.z} patternUnits="userSpaceOnUse" x={t.px % (20 * t.z)} y={t.py % (20 * t.z)}>
            <circle cx={10 * t.z} cy={10 * t.z} r="1" fill="rgba(0,0,0,0.07)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* Transformed layer */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: CW, height: CH, transform: `translate(${t.px}px,${t.py}px) scale(${t.z})`, transformOrigin: '0 0' }}>
        <svg className="absolute inset-0 pointer-events-none" width={CW} height={CH}>
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#212121" />
            </marker>
          </defs>
          {[['start','q1'],['q1','q2'],['q3','q5'],['q4','q5'],['q5','end']].map(([a,b]) => (
            <path key={a+b} d={bez(a,b)} stroke="#212121" strokeWidth="1.5" fill="none" opacity="0.6" markerEnd="url(#arr)" />
          ))}
          <path d={bez('q2','q3',-9)} stroke="#212121" strokeWidth="1.5" fill="none" opacity="0.6" strokeDasharray="5 4" markerEnd="url(#arr)" />
          <path d={bez('q2','q4', 9)} stroke="#212121" strokeWidth="1.5" fill="none" opacity="0.6" strokeDasharray="5 4" markerEnd="url(#arr)" />
          <g><rect x="638" y="138" width="28" height="16" rx="4" fill="white" opacity=".9"/><text x="652" y="150" fill="rgba(0,0,0,.55)" fontSize="10" fontFamily="Inter,sans-serif" fontWeight="700" textAnchor="middle">Yes</text></g>
          <g><rect x="638" y="252" width="24" height="16" rx="4" fill="white" opacity=".9"/><text x="650" y="264" fill="rgba(0,0,0,.55)" fontSize="10" fontFamily="Inter,sans-serif" fontWeight="700" textAnchor="middle">No</text></g>
        </svg>

        {NODES.map(node => (
          <FlowNodeCard key={node.id} node={node} selected={selected === node.id}
            onClick={e => { e.stopPropagation(); panning.current = false; onSelect(node.id === selected ? null : node.id); }} />
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-5 left-5 flex items-center bg-white border border-black/5 rounded-lg shadow-sm z-10">
        <button onClick={() => zoomBy(1/1.2)} title="Zoom out" className="w-8 h-8 flex items-center justify-center text-brand-black/40 hover:text-brand-black hover:bg-brand-ghost transition-colors rounded-l-lg">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button onClick={fitToView} title="Fit to view" className="px-2 min-w-[44px] text-center text-[11px] font-medium text-brand-black/40 hover:text-brand-black transition-colors tabular-nums">
          {Math.round(t.z * 100)}%
        </button>
        <button onClick={() => zoomBy(1.2)} title="Zoom in" className="w-8 h-8 flex items-center justify-center text-brand-black/40 hover:text-brand-black hover:bg-brand-ghost transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-black/5" />
        <button onClick={fitToView} title="Fit to view" className="w-8 h-8 flex items-center justify-center text-brand-black/40 hover:text-brand-black hover:bg-brand-ghost transition-colors rounded-r-lg">
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Flow node card ─────────────────────────────────────────────────────────────

const PORT = 'w-3 h-3 rounded-full border-2 border-black/20 bg-white absolute top-1/2 -translate-y-1/2 cursor-crosshair hover:border-brand-black/50 hover:bg-brand-ghost transition-colors';

function FlowNodeCard({ node, selected, onClick }: { node: NodePos; selected: boolean; onClick: (e: React.MouseEvent) => void }) {
  if (node.type === 'start') {
    return (
      <div data-flow-node style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
        className="absolute flex items-center justify-center rounded-full text-xs font-bold tracking-wide bg-brand-black text-white">
        {node.label}
        <div className={`${PORT} -right-1.5`} />
      </div>
    );
  }
  if (node.type === 'end') {
    return (
      <div data-flow-node style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
        className="absolute flex items-center justify-center rounded-full text-xs font-bold tracking-wide bg-brand-honeydew text-brand-black border border-black/5">
        {node.label}
        <div className={`${PORT} -left-1.5`} />
      </div>
    );
  }
  return (
    <div data-flow-node style={{ left: node.x, top: node.y, width: node.w, height: node.h }} onClick={onClick}
      className={`absolute bg-white rounded-xl border shadow-sm cursor-pointer px-3.5 py-3 flex flex-col justify-center gap-1.5 transition-all duration-150 hover:shadow-md ${
        selected ? 'border-brand-black ring-2 ring-brand-vanilla/70' : 'border-black/5 hover:border-black/15'
      }`}>
      <div className={`${PORT} -left-1.5`} />
      <div className={`${PORT} -right-1.5`} />
      <div className="flex items-center gap-2">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${node.color} text-brand-black/70 border border-black/5 shrink-0`}>{node.num}</div>
        <span className="text-[10px] font-bold text-brand-black/30 uppercase tracking-wider">Q{node.num}</span>
      </div>
      <p className="text-[13px] font-medium text-brand-black leading-snug line-clamp-2">{node.label}</p>
    </div>
  );
}

// ── Rules panel ────────────────────────────────────────────────────────────────

function RulesPanel({ nodeId }: { nodeId: string }) {
  const rules = MOCK_RULES[nodeId] ?? [];
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      {rules.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-sm font-medium text-brand-black/40">No rules yet</p>
          <p className="text-xs text-brand-black/30 leading-relaxed">Add a rule to create<br />conditional logic</p>
        </div>
      ) : rules.map((rule, i) => (
        <div key={i} className="bg-brand-ghost rounded-xl p-3 relative">
          <button className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-md text-brand-black/25 hover:text-brand-black hover:bg-black/5 transition-colors">
            <X className="w-3 h-3" />
          </button>
          <p className="text-[11px] font-bold text-brand-black/35 uppercase tracking-wider mb-2.5">Rule {i + 1}</p>
          <div className="space-y-2">
            <div>
              <p className="text-[11px] text-brand-black/40 mb-1">If answer is</p>
              <div className="flex items-center justify-between bg-white border border-black/5 rounded-lg px-3 py-1.5">
                <span className="text-sm font-medium text-brand-black">{rule.condition}</span>
                <span className="text-brand-black/25 text-[10px]">▼</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 py-0.5">
              <ArrowRight className="w-3 h-3 text-brand-black/30" />
              <span className="text-[11px] text-brand-black/40">Then jump to</span>
            </div>
            <div className="flex items-center justify-between bg-white border border-black/5 rounded-lg px-3 py-1.5">
              <span className="text-xs font-medium text-brand-black truncate">{rule.target}</span>
              <span className="text-brand-black/25 text-[10px] shrink-0 ml-2">▼</span>
            </div>
          </div>
        </div>
      ))}
      <button className="flex items-center gap-2 text-sm font-medium text-brand-black/45 hover:text-brand-black transition-colors px-2 py-1.5 rounded-lg hover:bg-brand-ghost mt-1 self-start">
        <Plus className="w-3.5 h-3.5" />
        Add rule
      </button>
    </div>
  );
}

// ── Actions panel ──────────────────────────────────────────────────────────────

function ActionsPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
      {ACTION_ITEMS.map(a => (
        <button key={a.label} className="flex items-start gap-3 p-3 rounded-xl border border-black/5 bg-brand-ghost/30 hover:bg-brand-ghost transition-colors text-left group">
          <div className="w-8 h-8 rounded-lg bg-white border border-black/5 flex items-center justify-center shrink-0 shadow-sm group-hover:border-black/10">
            <a.Icon className="w-4 h-4 text-brand-black/40 group-hover:text-brand-black transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-brand-black">{a.label}</p>
            <p className="text-xs text-brand-black/40 mt-0.5 leading-snug">{a.desc}</p>
          </div>
          <Plus className="w-4 h-4 text-brand-black/15 group-hover:text-brand-black/50 transition-colors shrink-0 mt-0.5" />
        </button>
      ))}
    </div>
  );
}

// ── Scoring view ───────────────────────────────────────────────────────────────

function ScoringView() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_100px] bg-brand-ghost border-b border-black/5 px-4 py-2.5">
          <span className="text-xs font-bold text-brand-black/40 uppercase tracking-wider">Question</span>
          <span className="text-xs font-bold text-brand-black/40 uppercase tracking-wider">Type</span>
          <span className="text-xs font-bold text-brand-black/40 uppercase tracking-wider text-right">Points</span>
        </div>
        {SCORING_ROWS.map((row, i) => (
          <div key={row.num} className={`grid grid-cols-[1fr_160px_100px] px-4 py-3 items-center ${i < SCORING_ROWS.length - 1 ? 'border-b border-black/5' : ''}`}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-bold text-brand-black/30 shrink-0">Q{row.num}</span>
              <span className="text-sm font-medium text-brand-black truncate">{row.label}</span>
            </div>
            <span className="text-sm text-brand-black/50">{row.type}</span>
            <span className={`text-sm text-right ${row.points === '—' ? 'text-brand-black/25' : 'text-brand-black font-medium'}`}>{row.points}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-brand-black/30 text-center mt-4 font-medium">Assign point values to answers to calculate a total score per respondent.</p>
    </div>
  );
}

// ── Tagging view ───────────────────────────────────────────────────────────────

function TaggingView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-14 h-14 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center">
        <Tag className="w-6 h-6 text-brand-black/25" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-brand-black mb-1">Tag your respondents</h3>
        <p className="text-sm text-brand-black/40 max-w-xs leading-relaxed">Automatically apply tags based on answers. Use tags to segment and filter responses.</p>
      </div>
      <button disabled className="mt-1 px-5 py-2 bg-brand-ghost border border-black/5 rounded-lg text-sm font-medium text-brand-black/30 cursor-not-allowed">Create tag</button>
    </div>
  );
}
