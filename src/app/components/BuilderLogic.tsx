import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  GitBranch, Tag, Plus, X, Crosshair, Minus, Trash2, ChevronDown, Search,
  Type, AlignLeft, List, CheckSquare, ChevronsUpDown, Star,
  Calendar, Clock, Grid3x3, LayoutTemplate, Shuffle,
} from 'lucide-react';
import type { Question, QuestionType } from '../../types/survey';

// ── Types ────────────────────────────────────────────────────────────────────

type LogicTab = 'branching' | 'scoring' | 'tagging';
type ModalView = 'single' | 'all';

interface NodePos {
  id: string; x: number; y: number; w: number; h: number;
  type: 'start' | 'end' | 'question';
  qIndex?: number; label: string; color?: string; questionType?: QuestionType;
}

interface Connection {
  id: string; fromId: string; toId: string; label?: string; yOffset?: number;
}

interface Xfm { z: number; px: number; py: number }

type BranchOperator = 'is' | 'is_not' | 'is_equal_to' | 'is_not_equal_to' | 'contains' | 'not_contains' | 'is_answered' | 'is_not_answered';
interface BranchCondition { operator: BranchOperator; value?: string }
interface BranchRule { conditions: BranchCondition[]; targetQuestionId: string }
interface Branching { rules: BranchRule[]; defaultTargetId?: string }

// ── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 220, NODE_H = 100, START_W = 90, START_H = 36;
const H_GAP = 100, V_GAP = 70, MAX_ROW = 4, LEFT_M = 80, TOP_M = 100;

const TYPE_COLORS: Partial<Record<QuestionType, string>> = {
  short: 'bg-brand-blue', long: 'bg-brand-blue',
  multiple: 'bg-brand-vanilla', checkbox: 'bg-brand-vanilla', dropdown: 'bg-brand-vanilla',
  rating: 'bg-brand-honeydew', grid_multiple: 'bg-brand-honeydew', grid_checkbox: 'bg-brand-honeydew',
  date: 'bg-brand-ghost', time: 'bg-brand-ghost', welcome: 'bg-brand-vanilla', ending: 'bg-brand-honeydew',
};

const TYPE_ICONS: Partial<Record<QuestionType, React.ElementType>> = {
  short: Type, long: AlignLeft, multiple: List, checkbox: CheckSquare,
  dropdown: ChevronsUpDown, rating: Star, grid_multiple: Grid3x3, grid_checkbox: Grid3x3,
  date: Calendar, time: Clock, welcome: LayoutTemplate, ending: LayoutTemplate,
};

const OPERATOR_LABELS: Record<string, string> = {
  is: 'is', is_not: 'is not',
  is_equal_to: 'is equal to', is_not_equal_to: 'is not equal to',
  contains: 'contains', not_contains: 'does not contain',
  is_answered: 'is answered', is_not_answered: 'is not answered',
};

