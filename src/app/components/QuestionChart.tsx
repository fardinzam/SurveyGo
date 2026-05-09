import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format as dfFormat, parseISO } from 'date-fns';
import type { Question, SurveyResponseClient } from '../../types/survey';

const COLORS = ['#EFF0A3', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];

interface QuestionChartProps {
  question: Question;
  responses: SurveyResponseClient[];
  chartType: string;
  onSeeAll: () => void;
}

export function QuestionChart({ question, responses, chartType, onSeeAll }: QuestionChartProps) {
  const type = question.type;

  // ── Choice data (multiple / checkbox / dropdown) ──────────────────────────
  const choiceData = useMemo(() => {
    if (type !== 'multiple' && type !== 'checkbox' && type !== 'dropdown') return [];
    const tally: Record<string, number> = {};
    for (const choice of question.options?.choices ?? []) tally[choice] = 0;
    for (const r of responses) {
      const ans = r.answers.find(a => a.questionId === question.id);
      if (!ans) continue;
      if (Array.isArray(ans.value)) {
        for (const v of ans.value as string[]) tally[v] = (tally[v] ?? 0) + 1;
      } else if (typeof ans.value === 'string') {
        tally[ans.value] = (tally[ans.value] ?? 0) + 1;
      }
    }
    return Object.entries(tally)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [question, responses, type]);

  // ── Rating data ────────────────────────────────────────────────────────────
  const ratingData = useMemo(() => {
    if (type !== 'rating') return { dist: [], mean: 0, total: 0, scale: 5 };
    const low = question.options?.ratingLow ?? 1;
    const high = question.options?.ratingHigh ?? (question.options?.scale ?? 5);
    const tally: Record<number, number> = {};
    for (let i = low; i <= high; i++) tally[i] = 0;
    const vals: number[] = [];
    for (const r of responses) {
      const ans = r.answers.find(a => a.questionId === question.id);
      const n = typeof ans?.value === 'number' ? ans.value : parseFloat(String(ans?.value ?? ''));
      if (!isNaN(n)) { tally[n] = (tally[n] ?? 0) + 1; vals.push(n); }
    }
    const mean = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    const dist = Object.entries(tally).map(([k, v]) => ({ rating: Number(k), count: v }));
    return { dist, mean, total: vals.length, scale: high };
  }, [question, responses, type]);

  // ── Grid data ──────────────────────────────────────────────────────────────
  const gridData = useMemo(() => {
    if (type !== 'grid_multiple' && type !== 'grid_checkbox') return [];
    const rows = question.options?.rows ?? [];
    const cols = question.options?.columns ?? [];
    return rows.map(row => {
      const entry: Record<string, string | number> = { row };
      for (const col of cols) entry[col] = 0;
      for (const r of responses) {
        const ans = r.answers.find(a => a.questionId === question.id);
        const grid = ans?.value as Record<string, string | string[]> | undefined;
        if (!grid) continue;
        const sel = grid[row];
        if (Array.isArray(sel)) {
          for (const c of sel) if (cols.includes(c)) entry[c] = (entry[c] as number) + 1;
        } else if (typeof sel === 'string' && cols.includes(sel)) {
          entry[sel] = (entry[sel] as number) + 1;
        }
      }
      return entry;
    });
  }, [question, responses, type]);

  // ── Date data ──────────────────────────────────────────────────────────────
  const dateData = useMemo(() => {
    if (type !== 'date') return [];
    const tally: Record<string, number> = {};
    for (const r of responses) {
      const ans = r.answers.find(a => a.questionId === question.id);
      if (typeof ans?.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ans.value)) {
        tally[ans.value] = (tally[ans.value] ?? 0) + 1;
      }
    }
    return Object.entries(tally)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        let label = date;
        try { label = dfFormat(parseISO(date), 'MMM d'); } catch { /* keep raw */ }
        return { date: label, count };
      });
  }, [question, responses, type]);

  // ── Time data ──────────────────────────────────────────────────────────────
  const timeData = useMemo(() => {
    if (type !== 'time') return [];
    const buckets: Record<string, number> = {};
    for (let h = 0; h < 24; h++) buckets[`${String(h).padStart(2, '0')}:00`] = 0;
    for (const r of responses) {
      const ans = r.answers.find(a => a.questionId === question.id);
      if (typeof ans?.value === 'string') {
        const [hStr] = ans.value.split(':');
        const key = `${hStr.padStart(2, '0')}:00`;
        if (key in buckets) buckets[key]++;
      }
    }
    return Object.entries(buckets)
      .filter(([, count]) => count > 0)
      .map(([hour, count]) => ({ hour, count }));
  }, [question, responses, type]);

  // ── Text responses ─────────────────────────────────────────────────────────
  const textAnswers = useMemo(() => {
    if (type !== 'short' && type !== 'long') return [];
    return responses
      .map(r => r.answers.find(a => a.questionId === question.id))
      .filter((a): a is NonNullable<typeof a> => a !== undefined && a.value !== '' && a.value !== null)
      .map(a => String(a.value));
  }, [question, responses, type]);

  // ── Routing ────────────────────────────────────────────────────────────────
  if (type === 'short' || type === 'long') {
    return <TextList answers={textAnswers} onSeeAll={onSeeAll} />;
  }
  if (type === 'date') {
    return <SimpleBars data={dateData} xKey="date" />;
  }
  if (type === 'time') {
    return <SimpleBars data={timeData} xKey="hour" />;
  }
  if (type === 'rating') {
    const ratingBars = ratingData.dist.map(d => ({ name: String(d.rating), count: d.count }));
    if (chartType === 'mean') return <MeanScore mean={ratingData.mean} total={ratingData.total} scale={ratingData.scale} />;
    if (chartType === 'histogram') return <BarVertical data={ratingBars} />;
    return <BarHorizontal data={ratingBars} />;
  }
  if (type === 'grid_multiple' || type === 'grid_checkbox') {
    return <GroupedBar data={gridData} cols={question.options?.columns ?? []} />;
  }
  // choice types
  if (chartType === 'pie') return <PieDistribution data={choiceData} />;
  if (chartType === 'bar_vertical') return <BarVertical data={choiceData} />;
  if (chartType === 'lollipop') return <Lollipop data={choiceData} />;
  return <BarHorizontal data={choiceData} />;
}

