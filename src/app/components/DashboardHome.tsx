import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MoreHorizontal,
  Users,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Inbox,
  FileText,
  Link2,
  Pencil,
  GitBranch,
  Share2,
  CaseSensitive,
  Copy,
  Trash2,
  Clock,
  ArrowDownAZ,
  Check,
  Plus,
  Briefcase,
  BarChart2,
  GraduationCap,
  Globe,
  Heart,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  useSurveys,
  useDeleteSurvey,
  useDuplicateSurvey,
  useUpdateSurvey,
} from '../../hooks/useSurveys';
import type { SurveyClient } from '../../types/survey';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { templateMeta } from '../../lib/surveyTemplates';

type SortOption = 'date_created' | 'last_updated' | 'alphabetical';
type ViewMode = 'list' | 'grid';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
type RowsPerPage = typeof ROWS_PER_PAGE_OPTIONS[number];

const SORT_OPTIONS = [
  { value: 'date_created' as SortOption, label: 'Date created', icon: Calendar },
  { value: 'last_updated' as SortOption, label: 'Last updated', icon: Clock },
  { value: 'alphabetical' as SortOption, label: 'Alphabetical', icon: ArrowDownAZ },
];

function useClickOutside(ref: React.RefObject<HTMLElement | null>, callback: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) callback();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, callback]);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function completionRate(survey: SurveyClient): number | null {
  const { responseCount, viewCount } = survey;
  if (viewCount == null || viewCount === 0) return null;
  if (responseCount == null) return null;
  return Math.round((responseCount / viewCount) * 100);
}

interface SurveyRowMenuProps {
  survey: SurveyClient;
  onRename: (s: SurveyClient) => void;
  onDelete: (s: SurveyClient) => void;
  onOpenChange?: (open: boolean) => void;
}