const TABS: { id: LogicTab; label: string }[] = [
  { id: 'branching', label: 'Branching' },
  { id: 'scoring',   label: 'Scoring' },
  { id: 'tagging',   label: 'Tagging' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function isScreen(t: QuestionType) { return t === 'welcome' || t === 'ending'; }
function needsValue(op: string) { return op !== 'is_answered' && op !== 'is_not_answered'; }

function getOperatorsForType(t: QuestionType): BranchOperator[] {
  if (t === 'multiple' || t === 'dropdown') return ['is', 'is_not'];
  if (t === 'checkbox') return ['contains', 'not_contains'];
  if (t === 'grid_multiple' || t === 'grid_checkbox') return ['is_answered', 'is_not_answered'];
  return ['is_equal_to', 'is_not_equal_to'];
}

function getQuestionNumbers(questions: Question[]): Map<string, number> {
  let n = 0;
  const map = new Map<string, number>();
  for (const q of questions) { if (!isScreen(q.type)) { n++; map.set(q.id, n); } }
  return map;
}

function getPreviewLines(q: Question): string[] {
  const o = q.options ?? {};
  switch (q.type) {
    case 'short': case 'long': return ['···'];
    case 'multiple': case 'dropdown': case 'checkbox':
      return (o.choices ?? []).slice(0, 2).map(c => `– ${c}`).concat((o.choices?.length ?? 0) > 2 ? ['– ...'] : []);
    case 'rating': {
      const high = o.ratingHigh ?? 5;
      return [o.ratingStyle === 'star' ? '☆'.repeat(Math.min(high, 5)) : `1–${high}`];
    }
    case 'date': return ['date'];
    case 'time': return ['time'];
    case 'grid_multiple': case 'grid_checkbox': return ['grid'];
    default: return [];
  }
}

function layoutNodes(questions: Question[]): { nodes: NodePos[]; cw: number; ch: number } {
  if (questions.length === 0) return { nodes: [], cw: LEFT_M * 2, ch: TOP_M * 2 };

  const ending = questions.find(q => q.type === 'ending');
  const ordered = questions.filter(q => q.type !== 'ending');

  // Build children map from branching rules
  const childrenOf = new Map<string, string[]>();
  for (let i = 0; i < ordered.length; i++) {
    const q = ordered[i];
    const kids: string[] = [];
    if (q.branching && (q.branching.rules.length > 0 || q.branching.defaultTargetId)) {
      for (const rule of q.branching.rules) {
        if (rule.targetQuestionId && !kids.includes(rule.targetQuestionId)) kids.push(rule.targetQuestionId);
      }
      if (q.branching.defaultTargetId && !kids.includes(q.branching.defaultTargetId)) kids.push(q.branching.defaultTargetId);
    } else if (i < ordered.length - 1) {
      kids.push(ordered[i + 1].id);
    } else if (ending) {
      kids.push(ending.id);
    }
    childrenOf.set(q.id, kids);
  }
  if (ending) childrenOf.set(ending.id, []);

  // DFS tree layout with pre-reservation
  const posMap = new Map<string, { layer: number; y: number }>();
  const claimed = new Set<string>();
  let leafSlot = 0;

  function lay(id: string, layer: number): { min: number; max: number } {
    const kids = (childrenOf.get(id) ?? []).filter(k => !claimed.has(k));
    kids.forEach(k => claimed.add(k));

    if (kids.length === 0) {
      const y = leafSlot * (NODE_H + V_GAP);
      leafSlot++;
      posMap.set(id, { layer, y });
      return { min: y, max: y + NODE_H };
    }

    const spans = kids.map(k => lay(k, layer + 1));
    const lo = Math.min(...spans.map(s => s.min));
    const hi = Math.max(...spans.map(s => s.max));
    const cy = (lo + hi) / 2 - NODE_H / 2;
    posMap.set(id, { layer, y: cy });
    return { min: Math.min(lo, cy), max: Math.max(hi, cy + NODE_H) };
  }

  claimed.add(ordered[0].id);
  lay(ordered[0].id, 0);

  // Place any disconnected nodes
  for (const q of ordered) {
    if (!posMap.has(q.id)) {
      posMap.set(q.id, { layer: ordered.indexOf(q), y: leafSlot * (NODE_H + V_GAP) });
      leafSlot++;
    }
  }
  // Place ending at rightmost layer, vertically centered
  if (ending && !posMap.has(ending.id)) {
    const maxLayer = Math.max(0, ...Array.from(posMap.values()).map(p => p.layer));
    const ys = Array.from(posMap.values()).map(p => p.y);
    const lo = ys.length ? Math.min(...ys) : 0;
    const hi = ys.length ? Math.max(...ys.map(y => y + NODE_H)) : NODE_H;
    posMap.set(ending.id, { layer: maxLayer + 1, y: (lo + hi) / 2 - NODE_H / 2 });
  }

  // Normalize Y so minimum = TOP_M
  const allYs = Array.from(posMap.values()).map(p => p.y);
  const shift = TOP_M - Math.min(...allYs);

  // Build nodes array
  const nodes: NodePos[] = [];
  let qNum = 0;
  for (const q of questions) {
    const pos = posMap.get(q.id);
    if (!pos) continue;
    const isW = q.type === 'welcome';
    const isE = q.type === 'ending';
    if (!isScreen(q.type)) qNum++;
    nodes.push({
      id: q.id, x: LEFT_M + pos.layer * (NODE_W + H_GAP), y: pos.y + shift,
      w: NODE_W, h: NODE_H,
      type: isW ? 'start' : isE ? 'end' : 'question',
      qIndex: (isW || isE) ? undefined : qNum,
      label: isW ? 'Welcome' : isE ? 'Ending' : (q.text || 'Untitled'),
      color: TYPE_COLORS[q.type], questionType: q.type,
    });
  }

  // Ensure start node exists
  if (!nodes.some(n => n.type === 'start')) {
    nodes.unshift({ id: '__start', x: LEFT_M, y: TOP_M, w: NODE_W, h: NODE_H, type: 'start', label: 'Start', color: 'bg-brand-black' });
    for (let i = 1; i < nodes.length; i++) nodes[i].x += NODE_W + H_GAP;
  }

  const cw = nodes.length ? Math.max(...nodes.map(n => n.x + n.w)) + LEFT_M : LEFT_M * 2;
  const ch = nodes.length ? Math.max(...nodes.map(n => n.y + n.h)) + TOP_M : TOP_M * 2;
  return { nodes, cw, ch };
}

function deriveConnections(questions: Question[], nodes: NodePos[]): Connection[] {
  const conns: Connection[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const hasBranching = new Set<string>();

  for (const q of questions) {
    if (q.branching && (q.branching.rules.length > 0 || q.branching.defaultTargetId)) {
      hasBranching.add(q.id);
      for (const rule of q.branching.rules) {
        if (!nodeMap.has(rule.targetQuestionId)) continue;
        const label = rule.conditions.map(c => `${OPERATOR_LABELS[c.operator] ?? c.operator} ${c.value ?? ''}`).join(' & ').trim();
        conns.push({ id: `b-${q.id}-${rule.targetQuestionId}`, fromId: q.id, toId: rule.targetQuestionId, label });
      }
      if (q.branching.defaultTargetId && nodeMap.has(q.branching.defaultTargetId)) {
        conns.push({ id: `d-${q.id}-${q.branching.defaultTargetId}`, fromId: q.id, toId: q.branching.defaultTargetId, label: q.branching.rules.length > 0 ? 'else' : undefined });
      }
    }
  }

  const ordered = nodes.filter(n => n.type !== 'end');
  for (let i = 0; i < ordered.length; i++) {
    const curr = ordered[i];
    const next = i < ordered.length - 1 ? ordered[i + 1] : nodes.find(n => n.type === 'end')!;
    if (next && !hasBranching.has(curr.id)) {
      conns.push({ id: `s-${curr.id}-${next.id}`, fromId: curr.id, toId: next.id });
    }
  }

  const fromCounts: Record<string, number> = {};
  const fromIdx: Record<string, number> = {};
  for (const c of conns) fromCounts[c.fromId] = (fromCounts[c.fromId] ?? 0) + 1;
  for (const c of conns) {
    if (fromCounts[c.fromId] > 1) {
      const idx = fromIdx[c.fromId] ?? 0;
      fromIdx[c.fromId] = idx + 1;
      c.yOffset = (idx - (fromCounts[c.fromId] - 1) / 2) * 14;
    }
  }
  return conns;
}

function bezier(from: NodePos, to: NodePos, yOff = 0): string {
  const x1 = from.x + from.w, y1 = from.y + from.h / 2 + yOff;
  const x2 = to.x, y2 = to.y + to.h / 2;
  const dx = Math.abs(x2 - x1);
  const cp = Math.min(dx * 0.4, 100);
  return `M ${x1} ${y1} C ${x1 + cp} ${y1} ${x2 - cp} ${y2} ${x2} ${y2}`;
}

function bezMid(from: NodePos, to: NodePos, yOff = 0): { x: number; y: number } {
  const x1 = from.x + from.w, y1 = from.y + from.h / 2 + yOff;
  const x2 = to.x, y2 = to.y + to.h / 2;
  const dx = Math.abs(x2 - x1);
  const cp = Math.min(dx * 0.4, 100);
  // Cubic bezier at t=0.5: B = 0.125*P0 + 0.375*P1 + 0.375*P2 + 0.125*P3
  return {
    x: 0.125 * x1 + 0.375 * (x1 + cp) + 0.375 * (x2 - cp) + 0.125 * x2,
    y: 0.125 * y1 + 0.375 * y1 + 0.375 * y2 + 0.125 * y2,
  };
}

function screenToCanvas(cx: number, cy: number, t: Xfm, el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: (cx - r.left - t.px) / t.z, y: (cy - r.top - t.py) / t.z };
}

// ── Root ─────────────────────────────────────────────────────────────────────

interface BuilderLogicProps { questions: Question[]; onUpdateQuestion: (q: Question) => void }

export function BuilderLogic({ questions, onUpdateQuestion }: BuilderLogicProps) {
  const [tab, setTab] = useState<LogicTab>('branching');
  const [modalQId, setModalQId] = useState<string | null>(null);
  const [modalView, setModalView] = useState<ModalView>('single');

  const { nodes, cw, ch } = useMemo(() => layoutNodes(questions), [questions]);
  const connections = useMemo(() => deriveConnections(questions, nodes), [questions, nodes]);
  const qNums = useMemo(() => getQuestionNumbers(questions), [questions]);

  const openSingle = (id: string) => { setModalQId(id); setModalView('single'); };
  const openAll = () => { setModalQId(null); setModalView('all'); };
  const closeModal = () => { setModalQId(null); setModalView('single'); };
  const isModalOpen = modalQId !== null || modalView === 'all';

  const handleCreateConnection = (fromId: string, toId: string) => {
    const q = questions.find(q => q.id === fromId);
    if (!q || isScreen(q.type)) return;
    const br: Branching = q.branching
      ? (JSON.parse(JSON.stringify(q.branching)) as Branching)
      : { rules: [], defaultTargetId: undefined };
    if (br.rules.some(r => r.targetQuestionId === toId) || br.defaultTargetId === toId) return;
    if (!br.defaultTargetId && br.rules.length === 0) {
      onUpdateQuestion({ ...q, branching: { ...br, defaultTargetId: toId } });
    } else {
      const ops = getOperatorsForType(q.type);
      br.rules.push({ conditions: [{ operator: ops[0], value: '' }], targetQuestionId: toId });
      onUpdateQuestion({ ...q, branching: br });
      openSingle(fromId);
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-brand-ghost">
      {tab === 'branching' && (
        <BranchingCanvas nodes={nodes} connections={connections} cw={cw} ch={ch}
          questions={questions} qNums={qNums}
          onClickNode={openSingle} onCreateConnection={handleCreateConnection} />
      )}

      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
        <div className="flex items-start p-4 gap-4">
          <div className="flex-1 pointer-events-auto flex justify-center">
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm h-12 flex items-center px-4 max-w-[960px]">
              <div className="flex items-center gap-1">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-brand-black text-white' : 'text-brand-black/50 hover:text-brand-black hover:bg-black/5'}`}>{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {tab === 'scoring' && <div className="flex-1 pointer-events-auto overflow-hidden"><ScoringView questions={questions} /></div>}
        {tab === 'tagging' && <div className="flex-1 pointer-events-auto overflow-hidden"><TaggingView /></div>}
      </div>

      {isModalOpen && (
        <BranchingModal
          questions={questions} qNums={qNums}
          selectedQId={modalQId} view={modalView}
          onSwitchToAll={openAll} onSwitchToSingle={openSingle}
          onSave={onUpdateQuestion} onClose={closeModal}
        />
      )}
    </div>
  );
}

// ── Canvas ────────────────────────────────────────────────────────────────────

interface DragState {
  type: 'pan' | 'node' | 'connect';
  nodeId?: string;
  startX: number; startY: number;
  origX: number; origY: number;
}

function BranchingCanvas({ nodes, connections, cw: layoutCw, ch: layoutCh, questions, qNums, onClickNode, onCreateConnection }: {
  nodes: NodePos[]; connections: Connection[]; cw: number; ch: number;
  questions: Question[]; qNums: Map<string, number>;
  onClickNode: (id: string) => void; onCreateConnection: (fromId: string, toId: string) => void;
}) {
  const cRef = useRef<HTMLDivElement>(null);
  const tRef = useRef<Xfm>({ z: 1, px: 0, py: 0 });
  const [t, setT] = useState<Xfm>({ z: 1, px: 0, py: 0 });
  const push = useCallback((v: Xfm) => { tRef.current = v; setT(v); }, []);
  const animRef = useRef(0);
  const animateTo = useCallback((target: Xfm, ms = 300) => {
    cancelAnimationFrame(animRef.current);
    const start = { ...tRef.current };
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - (1 - p) * (1 - p);
      push({ z: start.z + (target.z - start.z) * e, px: start.px + (target.px - start.px) * e, py: start.py + (target.py - start.py) * e });
      if (p < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [push]);
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // Draggable node positions (overrides layout defaults)
  const [posOverrides, setPosOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const getPos = useCallback((id: string): { x: number; y: number } => {
    if (posOverrides[id]) return posOverrides[id];
    const n = nodes.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  }, [posOverrides, nodes]);

  // Selection & drag
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef(0);
  const [connPreview, setConnPreview] = useState<{ fromId: string; x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  // Sync new nodes into positions (preserve existing overrides)
  useEffect(() => {
    setPosOverrides(prev => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(next)) {
        if (!nodes.find(n => n.id === id)) { delete next[id]; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [nodes]);

  // Canvas bounds from actual positions
  const bounds = useMemo(() => {
    let maxX = 0, maxY = 0;
    for (const n of nodes) {
      const p = posOverrides[n.id] ?? { x: n.x, y: n.y };
      maxX = Math.max(maxX, p.x + n.w + LEFT_M);
      maxY = Math.max(maxY, p.y + n.h + TOP_M);
    }
    return { cw: Math.max(layoutCw, maxX), ch: Math.max(layoutCh, maxY) };
  }, [nodes, posOverrides, layoutCw, layoutCh]);

  // Fit to view
  const fitToView = useCallback(() => {
    const el = cRef.current; if (!el) return;
    const pad = 80;
    const fz = Math.min((el.clientWidth - pad * 2) / bounds.cw, (el.clientHeight - pad * 2) / bounds.ch);
    const z = Math.max(0.1, Math.min(3, fz));
    animateTo({ z, px: (el.clientWidth - bounds.cw * z) / 2, py: (el.clientHeight - bounds.ch * z) / 2 });
  }, [animateTo, bounds]);

  useEffect(() => { const id = setTimeout(fitToView, 30); return () => clearTimeout(id); }, [fitToView]);

  // Wheel zoom/scroll
  useEffect(() => {
    const el = cRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { z, px, py } = tRef.current;
      if (e.ctrlKey || e.metaKey) {
        const f = e.deltaY < 0 ? 1.08 : 0.926;
        const nz = Math.max(0.1, Math.min(3, z * f));
        const r = el.getBoundingClientRect();
        push({ z: nz, px: (e.clientX - r.left) - ((e.clientX - r.left) - px) * (nz / z), py: (e.clientY - r.top) - ((e.clientY - r.top) - py) * (nz / z) });
      } else push({ z, px: px - e.deltaX, py: py - e.deltaY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [push]);

  // Global mouse handlers for drag operations
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return;

      if (d.type === 'pan') {
        push({ ...tRef.current, px: tRef.current.px + e.clientX - d.startX, py: tRef.current.py + e.clientY - d.startY });
        d.startX = e.clientX; d.startY = e.clientY;
        return;
      }

      if (d.type === 'node') {
        didDrag.current = true;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          const { z } = tRef.current;
          setPosOverrides(prev => ({
            ...prev,
            [d.nodeId!]: { x: d.origX + (e.clientX - d.startX) / z, y: d.origY + (e.clientY - d.startY) / z },
          }));
        });
        return;
      }

      if (d.type === 'connect') {
        didDrag.current = true;
        cancelAnimationFrame(rafRef.current);
        const el = cRef.current!;
        rafRef.current = requestAnimationFrame(() => {
          const pt = screenToCanvas(e.clientX, e.clientY, tRef.current, el);
          setConnPreview({ fromId: d.nodeId!, x: pt.x, y: pt.y });
        });
      }
    };

    const onUp = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      cancelAnimationFrame(rafRef.current);

      if (d.type === 'pan') {
        if (cRef.current) cRef.current.style.cursor = 'grab';
        return;
      }

      if (d.type === 'node') {
        const { z } = tRef.current;
        setPosOverrides(prev => ({
          ...prev,
          [d.nodeId!]: { x: d.origX + (e.clientX - d.startX) / z, y: d.origY + (e.clientY - d.startY) / z },
        }));
        return;
      }

      if (d.type === 'connect') {
        setConnPreview(null);
        const el = cRef.current!;
        const pt = screenToCanvas(e.clientX, e.clientY, tRef.current, el);
        for (const n of nodes) {
          if (n.type === 'start' || n.id === d.nodeId) continue;
          const p = posOverrides[n.id] ?? { x: n.x, y: n.y };
          if (pt.x >= p.x && pt.x <= p.x + n.w && pt.y >= p.y && pt.y <= p.y + n.h) {
            onCreateConnection(d.nodeId!, n.id);
            return;
          }
        }
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [push, nodes, posOverrides, onCreateConnection]);

  const zoomBy = (f: number) => {
    const { z, px, py } = tRef.current; const el = cRef.current; if (!el) return;
    const nz = Math.max(0.1, Math.min(3, z * f));
    const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
    animateTo({ z: nz, px: cx - (cx - px) * (nz / z), py: cy - (cy - py) * (nz / z) }, 200);
  };

  // Build positioned node data for edge rendering
  const posNode = useCallback((id: string): NodePos | undefined => {
    const n = nodeMap.get(id); if (!n) return undefined;
    const p = posOverrides[id] ?? { x: n.x, y: n.y };
    return { ...n, x: p.x, y: p.y };
  }, [nodeMap, posOverrides]);

  return (
    <div ref={cRef} className="absolute inset-0 overflow-hidden" style={{ cursor: 'grab' }}
      onMouseDown={e => {
        if (e.button !== 0 || (e.target as HTMLElement).closest('[data-flow-node]')) return;
        dragRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, origX: 0, origY: 0 };
        if (cRef.current) cRef.current.style.cursor = 'grabbing';
        setSelectedId(null);
      }}>

      {/* Dot grid background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs><pattern id="dot-grid" width={20 * t.z} height={20 * t.z} patternUnits="userSpaceOnUse" x={t.px % (20 * t.z)} y={t.py % (20 * t.z)}><circle cx={10 * t.z} cy={10 * t.z} r="1" fill="rgba(0,0,0,0.07)" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* Transformed content layer */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: bounds.cw, height: bounds.ch, transform: `translate(${t.px}px,${t.py}px) scale(${t.z})`, transformOrigin: '0 0' }}>
        {/* Edges */}
        <svg className="absolute inset-0 pointer-events-none" width={bounds.cw} height={bounds.ch} style={{ overflow: 'visible' }}>
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#212121" /></marker>
            <marker id="arr-dash" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#212121" opacity="0.5" /></marker>
          </defs>
          {connections.map(c => {
            const from = posNode(c.fromId), to = posNode(c.toId);
            if (!from || !to) return null;
            const mid = bezMid(from, to, c.yOffset ?? 0);
            return <g key={c.id}>
              <path d={bezier(from, to, c.yOffset ?? 0)} stroke="#212121" strokeWidth="1.5" fill="none" opacity="0.4" markerEnd="url(#arr)" />
              {c.label && <>
                <rect x={mid.x - c.label.length * 3.2 - 6} y={mid.y - 9} width={c.label.length * 6.4 + 12} height={18} rx="4" fill="white" opacity=".92" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
                <text x={mid.x} y={mid.y + 3.5} fill="rgba(0,0,0,.55)" fontSize="10" fontFamily="Inter,sans-serif" fontWeight="600" textAnchor="middle">{c.label}</text>
              </>}
            </g>;
          })}

          {/* Connection drag preview line */}
          {connPreview && (() => {
            const from = posNode(connPreview.fromId);
            if (!from) return null;
            const x1 = from.x + from.w, y1 = from.y + from.h / 2;
            const mx = (x1 + connPreview.x) / 2;
            return <path d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${connPreview.y} ${connPreview.x} ${connPreview.y}`}
              stroke="#212121" strokeWidth="2" strokeDasharray="8 4" fill="none" opacity="0.5" markerEnd="url(#arr-dash)" />;
          })()}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const pos = getPos(node.id);
          const question = questions.find(q => q.id === node.id);
          return (
            <FlowNode key={node.id} node={node} question={question} x={pos.x} y={pos.y}
              isSelected={selectedId === node.id} qNum={qNums.get(node.id)}
              onMouseDown={e => {
                if (e.button !== 0) return;
                e.stopPropagation();
                didDrag.current = false;
                dragRef.current = { type: 'node', nodeId: node.id, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
                setSelectedId(node.id);
              }}
              onPortMouseDown={e => {
                e.stopPropagation(); e.preventDefault();
                didDrag.current = false;
                const el = cRef.current!;
                const pt = screenToCanvas(e.clientX, e.clientY, tRef.current, el);
                dragRef.current = { type: 'connect', nodeId: node.id, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
                setConnPreview({ fromId: node.id, x: pt.x, y: pt.y });
              }}
              onBranchClick={() => onClickNode(node.id)}
            />
          );
        })}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-5 left-5 flex items-center bg-white border border-black/5 rounded-lg shadow-sm z-10">
        <button onClick={() => zoomBy(1 / 1.2)} className="w-8 h-8 flex items-center justify-center text-brand-black/40 hover:text-brand-black hover:bg-brand-ghost transition-colors rounded-l-lg"><Minus className="w-3.5 h-3.5" /></button>
        <button onClick={fitToView} className="px-2 min-w-[44px] text-center text-[11px] font-medium text-brand-black/40 hover:text-brand-black transition-colors tabular-nums">{Math.round(t.z * 100)}%</button>
        <button onClick={() => zoomBy(1.2)} className="w-8 h-8 flex items-center justify-center text-brand-black/40 hover:text-brand-black hover:bg-brand-ghost transition-colors"><Plus className="w-3.5 h-3.5" /></button>
        <div className="w-px h-4 bg-black/5" />
        <button onClick={fitToView} className="w-8 h-8 flex items-center justify-center text-brand-black/40 hover:text-brand-black hover:bg-brand-ghost transition-colors rounded-r-lg"><Crosshair className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

// ── Flow Node ────────────────────────────────────────────────────────────────

function FlowNode({ node, question, x, y, isSelected, qNum, onMouseDown, onPortMouseDown, onBranchClick }: {
  node: NodePos; question?: Question; x: number; y: number; isSelected: boolean; qNum?: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onPortMouseDown: (e: React.MouseEvent) => void;
  onBranchClick: () => void;
}) {
  if (node.type === 'start' || node.type === 'end') {
    const isStart = node.type === 'start';
    const ScreenIcon = node.questionType === 'welcome' ? LayoutTemplate : node.questionType === 'ending' ? LayoutTemplate : null;
    return (
      <div data-flow-node onMouseDown={onMouseDown}
        style={{ position: 'absolute', left: x, top: y, width: node.w, height: node.h, cursor: 'grab' }}
        className={`rounded-xl border shadow-sm px-3.5 py-3 flex flex-col justify-center gap-1.5 select-none transition-shadow duration-150
          ${isStart ? 'bg-brand-black/90 text-white border-brand-black/20' : 'bg-brand-honeydew border-black/5 text-brand-black'}
          ${isSelected ? 'shadow-md ring-2 ring-brand-black/10' : 'hover:shadow-md'}`}>
        <div className="flex items-center gap-2">
          {ScreenIcon && (
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border border-black/5 shrink-0 ${isStart ? 'bg-white/20' : 'bg-white/60'}`}>
              <ScreenIcon className={`w-3 h-3 ${isStart ? 'text-white/70' : 'text-brand-black/50'}`} />
            </div>
          )}
          <span className={`text-sm font-bold ${isStart ? 'text-white' : 'text-brand-black'}`}>{node.label}</span>
        </div>
        <p className={`text-[11px] leading-snug ${isStart ? 'text-white/50' : 'text-brand-black/40'}`}>
          {isStart ? 'Survey begins here' : 'Survey ends here'}
        </p>

        {/* Output port for start, input visual for end */}
        {isStart && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10"
            onMouseDown={e => { e.stopPropagation(); onPortMouseDown(e); }}>
            <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm cursor-crosshair transition-all duration-150
              ${isSelected ? 'bg-white scale-110' : 'bg-white/40 hover:bg-white/80 hover:scale-110'}`} />
          </div>
        )}
      </div>
    );
  }

  const Icon = TYPE_ICONS[node.questionType!] ?? Type;
  const preview = question ? getPreviewLines(question) : [];
  const hasBranching = question?.branching && (question.branching.rules.length > 0 || question.branching.defaultTargetId);

  return (
    <div data-flow-node onMouseDown={onMouseDown} onDoubleClick={e => { e.stopPropagation(); onBranchClick(); }}
      style={{ position: 'absolute', left: x, top: y, width: node.w, height: node.h, willChange: 'transform', cursor: isSelected ? 'grab' : 'grab' }}
      className={`bg-white rounded-xl border shadow-sm px-3.5 py-3 flex flex-col justify-center gap-1.5 select-none transition-shadow duration-150
        ${isSelected ? 'border-brand-black/20 shadow-md z-10' : 'border-black/5 hover:shadow-md hover:border-black/10'}`}>

      {/* Header: type badge + number */}
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${node.color} border border-black/5 shrink-0`}>
          <Icon className="w-3 h-3 text-brand-black/60" />
        </div>
        <span className="text-xs font-bold text-brand-black/40">{qNum}</span>
      </div>

      {/* Question text */}
      <p className="text-[13px] font-medium text-brand-black leading-snug line-clamp-1 pr-4">{node.label}</p>

      {/* Type-specific preview */}
      {preview.length > 0 && (
        <p className="text-[11px] text-brand-black/30 leading-snug truncate pr-4">{preview.join('  ')}</p>
      )}

      {/* Output port handle (drag to connect) */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10"
        onMouseDown={e => { e.stopPropagation(); onPortMouseDown(e); }}>
        <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm cursor-crosshair transition-all duration-150
          ${isSelected ? 'bg-brand-black scale-110' : 'bg-brand-black/20 hover:bg-brand-black/60 hover:scale-110'}`} />
      </div>

      {/* Branching indicator (shows if question has rules) */}
      {hasBranching && !isSelected && (
        <div className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-brand-black flex items-center justify-center shadow-sm">
          <GitBranch className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      {/* Floating toolbar (on selection) */}
      {isSelected && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20"
          onMouseDown={e => e.stopPropagation()}>
          <div className="flex items-center gap-0.5 bg-white rounded-lg border border-black/5 shadow-sm p-1">
            <button onClick={onBranchClick} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-brand-ghost/40 transition-colors"
              title="Edit branching rules">
              <GitBranch className="w-3.5 h-3.5 text-brand-black/50" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Branching Modal ──────────────────────────────────────────────────────────

function BranchingModal({ questions, qNums, selectedQId, view, onSwitchToAll, onSwitchToSingle, onSave, onClose }: {
  questions: Question[]; qNums: Map<string, number>;
  selectedQId: string | null; view: ModalView;
  onSwitchToAll: () => void; onSwitchToSingle: (id: string) => void;
  onSave: (q: Question) => void; onClose: () => void;
}) {
  const contentQuestions = questions.filter(q => !isScreen(q.type));
  const [drafts, setDrafts] = useState<Map<string, Branching>>(() => {
    const m = new Map<string, Branching>();
    for (const q of contentQuestions) {
      m.set(q.id, q.branching ? JSON.parse(JSON.stringify(q.branching)) : { rules: [], defaultTargetId: undefined });
    }
    return m;
  });

  const getDraft = (id: string): Branching => drafts.get(id) ?? { rules: [], defaultTargetId: undefined };
  const setDraft = (id: string, b: Branching) => setDrafts(prev => { const n = new Map(prev); n.set(id, b); return n; });

  const handleSaveAll = () => {
    for (const q of contentQuestions) {
      const draft = getDraft(q.id);
      const cleanRules = draft.rules.filter(r => r.conditions.length > 0 && r.targetQuestionId);
      if (cleanRules.length === 0 && !draft.defaultTargetId) {
        if (q.branching) {
          const u = { ...q }; delete u.branching; onSave(u);
        }
      } else {
        onSave({ ...q, branching: { rules: cleanRules, defaultTargetId: draft.defaultTargetId } });
      }
    }
    onClose();
  };

  const handleDeleteAll = () => {
    const m = new Map<string, Branching>();
    for (const q of contentQuestions) m.set(q.id, { rules: [], defaultTargetId: undefined });
    setDrafts(m);
  };

  const selectedQ = selectedQId ? questions.find(q => q.id === selectedQId) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 64px)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-black/5 flex items-center justify-between shrink-0">
          {view === 'single' && selectedQ ? (<>
            <button onClick={onSwitchToAll} className="flex items-center gap-1.5 text-sm font-medium text-brand-black/50 hover:bg-brand-ghost/40 rounded-lg px-2 py-1 transition-colors">
              <Shuffle className="w-3.5 h-3.5" /> See all rules
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-brand-black font-display">Edit logic for</span>
              <QuestionBadge question={selectedQ} num={qNums.get(selectedQ.id)} />
            </div>
            <div className="w-24" />
          </>) : (
            <h2 className="text-lg font-semibold text-brand-black font-display w-full text-center">Branching</h2>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {view === 'single' && selectedQ ? (
            <SingleQuestionEditor
              question={selectedQ} questions={questions} qNums={qNums}
              draft={getDraft(selectedQ.id)} onChange={b => setDraft(selectedQ.id, b)} />
          ) : (
            <AllRulesEditor
              questions={contentQuestions} allQuestions={questions} qNums={qNums}
              drafts={drafts} onChange={setDraft} onClickQuestion={onSwitchToSingle} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/5 flex items-center justify-between shrink-0">
          <button onClick={handleDeleteAll} className="flex items-center gap-1.5 text-xs font-medium text-destructive/60 hover:text-destructive transition-colors">
            <Trash2 className="w-3 h-3" /> Delete all rules
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-brand-black/60 hover:text-brand-black rounded-lg hover:bg-brand-ghost transition-colors">Cancel</button>
            <button onClick={handleSaveAll} className="px-5 py-2 rounded-lg text-sm font-medium bg-brand-black text-white hover:bg-black/90 transition-colors">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Question badge ───────────────────────────────────────────────────────────

function QuestionBadge({ question, num }: { question: Question; num?: number }) {
  const Icon = TYPE_ICONS[question.type] ?? Type;
  return (
    <div className="inline-flex items-center gap-1.5 bg-brand-ghost/60 rounded-lg px-2.5 py-1 border border-black/5">
      <Icon className="w-3.5 h-3.5 text-brand-black/50" />
      <span className="text-xs font-bold text-brand-black/50">{num}</span>
    </div>
  );
}

// ── Single Question Editor ───────────────────────────────────────────────────

function SingleQuestionEditor({ question, questions, qNums, draft, onChange }: {
  question: Question; questions: Question[]; qNums: Map<string, number>;
  draft: Branching; onChange: (b: Branching) => void;
}) {
  const qIdx = questions.findIndex(q => q.id === question.id);
  const forwardQuestions = questions.slice(qIdx + 1).filter(q => q.type !== 'welcome');
  const Icon = TYPE_ICONS[question.type] ?? Type;
  const num = qNums.get(question.id);

  const addRule = () => {
    const ops = getOperatorsForType(question.type);
    onChange({ ...draft, rules: [...draft.rules, { conditions: [{ operator: ops[0], value: '' }], targetQuestionId: '' }] });
  };
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const removeRule = (i: number) => {
    setRemovingIdx(i);
    setTimeout(() => { setRemovingIdx(null); onChange({ ...draft, rules: draft.rules.filter((_, j) => j !== i) }); }, 350);
  };
  const updateRule = (i: number, r: BranchRule) => onChange({ ...draft, rules: draft.rules.map((old, j) => j === i ? r : old) });

  return (
    <div className="p-6 space-y-5">
      {/* Question card */}
      <div className="flex items-center gap-3 bg-brand-ghost/30 rounded-xl px-4 py-3 border border-black/5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${TYPE_COLORS[question.type]} border border-black/5`}>
          <Icon className="w-3.5 h-3.5 text-brand-black/60" />
        </div>
        <span className="text-xs font-bold text-brand-black/40">{num}</span>
        <span className="text-sm font-medium text-brand-black">{question.text || 'Untitled'}</span>
      </div>

      {/* Rules */}
      {draft.rules.map((rule, ri) => (
        <RuleEditor key={ri} rule={rule} ruleIndex={ri} question={question} questions={questions}
          qNums={qNums} forwardQuestions={forwardQuestions}
          onChange={r => updateRule(ri, r)} onRemove={() => removeRule(ri)} removing={removingIdx === ri} />
      ))}

      {draft.rules.length > 0 && <div className="h-px bg-black/5" />}

      {/* Default / Always go to */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-brand-black/50 shrink-0">{draft.rules.length > 0 ? 'All other cases go to' : 'Always go to'}</span>
        <TargetSelector value={draft.defaultTargetId ?? ''} forwardQuestions={forwardQuestions} qNums={qNums}
          onChange={id => onChange({ ...draft, defaultTargetId: id || undefined })} />
      </div>

      {/* Add rule */}
      {!isScreen(question.type) && (
        <button onClick={addRule} className="flex items-center gap-1.5 text-sm font-medium text-brand-black/40 hover:bg-brand-ghost/40 rounded-lg px-2 py-1 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add rule
        </button>
      )}
    </div>
  );
}

// ── All Rules Editor ─────────────────────────────────────────────────────────

function AllRulesEditor({ questions, allQuestions, qNums, drafts, onChange, onClickQuestion }: {
  questions: Question[]; allQuestions: Question[]; qNums: Map<string, number>;
  drafts: Map<string, Branching>; onChange: (id: string, b: Branching) => void;
  onClickQuestion: (id: string) => void;
}) {
  return (
    <div className="p-6 space-y-4">
      {questions.map(q => {
        const draft = drafts.get(q.id) ?? { rules: [], defaultTargetId: undefined };
        const Icon = TYPE_ICONS[q.type] ?? Type;
        const num = qNums.get(q.id);
        const qIdx = allQuestions.findIndex(aq => aq.id === q.id);
        const forwardQuestions = allQuestions.slice(qIdx + 1).filter(fq => fq.type !== 'welcome');

        return (
          <div key={q.id} className="bg-brand-ghost/20 rounded-xl border border-black/5 p-4 space-y-3">
            {/* Question header */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onClickQuestion(q.id)}>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${TYPE_COLORS[q.type]} border border-black/5`}>
                <Icon className="w-3 h-3 text-brand-black/60" />
              </div>
              <span className="text-xs font-bold text-brand-black/40">{num}</span>
              <span className="text-sm font-medium text-brand-black">{q.text || 'Untitled'}</span>
            </div>

            {/* Default target */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-brand-black/50 shrink-0">{draft.rules.length > 0 ? 'All other cases go to' : 'Always go to'}</span>
              <TargetSelector value={draft.defaultTargetId ?? ''} forwardQuestions={forwardQuestions} qNums={qNums}
                onChange={id => onChange(q.id, { ...draft, defaultTargetId: id || undefined })} />
            </div>

            {/* Add rule */}
            {!isScreen(q.type) && (
              <button onClick={() => {
                const ops = getOperatorsForType(q.type);
                onChange(q.id, { ...draft, rules: [...draft.rules, { conditions: [{ operator: ops[0], value: '' }], targetQuestionId: '' }] });
              }} className="flex items-center gap-1.5 text-xs font-medium text-brand-black/40 hover:bg-brand-ghost/40 rounded-lg px-2 py-1 transition-colors">
                <Plus className="w-3 h-3" /> Add rule
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Rule Editor ──────────────────────────────────────────────────────────────

function RuleEditor({ rule, ruleIndex, question, questions, qNums, forwardQuestions, onChange, onRemove, removing }: {
  rule: BranchRule; ruleIndex: number; question: Question; questions: Question[];
  qNums: Map<string, number>; forwardQuestions: Question[];
  onChange: (r: BranchRule) => void; onRemove: () => void; removing?: boolean;
}) {
  const Icon = TYPE_ICONS[question.type] ?? Type;
  const num = qNums.get(question.id);

  const updateCond = (ci: number, patch: Partial<BranchCondition>) => {
    onChange({ ...rule, conditions: rule.conditions.map((c, j) => j === ci ? { ...c, ...patch } : c) });
  };
  const addCond = () => {
    const ops = getOperatorsForType(question.type);
    onChange({ ...rule, conditions: [...rule.conditions, { operator: ops[0], value: '' }] });
  };
  const removeCond = (ci: number) => onChange({ ...rule, conditions: rule.conditions.filter((_, j) => j !== ci) });

  const containerRef = useRef<HTMLDivElement>(null);
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !animating) return;
    el.style.height = '0px';
    el.style.opacity = '0';
    el.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      el.style.transition = 'height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease 0.15s';
      el.style.height = el.scrollHeight + 'px';
      el.style.opacity = '1';
    });
    const timer = setTimeout(() => { el.style.height = 'auto'; el.style.overflow = 'visible'; setAnimating(false); }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !removing) return;
    el.style.height = el.scrollHeight + 'px';
    el.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      el.style.transition = 'height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease, margin 0.3s cubic-bezier(0.4,0,0.2,1)';
      el.style.height = '0px';
      el.style.opacity = '0';
      el.style.marginTop = '0px';
      el.style.marginBottom = '0px';
      el.style.paddingTop = '0px';
      el.style.paddingBottom = '0px';
    });
  }, [removing]);

  return (
    <div ref={containerRef} className="space-y-3 bg-brand-ghost/20 rounded-xl border border-black/5 p-4">
      {/* Conditions */}
      {rule.conditions.map((cond, ci) => (
        <div key={ci} className="space-y-2">
          {ci === 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-brand-black/50">If</span>
              <div className="inline-flex items-center gap-1.5 bg-brand-ghost/80 rounded-lg px-2.5 py-1.5 border border-black/5">
                <Icon className="w-3.5 h-3.5 text-brand-black/50" />
                <span className="text-xs font-bold text-brand-black/50">{num}</span>
                <span className="text-xs font-medium text-brand-black truncate max-w-[200px]">{question.text || 'Untitled'}</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 pl-6">
            <OperatorSelect type={question.type} value={cond.operator} onChange={(op: BranchOperator) => updateCond(ci, { operator: op, value: needsValue(op) ? cond.value : undefined })} />
            {needsValue(cond.operator) && (
              <ValueInput question={question} value={cond.value ?? ''} onChange={v => updateCond(ci, { value: v })} />
            )}
            {rule.conditions.length > 1 && (
              <button onClick={() => removeCond(ci)} className="w-6 h-6 rounded-md flex items-center justify-center text-brand-black/25 hover:text-destructive hover:bg-red-50 transition-colors shrink-0">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="pl-6">
        <button onClick={addCond} className="flex items-center gap-1.5 text-xs font-medium text-brand-black/40 hover:bg-brand-ghost/40 rounded-lg px-2 py-1 transition-colors">
          <Plus className="w-3 h-3" /> Add condition
        </button>
      </div>

      {/* Then go to */}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-sm font-medium text-brand-black/50 shrink-0">Then go to</span>
        <TargetSelector value={rule.targetQuestionId} forwardQuestions={forwardQuestions} qNums={qNums}
          onChange={id => onChange({ ...rule, targetQuestionId: id })} />
      </div>

      <button onClick={onRemove} className="flex items-center gap-1.5 text-xs font-medium text-destructive/70 hover:text-destructive transition-colors">
        <Trash2 className="w-3 h-3" /> Delete rule
      </button>
    </div>
  );
}

// ── Operator Select ──────────────────────────────────────────────────────────

function OperatorSelect({ type, value, onChange }: { type: QuestionType; value: string; onChange: (v: BranchOperator) => void }) {
  const operators = getOperatorsForType(type);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropUp, setDropUp] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropUp(rect.bottom + 120 > window.innerHeight);
    }
    setOpen(!open);
  };

  return (
    <div ref={ref} className="relative">
      <button ref={btnRef} onClick={handleOpen}
        className="flex items-center justify-between gap-1.5 bg-white border border-black/10 rounded-lg py-2 pl-3 pr-2.5 text-xs font-medium text-brand-black hover:border-black/20 transition-colors whitespace-nowrap">
        {OPERATOR_LABELS[value] ?? value}
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 bg-white rounded-xl border border-black/5 shadow-lg z-50 py-1 min-w-[140px]`}>
          {operators.map(op => (
            <button key={op} onClick={() => { onChange(op); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-brand-ghost transition-colors ${value === op ? 'text-brand-black bg-brand-ghost' : 'text-brand-black/70'}`}>
              {OPERATOR_LABELS[op] ?? op}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Value Input ──────────────────────────────────────────────────────────────

function ValueInput({ question, value, onChange }: { question: Question; value: string; onChange: (v: string) => void }) {
  const t = question.type;
  const o = question.options ?? {};

  if ((t === 'multiple' || t === 'dropdown' || t === 'checkbox') && o.choices?.length) {
    return <ValueDropdown options={o.choices.map(c => ({ value: c, label: c }))} value={value} onChange={onChange} />;
  }

  if (t === 'rating') {
    const low = o.ratingLow ?? 1, high = o.ratingHigh ?? 5;
    const nums = Array.from({ length: high - low + 1 }, (_, i) => i + low);
    return <ValueDropdown options={nums.map(n => ({ value: String(n), label: String(n) }))} value={value} onChange={onChange} />;
  }

  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="Value..."
      className="flex-1 bg-white border border-black/10 rounded-lg py-2 px-3 text-xs font-medium text-brand-black outline-none placeholder:text-brand-black/30 hover:border-black/20 transition-colors" />
  );
}

function ValueDropdown({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropUp, setDropUp] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropUp(rect.bottom + 160 > window.innerHeight);
    }
    setOpen(!open);
  };

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative flex-1">
      <button ref={btnRef} onClick={handleOpen}
        className="w-full flex items-center justify-between bg-white border border-black/10 rounded-lg py-2 pl-3 pr-2.5 text-xs font-medium text-left hover:border-black/20 transition-colors">
        <span className={selected ? 'text-brand-black' : 'text-brand-black/30'}>{selected?.label ?? 'Select...'}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground shrink-0 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 bg-white rounded-xl border border-black/5 shadow-lg z-50 py-1 max-h-[200px] overflow-y-auto scrollbar-hide`}>
          {options.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-brand-ghost transition-colors ${value === o.value ? 'text-brand-black bg-brand-ghost' : 'text-brand-black/70'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Target Selector ──────────────────────────────────────────────────────────

function TargetSelector({ value, forwardQuestions, qNums, onChange }: {
  value: string; forwardQuestions: Question[]; qNums: Map<string, number>; onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropUp, setDropUp] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropUp(rect.bottom + 260 > window.innerHeight);
    }
    setOpen(!open); setSearch('');
  };

  const selected = forwardQuestions.find(q => q.id === value);
  const filtered = search ? forwardQuestions.filter(q => (q.text || 'Untitled').toLowerCase().includes(search.toLowerCase())) : forwardQuestions;

  return (
    <div ref={ref} className="relative flex-1">
      <button ref={btnRef} onClick={handleOpen}
        className="w-full flex items-center justify-between bg-white border border-black/10 rounded-lg py-2 px-3 text-xs font-medium text-left hover:border-black/20 transition-colors">
        {selected ? (
          <div className="flex items-center gap-2 truncate">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${TYPE_COLORS[selected.type]} text-brand-black/70 shrink-0`}>{qNums.get(selected.id)}</div>
            <span className="truncate text-brand-black">{selected.text || 'Untitled'}</span>
          </div>
        ) : <span className="text-brand-black/30">Select...</span>}
        <ChevronDown className={`w-3 h-3 text-muted-foreground shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 bg-white rounded-xl border border-black/5 shadow-lg z-50 py-1 max-h-[240px] overflow-hidden flex flex-col`}>
          <div className="px-3 py-2 border-b border-black/5 shrink-0">
            <div className="flex items-center gap-2 bg-brand-ghost/40 rounded-lg px-2.5 py-1.5">
              <Search className="w-3 h-3 text-brand-black/30" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." autoFocus
                className="bg-transparent text-xs text-brand-black placeholder:text-brand-black/30 outline-none flex-1" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide py-1">
            {filtered.map(q => {
              const Icon = TYPE_ICONS[q.type] ?? Type;
              const num = qNums.get(q.id);
              return (
                <button key={q.id} onClick={() => { onChange(q.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-brand-ghost transition-colors ${value === q.id ? 'bg-brand-ghost' : ''}`}>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${TYPE_COLORS[q.type]} border border-black/5 shrink-0`}>
                    <Icon className="w-3 h-3 text-brand-black/50" />
                  </div>
                  <span className="text-xs font-bold text-brand-black/40 shrink-0">{num}</span>
                  <span className="text-xs font-medium text-brand-black truncate">{q.text || 'Untitled'}</span>
                </button>
              );
            })}
            {filtered.length === 0 && <p className="text-xs text-brand-black/30 text-center py-3">No questions found</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scoring View ─────────────────────────────────────────────────────────────

function ScoringView({ questions }: { questions: Question[] }) {
  let qNum = 0;
  const rows = questions.filter(q => !isScreen(q.type)).map(q => { qNum++; return { num: qNum, label: q.text || 'Untitled', type: q.type }; });
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_100px] bg-brand-ghost border-b border-black/5 px-4 py-2.5">
          <span className="text-xs font-bold text-brand-black/40 uppercase tracking-wider">Question</span>
          <span className="text-xs font-bold text-brand-black/40 uppercase tracking-wider">Type</span>
          <span className="text-xs font-bold text-brand-black/40 uppercase tracking-wider text-right">Points</span>
        </div>
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-brand-black/30">No questions yet</div>
        ) : rows.map((row, i) => (
          <div key={i} className={`grid grid-cols-[1fr_160px_100px] px-4 py-3 items-center ${i < rows.length - 1 ? 'border-b border-black/5' : ''}`}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-bold text-brand-black/30 shrink-0">Q{row.num}</span>
              <span className="text-sm font-medium text-brand-black truncate">{row.label}</span>
            </div>
            <span className="text-sm text-brand-black/50 capitalize">{row.type.replace('_', ' ')}</span>
            <span className="text-sm text-right text-brand-black/25">—</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-brand-black/30 text-center mt-4 font-medium">Scoring will be available in a future update.</p>
    </div>
  );
}

// ── Tagging View ─────────────────────────────────────────────────────────────

function TaggingView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-14 h-14 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center">
        <Tag className="w-6 h-6 text-brand-black/25" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-brand-black mb-1">Tag your respondents</h3>
        <p className="text-sm text-brand-black/40 max-w-xs leading-relaxed">Automatically apply tags based on answers. Coming soon.</p>
      </div>
      <button disabled className="mt-1 px-5 py-2 bg-brand-ghost border border-black/5 rounded-lg text-sm font-medium text-brand-black/30 cursor-not-allowed">Create tag</button>
    </div>
  );
}