// ── Sub-renderers ─────────────────────────────────────────────────────────────

function PieDistribution({ data }: { data: { name: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!data.length || total === 0) return <EmptyChart />;
  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="60%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { name: string; count: number };
              const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <div className="bg-white border border-black/5 rounded-xl shadow-md px-3 py-2 text-sm">
                  <p className="font-medium text-brand-black">{d.name}</p>
                  <p className="text-brand-black/60">{d.count} ({pct}%)</p>
                </div>
              );
            }}
          />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="left"
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-brand-black/60">{value}</span>}
            wrapperStyle={{ paddingRight: 8, maxWidth: 180 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function WrapYTick({ x, y, payload, width }: any) {
  const text = String(payload?.value ?? '');
  const maxCharsPerLine = Math.max(8, Math.floor((width ?? 120) / 6.5));
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxCharsPerLine && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  const lineH = 13;
  const totalH = lines.length * lineH;
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={-(totalH / 2) + i * lineH + lineH * 0.75}
          textAnchor="end"
          fontSize={11}
          fill="#666"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function BarVertical({ data }: { data: { name: string; count: number }[] }) {
  if (!data.length) return <EmptyChart />;
  const angled = data.length > 4;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: angled ? 50 : 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#666' }}
            angle={angled ? -35 : 0}
            textAnchor={angled ? 'end' : 'middle'}
            interval={0}
          />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={<SimpleTooltip />} />
          <Bar dataKey="count" fill="#EFF0A3" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BarHorizontal({ data }: { data: { name: string; count: number }[] }) {
  if (!data.length) return <EmptyChart />;
  const maxLen = Math.max(...data.map(d => d.name.length));
  const yWidth = Math.min(Math.max(80, maxLen * 6.5), 220);
  const rowHeight = Math.max(36, data.length > 6 ? 32 : 40);
  const height = Math.max(160, data.length * rowHeight);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} />
          <YAxis
            type="category"
            dataKey="name"
            width={yWidth}
            axisLine={false}
            tickLine={false}
            tick={<WrapYTick width={yWidth} />}
          />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={<SimpleTooltip />} />
          <Bar dataKey="count" fill="#EFF0A3" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Lollipop({ data }: { data: { name: string; count: number }[] }) {
  if (!data.length) return <EmptyChart />;
  const maxLen = Math.max(...data.map(d => d.name.length));
  const yWidth = Math.min(Math.max(80, maxLen * 6.5), 220);
  const height = Math.max(160, data.length * 36);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} />
          <YAxis
            type="category"
            dataKey="name"
            width={yWidth}
            axisLine={false}
            tickLine={false}
            tick={<WrapYTick width={yWidth} />}
          />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={<SimpleTooltip />} />
          <Bar
            dataKey="count"
            shape={(props: any) => (
              <g>
                <rect
                  x={props.x}
                  y={props.y + props.height / 2 - 1}
                  width={props.width}
                  height={2}
                  fill="#EFF0A3"
                  rx={1}
                />
                <circle
                  cx={props.x + props.width}
                  cy={props.y + props.height / 2}
                  r={5}
                  fill="#EFF0A3"
                />
              </g>
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MeanScore({ mean, total, scale }: { mean: number; total: number; scale: number }) {
  const pct = scale > 0 ? (mean / scale) * 100 : 0;
  return (
    <div className="flex flex-col items-center py-4 gap-3">
      <span className="text-5xl font-bold font-display text-brand-black">{mean.toFixed(1)}</span>
      <span className="text-sm text-brand-black/50">out of {scale}</span>
      <div className="w-full max-w-xs bg-brand-ghost rounded-full h-2 overflow-hidden">
        <div className="h-full bg-[#EFF0A3] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-brand-black/40">Based on {total} response{total !== 1 ? 's' : ''}</span>
    </div>
  );
}

function GroupedBar({ data, cols }: { data: Record<string, string | number>[]; cols: string[] }) {
  if (!data.length || !cols.length) return <EmptyChart />;
  if (cols.length > 8) {
    return <p className="text-sm text-brand-black/40 text-center py-6">Too many columns to display as a chart.</p>;
  }
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="row" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-brand-black/60" style={{ whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 120, display: 'inline-block' }}>{value}</span>
            )}
            wrapperStyle={{ paddingTop: 8 }}
          />
          {cols.map((col, i) => (
            <Bar key={col} dataKey={col} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimpleBars({ data, xKey }: { data: { count: number; [key: string]: unknown }[]; xKey: string }) {
  if (!data.length) return <EmptyChart />;
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={<SimpleTooltip />} />
          <Bar dataKey="count" fill="#EFF0A3" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TextList({ answers, onSeeAll }: { answers: string[]; onSeeAll: () => void }) {
  const preview = answers.slice(0, 5);
  if (!answers.length) return <EmptyChart />;
  return (
    <div className="flex flex-col gap-2">
      {preview.map((text, i) => (
        <div key={i} className="px-3 py-2.5 bg-brand-ghost/50 rounded-xl text-sm text-brand-black line-clamp-2">
          {text}
        </div>
      ))}
      {answers.length > 5 && (
        <button
          onClick={onSeeAll}
          className="text-xs font-medium text-brand-blue hover:underline text-left mt-1"
        >
          See all {answers.length} responses →
        </button>
      )}
    </div>
  );
}

function EmptyChart() {
  return <p className="text-sm text-brand-black/40 text-center py-6">No data yet.</p>;
}

function SimpleTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-black/5 rounded-xl shadow-md px-3 py-2">
      <p className="text-xs text-brand-black/50 mb-0.5">{label ?? payload[0].payload?.name}</p>
      <p className="text-sm font-bold text-brand-black">{payload[0].value}</p>
    </div>
  );
}
