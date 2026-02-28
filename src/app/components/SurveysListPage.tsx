import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { CustomDropdown } from './CustomDropdown';
import {
  Search, Plus, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, Loader2,
  Copy, Trash2, ChevronLeft, ChevronRight, Edit3, Link2, ToggleRight, Pencil,
  FileText,
} from 'lucide-react';
import { useSurveys, useDeleteSurvey, useDuplicateSurvey } from '../../hooks/useSurveys';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SurveyRowSkeleton } from '../../components/Skeleton';
import { updateSurvey } from '../../lib/firestore';
import type { SurveyClient } from '../../types/survey';

interface SurveysListPageProps {
  onNavigate: (page: string) => void;
}

type SortDirection = 'asc' | 'desc' | null;
type SortColumn = 'name' | 'updatedAt' | 'createdAt' | null;

export function SurveysListPage({ onNavigate }: SurveysListPageProps) {
  usePageTitle('Surveys');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortColumn, setSortColumn] = useState<SortColumn>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [menuDirection, setMenuDirection] = useState<'down' | 'up'>('down');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { data: surveys = [], isLoading, refetch } = useSurveys();
  const deleteSurveyMut = useDeleteSurvey();
  const duplicateSurveyMut = useDuplicateSurvey();

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenuId]);

  // --- Navigate to Templates page for new survey ---
  const handleNewSurvey = () => {
    onNavigate('templates-browse');
  };

  // --- Rename ---
  const handleStartRename = (survey: SurveyClient) => {
    setRenamingId(survey.id);
    setRenameValue(survey.title);
    setOpenMenuId(null);
  };

  const handleFinishRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await updateSurvey(renamingId, { title: renameValue.trim() });
      refetch();
    } catch {
      // silently fail
    }
    setRenamingId(null);
  };

  // --- Copy Link ---
  const handleCopyLink = (surveyId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/s/${surveyId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(surveyId);
    setTimeout(() => setCopiedId(null), 2000);
    setOpenMenuId(null);
  };

  // --- Change Status ---
  const handleToggleStatus = async (survey: SurveyClient) => {
    const newStatus = survey.status === 'active' ? 'closed' : 'active';
    try {
      await updateSurvey(survey.id, { status: newStatus });
      refetch();
    } catch {
      // silently fail
    }
    setOpenMenuId(null);
  };

  // --- Filtering ---
  const filtered = surveys.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' ||
      s.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // --- Sorting ---
  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;
    let cmp = 0;
    if (sortColumn === 'name') {
      cmp = a.title.localeCompare(b.title);
    } else if (sortColumn === 'updatedAt') {
      cmp = a.updatedAt.getTime() - b.updatedAt.getTime();
    } else if (sortColumn === 'createdAt') {
      cmp = a.createdAt.getTime() - b.createdAt.getTime();
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * perPage, safePage * perPage);

  // Reset to page 1 when filters change
  const handleSearchChange = (v: string) => { setSearchTerm(v); setCurrentPage(1); };
  const handleStatusChange = (v: string) => { setStatusFilter(v); setCurrentPage(1); };
  const handlePerPageChange = (v: string) => { setPerPage(Number(v)); setCurrentPage(1); };

  // --- Sort handlers ---
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    if (sortDirection === 'asc') return <ArrowUp className="w-3.5 h-3.5 text-foreground" />;
    return <ArrowDown className="w-3.5 h-3.5 text-foreground" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'closed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const timeAgo = (d: Date) => {
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(d);
  };

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // --- Empty state (no surveys at all) ---
  if (surveys.length === 0) {
    return (
      <div className="p-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-[28px] font-bold text-foreground mb-2">My Surveys</h1>
            <p className="text-gray-500">Manage and track all your surveys</p>
          </div>
          <Button variant="primary" className="gap-2" onClick={handleNewSurvey}>
            <Plus className="w-4 h-4" />
            New Survey
          </Button>
        </div>
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No surveys yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm">Create your first survey to start collecting feedback from your audience.</p>
          <Button variant="primary" className="gap-2" onClick={handleNewSurvey}>
            <Plus className="w-4 h-4" />
            Create Your First Survey
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-[28px] font-bold text-foreground mb-2">My Surveys</h1>
          <p className="text-gray-500">Manage and track all your surveys</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={handleNewSurvey}>
          <Plus className="w-4 h-4" />
          New Survey
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex gap-3 items-center">
          {/* Search — takes majority of width */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search surveys..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          {/* Status dropdown — compact, fixed width */}
          <div className="flex-shrink-0 w-[120px]">
            <CustomDropdown
              value={statusFilter}
              onChange={handleStatusChange}
              options={['All', 'Active', 'Draft', 'Closed']}
            />
          </div>
          {/* Per-page dropdown — compact, fixed width */}
          <div className="flex-shrink-0 w-[80px]">
            <CustomDropdown
              value={String(perPage)}
              onChange={handlePerPageChange}
              options={['10', '25', '50']}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 font-semibold text-sm text-gray-700 hover:text-foreground transition-colors">
                    Name {getSortIcon('name')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="font-semibold text-sm text-gray-700">Status</span>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="font-semibold text-sm text-gray-700">Responses</span>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => handleSort('updatedAt')} className="flex items-center gap-1.5 font-semibold text-sm text-gray-700 hover:text-foreground transition-colors">
                    Last Modified {getSortIcon('updatedAt')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1.5 font-semibold text-sm text-gray-700 hover:text-foreground transition-colors">
                    Created {getSortIcon('createdAt')}
                  </button>
                </th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Search className="w-8 h-8 text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium mb-1">No surveys found</p>
                      <p className="text-gray-400 text-sm">
                        {searchTerm
                          ? `No surveys matching "${searchTerm}"`
                          : `No ${statusFilter.toLowerCase()} surveys`}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {paginated.map((survey) => (
                <tr
                  key={survey.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (renamingId === survey.id) return;
                    navigate(`/app/surveys/${survey.id}/edit`);
                  }}
                >
                  <td className="px-4 py-4">
                    {renamingId === survey.id ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleFinishRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-foreground w-full max-w-xs px-2 py-1 border border-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <>
                        <div className="font-medium text-foreground truncate max-w-xs">{survey.title}</div>
                        {survey.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{survey.description}</div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={`${getStatusColor(survey.status)} text-xs px-2.5 py-1 capitalize`}>
                      {survey.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-gray-700">{survey.responseCount}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-gray-600">{timeAgo(survey.updatedAt)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-gray-600">{formatDate(survey.createdAt)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="relative">
                      <button
                        ref={(el) => { menuButtonRefs.current[survey.id] = el; }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openMenuId === survey.id) {
                            setOpenMenuId(null);
                          } else {
                            // Measure available space below the button
                            const btn = menuButtonRefs.current[survey.id];
                            if (btn) {
                              const rect = btn.getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              setMenuDirection(spaceBelow < 280 ? 'up' : 'down');
                            }
                            setOpenMenuId(survey.id);
                          }
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>

                      {openMenuId === survey.id && (
                        <div
                          className={`absolute right-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 ${menuDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Edit */}
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate(`/app/surveys/${survey.id}/edit`);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit3 className="w-4 h-4" /> Edit
                          </button>

                          {/* Copy Link — only if published */}
                          {survey.status !== 'draft' && (
                            <button
                              onClick={() => handleCopyLink(survey.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Link2 className="w-4 h-4" />
                              {copiedId === survey.id ? 'Copied!' : 'Copy Link'}
                            </button>
                          )}

                          {/* Rename */}
                          <button
                            onClick={() => handleStartRename(survey)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="w-4 h-4" /> Rename
                          </button>

                          {/* Change Status — only if already published */}
                          {survey.status !== 'draft' && (
                            <button
                              onClick={() => handleToggleStatus(survey)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <ToggleRight className="w-4 h-4" />
                              {survey.status === 'active' ? 'Close Survey' : 'Reopen Survey'}
                            </button>
                          )}

                          <div className="border-t border-gray-100 my-1" />

                          {/* Duplicate */}
                          <button
                            onClick={() => {
                              duplicateSurveyMut.mutate(survey.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Copy className="w-4 h-4" /> Duplicate
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              setDeleteTarget(survey.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sorted.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {((safePage - 1) * perPage) + 1}–{Math.min(safePage * perPage, sorted.length)} of {sorted.length} survey{sorted.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 min-w-[80px] text-center">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Survey"
        description="Are you sure you want to delete this survey? This action cannot be undone and all associated responses will be lost."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) deleteSurveyMut.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