function SurveyRowMenu({ survey, onRename, onDelete, onOpenChange }: SurveyRowMenuProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const duplicateMut = useDuplicateSurvey();
  useClickOutside(ref, () => {
    setOpen(false);
    onOpenChange?.(false);
  });

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setOpenUpward(window.innerHeight - rect.bottom < 260);
    }
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
  };

  const handleAction = async (action: string) => {
    setOpen(false);
    onOpenChange?.(false);
    switch (action) {
      case 'copy_link': {
        const url = `${window.location.origin}/s/${survey.id}`;
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
        break;
      }
      case 'edit':
        navigate(`/builder/${survey.id}`);
        break;
      case 'flow':
        navigate(`/builder/${survey.id}?tab=logic`);
        break;
      case 'share':
        navigate(`/builder/${survey.id}?tab=share`);
        break;
      case 'rename':
        onRename(survey);
        break;
      case 'duplicate':
        try {
          await duplicateMut.mutateAsync(survey.id);
          toast.success('Survey duplicated');
        } catch {
          toast.error('Could not duplicate survey');
        }
        break;
      case 'delete':
        onDelete(survey);
        break;
    }
  };

  const items: ({ divider: true } | { label: string; icon: React.ElementType; action: string; danger?: boolean })[] = [
    { label: 'Copy link', icon: Link2, action: 'copy_link' },
    { divider: true },
    { label: 'Edit', icon: Pencil, action: 'edit' },
    { label: 'Logic', icon: GitBranch, action: 'flow' },
    { label: 'Share', icon: Share2, action: 'share' },
    { divider: true },
    { label: 'Rename', icon: CaseSensitive, action: 'rename' },
    { label: 'Duplicate', icon: Copy, action: 'duplicate' },
    { divider: true },
    { label: 'Delete', icon: Trash2, action: 'delete', danger: true },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
          open
            ? 'bg-brand-ghost text-brand-black'
            : 'text-brand-black/30 hover:text-brand-black/70 hover:bg-brand-ghost'
        }`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className={`absolute right-0 ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'} w-44 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-black/5 dark:border-white/10 z-50 py-1 overflow-hidden`}>
          {items.map((item, i) => {
            if ('divider' in item) return <div key={i} className="h-px bg-black/5 dark:bg-white/10 my-1" />;
            const Icon = item.icon;
            return (
              <button
                key={item.action}
                onClick={() => handleAction(item.action)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors ${
                  item.danger
                    ? 'text-red-500 hover:bg-red-50'
                    : 'text-brand-black/80 hover:bg-brand-ghost'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const current = SORT_OPTIONS.find(o => o.value === value)!;
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 rounded-lg text-sm font-medium text-brand-black/70 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors shadow-sm"
      >
        <CurrentIcon className="w-4 h-4 text-brand-black/40" />
        {current.label}
        <ChevronDown className="w-4 h-4 text-brand-black/40" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-black/5 dark:border-white/10 z-50 py-1 overflow-hidden">
          {SORT_OPTIONS.map(opt => {
            const OptIcon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-brand-black/80 hover:bg-brand-ghost transition-colors"
              >
                <OptIcon className="w-3.5 h-3.5 text-brand-black/50 shrink-0" />
                <span className="flex-1 text-left">{opt.label}</span>
                {value === opt.value && <Check className="w-3.5 h-3.5 text-brand-black/60" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RenameDialog({
  survey,
  onClose,
}: {
  survey: SurveyClient | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(survey?.title ?? '');
  const updateMut = useUpdateSurvey();

  useEffect(() => { setTitle(survey?.title ?? ''); }, [survey]);

  if (!survey) return null;

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === survey.title) { onClose(); return; }
    try {
      await updateMut.mutateAsync({ id: survey.id, data: { title: trimmed } });
      toast.success('Renamed');
      onClose();
    } catch {
      toast.error('Could not rename survey');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-brand-black mb-4">Rename survey</h2>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
          className="w-full px-4 py-3 rounded-xl border border-black/10 bg-brand-ghost/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-black/5 focus:border-brand-black/20 transition-all font-medium text-base"
        />
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-brand-black/70 hover:text-brand-black transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={updateMut.isPending} className="px-4 py-2 bg-brand-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 transition-colors disabled:opacity-60">Save</button>
        </div>
      </div>
    </div>
  );
}

export function surveyIcon(survey: SurveyClient): { Icon: React.ElementType; color: string } {
  if (!survey.templateId) return { Icon: FileText, color: 'text-brand-black/40' };
  const meta = templateMeta.find(t => t.id === survey.templateId);
  if (!meta) return { Icon: FileText, color: 'text-brand-black/40' };
  const MAP: Record<string, { Icon: React.ElementType; color: string }> = {
    'Customers':              { Icon: Users,          color: 'text-blue-500' },
    'Employees':              { Icon: Briefcase,      color: 'text-amber-500' },
    'Markets':                { Icon: BarChart2,      color: 'text-green-500' },
    'Students':               { Icon: GraduationCap, color: 'text-purple-500' },
    'Website / App Visitors': { Icon: Globe,          color: 'text-cyan-500' },
    'Events & Scheduling':    { Icon: Calendar,       color: 'text-rose-500' },
    'Community':              { Icon: Heart,          color: 'text-pink-500' },
  };
  return MAP[meta.category] ?? { Icon: FileText, color: 'text-brand-black/40' };
}

export function DashboardHome() {
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('surveygo:view-mode') as ViewMode) ?? 'list'
  );
  const [sortBy, setSortBy] = useState<SortOption>('last_updated');
  const [rowsPerPage, setRowsPerPage] = useState<RowsPerPage>(10);
  const [page, setPage] = useState(0);
  const [renameTarget, setRenameTarget] = useState<SurveyClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SurveyClient | null>(null);
  const [openMenuSurveyId, setOpenMenuSurveyId] = useState<string | null>(null);
  const { data: surveys = [], isLoading } = useSurveys();
  const deleteMut = useDeleteSurvey();

  const sorted = useMemo(() => {
    const arr = [...surveys];
    if (sortBy === 'date_created') arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    else if (sortBy === 'last_updated') arr.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    else if (sortBy === 'alphabetical') arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return arr;
  }, [surveys, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  useEffect(() => {
    setOpenMenuSurveyId(null);
  }, [page, sortBy]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success('Survey deleted');
    } catch {
      toast.error('Could not delete survey');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f9f9fb] dark:bg-neutral-950 overflow-y-auto">
      <RenameDialog survey={renameTarget} onClose={() => setRenameTarget(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete survey?"
        description={deleteTarget ? `"${deleteTarget.title || 'Untitled'}" and all its responses will be permanently deleted. This cannot be undone.` : ''}
        confirmLabel="Delete permanently"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Header */}
      <header className="px-8 py-8 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-medium text-brand-black tracking-tight">Your Surveys</h1>
        </div>

        <div className="flex items-center gap-3">
          <SortDropdown value={sortBy} onChange={setSortBy} />
          <div className="relative">
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value) as RowsPerPage); setPage(0); }}
              className="appearance-none bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-brand-black/70 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
            >
              {ROWS_PER_PAGE_OPTIONS.map(n => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-black/40 pointer-events-none" />
          </div>
          <div className="flex items-center bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 rounded-lg shadow-sm overflow-hidden p-0.5">
            <button
              onClick={() => { setViewMode('list'); localStorage.setItem('surveygo:view-mode', 'list'); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-black/5 text-brand-black' : 'text-brand-black/50 hover:text-brand-black'}`}
            >
              <ListIcon className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => { setViewMode('grid'); localStorage.setItem('surveygo:view-mode', 'grid'); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-black/5 text-brand-black' : 'text-brand-black/50 hover:text-brand-black'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              Grid
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 pb-12">
        {isLoading ? (
          <div className="text-sm text-brand-black/40 py-12 text-center">Loading surveys...</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-ghost flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-brand-black/40" />
            </div>
            <h3 className="text-lg font-semibold text-brand-black mb-1">No surveys yet</h3>
            <p className="text-sm text-brand-black/50 mb-6 max-w-xs">Create your first survey to start collecting responses.</p>
            <Link to="/dashboard/create" className="inline-flex items-center gap-2 bg-[#EFF0A3] text-brand-black px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#d4d47a] transition-colors">
              <Plus className="w-4 h-4" />
              Create New Survey
            </Link>
          </div>
        ) : viewMode === 'list' ? (
          <>
            <div className="flex items-center mb-3 text-xs font-medium text-brand-black/40 tracking-wide">
              <div className="flex-1" />
              <div className="w-20 text-center">Responses</div>
              <div className="w-24 text-center">Completion</div>
              <div className="w-32 text-center">Updated</div>
              <div className="w-24 text-center">Status</div>
              <div className="w-8" />
            </div>

            <div className="flex flex-col gap-2">
              {paginated.map(survey => {
                const cr = completionRate(survey);
                return (
                  <div
                    key={survey.id}
                    className="bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 shadow-sm rounded-xl flex items-center group hover:shadow-md hover:-translate-y-px transition-all duration-200"
                  >
                    <Link
                      to={`/builder/${survey.id}`}
                      className="flex items-center gap-4 flex-1 min-w-0 px-4 py-3"
                    >
                      {(() => { const { Icon, color } = surveyIcon(survey); return (
                        <div className="w-10 h-10 rounded-[10px] bg-brand-ghost flex items-center justify-center shrink-0">
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                      ); })()}
                      <span className="font-medium text-brand-black text-[15px] truncate">{survey.title || 'Untitled'}</span>
                    </Link>

                    <div className="flex items-center text-sm text-brand-black/60 shrink-0 pr-2 py-3">
                      <div className="w-20 text-center">{survey.responseCount || '—'}</div>
                      <div className="w-24 text-center">{cr ? `${cr}%` : '—'}</div>
                      <div className="w-32 text-center">{formatDate(survey.updatedAt)}</div>
                      <div className="w-24 flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          survey.status === 'active' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : survey.status === 'closed' ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400' : 'bg-black/5 dark:bg-white/10 text-brand-black/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${survey.status === 'active' ? 'bg-green-500' : survey.status === 'closed' ? 'bg-gray-400' : 'bg-brand-black/20'}`} />
                          {survey.status === 'active' ? 'Active' : survey.status === 'closed' ? 'Closed' : 'Draft'}
                        </span>
                      </div>
                      <div className="w-8 flex justify-center">
                        <SurveyRowMenu survey={survey} onRename={setRenameTarget} onDelete={setDeleteTarget} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map(survey => {
              const cr = completionRate(survey);
              return (
                <div
                  key={survey.id}
                  className={`bg-white dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col relative ${openMenuSurveyId === survey.id ? 'z-10' : 'z-0'}`}
                >
                  <Link to={`/builder/${survey.id}`} className="block rounded-t-2xl overflow-hidden shrink-0">
                    {(() => {
                      const s = survey.settings;
                      const pageBg = !s?.background || s.background === 'white' ? 'var(--brand-ghost)' : s.background === 'lightGray' ? '#F5F5F5' : s.background;
                      const accent = s?.accentColor || '#EFF0A3';
                      const font = s?.fontFamily || 'Inter';
                      // Scale so the inner 263% content renders at exactly the preview area width
                      const SCALE = 0.38;
                      const W = `${(100 / SCALE).toFixed(2)}%`;
                      return (
                        <div className="h-36 w-full bg-white dark:bg-neutral-900 overflow-hidden relative">
                          {survey.headerImageUrl ? (
                            <img src={survey.headerImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            /* Inset preview — white card shows on sides/top/bottom */
                            <div
                              className="absolute top-2 bottom-2 left-3 right-3 overflow-hidden rounded-xl pointer-events-none select-none"
                              style={{ background: pageBg }}
                            >
                              {/* Scaled respondent view — always light-mode colors (respondent view has no dark mode) */}
                              <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', width: W, position: 'absolute', top: 0, left: 0, fontFamily: font, color: '#212121' }}>
                                <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '32px 24px 24px' }}>
                                  {/* Progress bar */}
                                  <div className="flex items-center gap-3 mb-5">
                                    <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
                                      <div className="h-full w-1/4 rounded-full" style={{ background: accent }} />
                                    </div>
                                    <span className="text-xs font-semibold text-brand-black/60">25%</span>
                                  </div>
                                  {/* Title — matches respondent view: text-3xl font-display font-bold */}
                                  <h1 className="font-display font-bold text-brand-black tracking-tight mb-5" style={{ fontSize: '2rem', lineHeight: 1.2 }}>
                                    {survey.title || 'Untitled Survey'}
                                  </h1>
                                  {/* Question cards — exact copy of respondent QuestionCard */}
                                  <div className="space-y-5">
                                    {survey.questions.length === 0 ? (
                                      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
                                        <p className="text-sm text-brand-black/30 italic">No questions yet</p>
                                      </div>
                                    ) : survey.questions.slice(0, 4).map((q, i) => (
                                      <div key={q.id} className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
                                        <p className="text-xs font-bold text-brand-black/40 uppercase tracking-wider mb-1">Question {i + 1}</p>
                                        <h3 className="text-lg font-semibold text-brand-black leading-snug mb-3">{q.text || 'Untitled question'}</h3>
                                        {/* Simplified input placeholder — fixed light color, not dark-mode-aware */}
                                        <div className="h-9 rounded-lg border border-black/5" style={{ background: '#F6F5FA' }} />
                                      </div>
                                    ))}
                                    {/* Submit button */}
                                    <div className="pt-4">
                                      <div className="w-full rounded-xl py-3.5 text-center font-semibold text-brand-black" style={{ background: accent }}>
                                        Submit response
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </Link>
                  <div className="px-4 py-3 border-t border-black/5 dark:border-white/10 flex flex-col gap-1.5 flex-1">
                    <Link to={`/builder/${survey.id}`} className="min-w-0">
                      <span className="text-sm font-medium text-brand-black truncate block leading-snug">{survey.title || 'Untitled'}</span>
                    </Link>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-brand-black/50">
                        <div className="relative group/tip">
                          <svg className="w-4 h-4" viewBox="0 0 16 16">
                            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" />
                            {cr !== null && (
                              <circle
                                cx="8" cy="8" r="6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeDasharray={`${(cr / 100) * 37.7} 37.7`}
                                strokeDashoffset="9.4"
                                transform="rotate(-90 8 8)"
                              />
                            )}
                          </svg>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-brand-black text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-10">
                            Completion: {cr !== null ? `${cr}%` : '—'}
                          </div>
                        </div>
                        <div className="relative group/tip">
                          <span>{survey.responseCount || '—'}</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-brand-black text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-10">
                            Responses
                          </div>
                        </div>
                        <div className="relative group/tip">
                          <span>{formatDate(survey.updatedAt)}</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-brand-black text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-10">
                            Last updated
                          </div>
                        </div>
                      </div>
                      <SurveyRowMenu survey={survey} onRename={setRenameTarget} onDelete={setDeleteTarget} onOpenChange={(o) => setOpenMenuSurveyId(o ? survey.id : null)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-brand-black/35">
              Showing {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, sorted.length)} of {sorted.length} surveys
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${page === 0 ? 'text-brand-black/15 cursor-not-allowed' : 'text-brand-black/40 hover:text-brand-black hover:bg-white dark:hover:bg-white/10'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${page === i ? 'bg-brand-black dark:bg-neutral-700 text-white' : 'text-brand-black/40 hover:bg-white dark:hover:bg-white/10'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${page === totalPages - 1 ? 'text-brand-black/15 cursor-not-allowed' : 'text-brand-black/40 hover:text-brand-black hover:bg-white dark:hover:bg-white/10'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
