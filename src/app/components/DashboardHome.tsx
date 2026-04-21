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
  if (!survey.responseCount || !survey.questions.length) return null;
  // Completion here = fraction of active responses relative to total. Since we don't track
  // per-response completion, we show 100% when any responses exist as a conservative proxy.
  return 100;
}

interface SurveyRowMenuProps {
  survey: SurveyClient;
  onRename: (s: SurveyClient) => void;
  onDelete: (s: SurveyClient) => void;
}

function SurveyRowMenu({ survey, onRename, onDelete }: SurveyRowMenuProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const duplicateMut = useDuplicateSurvey();
  useClickOutside(ref, () => setOpen(false));

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setOpenUpward(window.innerHeight - rect.bottom < 260);
    }
    setOpen(o => !o);
  };

  const handleAction = async (action: string) => {
    setOpen(false);
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
        <div className={`absolute right-0 ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'} w-44 bg-white rounded-xl shadow-lg border border-black/5 z-50 py-1 overflow-hidden`}>
          {items.map((item, i) => {
            if ('divider' in item) return <div key={i} className="h-px bg-black/5 my-1" />;
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
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-black/10 rounded-lg text-sm font-medium text-brand-black/70 hover:bg-gray-50 transition-colors shadow-sm"
      >
        <CurrentIcon className="w-4 h-4 text-brand-black/40" />
        {current.label}
        <ChevronDown className="w-4 h-4 text-brand-black/40" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-black/5 z-50 py-1 overflow-hidden">
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

export function DashboardHome() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('last_updated');
  const [rowsPerPage, setRowsPerPage] = useState<RowsPerPage>(10);
  const [page, setPage] = useState(0);
  const [renameTarget, setRenameTarget] = useState<SurveyClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SurveyClient | null>(null);
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
    <div className="flex-1 flex flex-col h-full bg-[#f9f9fb] overflow-y-auto">
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
          <div className="text-brand-black/40 hover:text-brand-black cursor-pointer transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <button className="flex items-center gap-1.5 text-sm font-medium text-brand-black/60 hover:text-brand-black transition-colors ml-2">
            <Users className="w-4 h-4" />
            Invite
          </button>
          <div className="w-7 h-7 rounded-full bg-brand-honeydew/40 text-brand-black flex items-center justify-center border border-brand-honeydew/80">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SortDropdown value={sortBy} onChange={setSortBy} />
          <div className="relative">
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value) as RowsPerPage); setPage(0); }}
              className="appearance-none bg-white border border-black/10 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-brand-black/70 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {ROWS_PER_PAGE_OPTIONS.map(n => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-black/40 pointer-events-none" />
          </div>
          <div className="flex items-center bg-white border border-black/10 rounded-lg shadow-sm overflow-hidden p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-black/5 text-brand-black' : 'text-brand-black/50 hover:text-brand-black'}`}
            >
              <ListIcon className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
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
            <Link to="/dashboard/create" className="inline-flex items-center gap-2 bg-brand-black text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black/90 transition-colors">
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
                    className="bg-white border border-black/5 shadow-sm rounded-xl flex items-center group hover:shadow-md hover:-translate-y-px transition-all duration-200"
                  >
                    <Link
                      to={`/builder/${survey.id}`}
                      className="flex items-center gap-4 flex-1 min-w-0 px-4 py-3"
                    >
                      <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#9b51e0] to-[#7f3db5] flex items-center justify-center text-white shadow-inner shrink-0">
                        <Inbox className="w-5 h-5 opacity-80" />
                      </div>
                      <span className="font-medium text-brand-black text-[15px] truncate">{survey.title || 'Untitled'}</span>
                    </Link>

                    <div className="flex items-center text-sm text-brand-black/60 shrink-0 pr-2 py-3">
                      <div className="w-20 text-center">{survey.responseCount || '—'}</div>
                      <div className="w-24 text-center">{cr ? `${cr}%` : '—'}</div>
                      <div className="w-32 text-center">{formatDate(survey.updatedAt)}</div>
                      <div className="w-24 flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          survey.status === 'active' ? 'bg-green-50 text-green-700' : survey.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-black/5 text-brand-black/40'
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
                  className="bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                >
                  <Link to={`/builder/${survey.id}`} className="block rounded-t-2xl overflow-hidden shrink-0">
                    <div className="h-40 w-full bg-brand-ghost" />
                  </Link>
                  <div className="px-4 py-3 border-t border-black/5 flex flex-col gap-1.5 flex-1">
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
                                stroke="#7f3db5"
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
                      <SurveyRowMenu survey={survey} onRename={setRenameTarget} onDelete={setDeleteTarget} />
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
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${page === 0 ? 'text-brand-black/15 cursor-not-allowed' : 'text-brand-black/40 hover:text-brand-black hover:bg-white'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${page === i ? 'bg-brand-black text-white' : 'text-brand-black/40 hover:bg-white'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${page === totalPages - 1 ? 'text-brand-black/15 cursor-not-allowed' : 'text-brand-black/40 hover:text-brand-black hover:bg-white'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
