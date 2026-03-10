import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { CustomDropdown } from './CustomDropdown';
import {
  ArrowLeft, Save, GripVertical, Star, Type, AlignLeft, ListOrdered, CheckSquare, Trash2,
  Edit3, Send, BarChart3, Palette, GitBranch, Settings, Sparkles, User, Plug, Loader2, Plus,
  ChevronDown, Calendar, Clock, Grid3X3, BarChart2, Image as ImageIcon, X, Copy, Asterisk,
  Eye, RefreshCw, Check, GripHorizontal, LayoutGrid,
} from 'lucide-react';
import { Badge } from './Badge';
import { useSurvey, useUpdateSurvey, useCreateSurvey } from '../../hooks/useSurveys';
import type { Question, QuestionType, SurveySettings, LogicRule, LogicOperator } from '../../types/survey';
import { DEFAULT_SURVEY_SETTINGS } from '../../types/survey';

interface BuilderPageProps {
  onNavigate: (page: string) => void;
  surveyId?: string;
}

function qid() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}



// ── Question type definitions ──────────────
const questionTypeGroups = [
  {
    label: 'Text',
    types: [
      { id: 'short' as QuestionType, icon: Type, label: 'Short Answer' },
      { id: 'long' as QuestionType, icon: AlignLeft, label: 'Paragraph' },
    ],
  },
  {
    label: 'Choice',
    types: [
      { id: 'multiple' as QuestionType, icon: ListOrdered, label: 'Multiple Choice' },
      { id: 'checkbox' as QuestionType, icon: CheckSquare, label: 'Checkboxes' },
      { id: 'dropdown' as QuestionType, icon: ChevronDown, label: 'Dropdown' },
    ],
  },
  {
    label: 'Scale',
    types: [
      { id: 'rating' as QuestionType, icon: BarChart2, label: 'Linear Scale' },
    ],
  },
  {
    label: 'Grid',
    types: [
      { id: 'grid_multiple' as QuestionType, icon: Grid3X3, label: 'MC Grid' },
      { id: 'grid_checkbox' as QuestionType, icon: LayoutGrid, label: 'Checkbox Grid' },
    ],
  },
  {
    label: 'Date & Time',
    types: [
      { id: 'date' as QuestionType, icon: Calendar, label: 'Date' },
      { id: 'time' as QuestionType, icon: Clock, label: 'Time' },
    ],
  },
];

const allQuestionTypes = questionTypeGroups.flatMap((g) => g.types);

export function SurveyBuilderPageNew({ onNavigate, surveyId }: BuilderPageProps) {
  const navigate = useNavigate();
  const { data: survey, isLoading: surveyLoading } = useSurvey(surveyId);
  const updateSurvey = useUpdateSurvey();
  const createSurvey = useCreateSurvey();

  // ── Local state ─────────────────────────
  const [surveyTitle, setSurveyTitle] = useState('Untitled Survey');
  const [surveyDescription, setSurveyDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [surveySettings, setSurveySettings] = useState<SurveySettings>(DEFAULT_SURVEY_SETTINGS);
  const [currentStep, setCurrentStep] = useState(1);
  const [leftTab, setLeftTab] = useState<'build' | 'style' | 'logic' | 'settings'>('build');
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [selectedId, setSelectedId] = useState<string>('header');
  const [showConfirmationInput, setShowConfirmationInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [imageError, setImageError] = useState('');
  const [saveIconState, setSaveIconState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [addQuestionOpen, setAddQuestionOpen] = useState(false);
  const [titleOverflow, setTitleOverflow] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });
  const titleWrapRef = useRef<HTMLDivElement>(null);

  // AI chat state
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'ai', text: 'Hi! I\'m your AI assistant. How can I help you build your survey today?' },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Refs for scroll-to-center
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const headerImageInputRef = useRef<HTMLInputElement>(null);

  // Load survey data once fetched
  useEffect(() => {
    if (survey && !initialised) {
      setSurveyTitle(survey.title);
      setSurveyDescription(survey.description);
      setQuestions(survey.questions);
      setHeaderImageUrl(survey.headerImageUrl ?? '');
      setSurveySettings(survey.settings ?? DEFAULT_SURVEY_SETTINGS);
      if (survey.settings?.confirmationMessage) setShowConfirmationInput(true);
      setInitialised(true);
    }
  }, [survey, initialised]);

  useEffect(() => {
    if (!surveyId) setInitialised(true);
  }, [surveyId]);

  // ── Scroll to selected ──────────────────
  useEffect(() => {
    const el = cardRefs.current[selectedId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedId]);

  // ── Auto-save with debounce ─────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    if (!surveyId || !initialised) return;
    setIsSaving(true);
    setSaveIconState('saving');
    try {
      await updateSurvey.mutateAsync({
        id: surveyId,
        data: {
          title: surveyTitle,
          description: surveyDescription,
          questions: JSON.parse(JSON.stringify(questions)),
          headerImageUrl,
          settings: surveySettings,
        },
      });
      setHasUnsavedChanges(false);
      setSaveIconState('saved');
      setTimeout(() => setSaveIconState('idle'), 2000);
    } catch (_e) {
      toast.error('Failed to save survey. Please try again.');
      setSaveIconState('idle');
    } finally {
      setIsSaving(false);
    }
  }, [surveyId, surveyTitle, surveyDescription, questions, headerImageUrl, surveySettings, initialised, updateSurvey]);

  useEffect(() => {
    if (!initialised || !surveyId) return;
    setHasUnsavedChanges(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { save(); }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [surveyTitle, surveyDescription, questions, headerImageUrl, surveySettings]);

  // Warn on tab/window close when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // ── Load Google Font ─────────────────────
  useEffect(() => {
    if (!surveySettings.fontFamily || surveySettings.fontFamily === 'Inter') return;
    const fontUrl = `https://fonts.googleapis.com/css2?family=${surveySettings.fontFamily.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
    const existing = document.querySelector('link[data-builder-font]') as HTMLLinkElement;
    if (existing) {
      if (existing.href !== fontUrl) existing.href = fontUrl;
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontUrl;
      link.setAttribute('data-builder-font', 'true');
      document.head.appendChild(link);
    }
  }, [surveySettings.fontFamily]);

  // ── Question manipulation helpers ───────
  const addQuestion = (type: QuestionType) => {
    const base: Question = { id: qid(), type, text: '', required: false };
    if (type === 'rating') {
      base.options = { scale: 5 };
    } else if (type === 'multiple' || type === 'checkbox' || type === 'dropdown') {
      base.options = { choices: ['Option 1', 'Option 2', 'Option 3'] };
    } else if (type === 'grid_multiple' || type === 'grid_checkbox') {
      base.options = {
        rows: ['Row 1', 'Row 2', 'Row 3'],
        columns: ['Column 1', 'Column 2', 'Column 3'],
      };
    }
    setQuestions((prev) => {
      // Insert after the selected question, or append if header is selected
      if (selectedId === 'header' || !prev.some((q) => q.id === selectedId)) {
        return [...prev, base];
      }
      const idx = prev.findIndex((q) => q.id === selectedId);
      const copy = [...prev];
      copy.splice(idx + 1, 0, base);
      return copy;
    });
    setTimeout(() => setSelectedId(base.id), 50);
  };

  const duplicateQuestion = (question: Question) => {
    const dup: Question = { ...question, id: qid(), text: question.text, options: question.options ? { ...question.options } : undefined };
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === question.id);
      const copy = [...prev];
      copy.splice(idx + 1, 0, dup);
      return copy;
    });
    setTimeout(() => setSelectedId(dup.id), 50);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setSelectedId('header');
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateQuestionOption = (id: string, optUpdates: Record<string, unknown>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, options: { ...q.options, ...optUpdates } } : q))
    );
  };

  const updateChoice = (questionId: string, choiceIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId || !q.options?.choices) return q;
        const newChoices = [...q.options.choices];
        newChoices[choiceIndex] = value;
        return { ...q, options: { ...q.options, choices: newChoices } };
      })
    );
  };

  const addChoice = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const choices = q.options?.choices ?? [];
        return { ...q, options: { ...q.options, choices: [...choices, `Option ${choices.length + 1}`] } };
      })
    );
  };

  const removeChoice = (questionId: string, choiceIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId || !q.options?.choices) return q;
        return { ...q, options: { ...q.options, choices: q.options.choices.filter((_, i) => i !== choiceIndex) } };
      })
    );
  };

  // Grid row/column helpers
  const updateGridItem = (questionId: string, field: 'rows' | 'columns', index: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId || !q.options?.[field]) return q;
        const items = [...q.options[field]!];
        items[index] = value;
        return { ...q, options: { ...q.options, [field]: items } };
      })
    );
  };

  const addGridItem = (questionId: string, field: 'rows' | 'columns') => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const items = q.options?.[field] ?? [];
        const label = field === 'rows' ? 'Row' : 'Column';
        return { ...q, options: { ...q.options, [field]: [...items, `${label} ${items.length + 1}`] } };
      })
    );
  };

  const removeGridItem = (questionId: string, field: 'rows' | 'columns', index: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId || !q.options?.[field]) return q;
        return { ...q, options: { ...q.options, [field]: q.options[field]!.filter((_, i) => i !== index) } };
      })
    );
  };



  // ── Save new survey ─────────────────────
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      if (surveyId) {
        await save();
      } else {
        const newId = await createSurvey.mutateAsync({
          title: surveyTitle,
          description: surveyDescription,
          questions,
          headerImageUrl,
          settings: surveySettings,
        });
        navigate(`/app/surveys/${newId}/edit`, { replace: true });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Chat handler (placeholder AI) ───────
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      setChatMessages([...chatMessages, { id: Date.now(), sender: 'user', text: chatInput }]);
      setChatInput('');
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: Date.now(), sender: 'ai',
          text: 'I can help you with that! Let me add that to your survey.'
        }]);
      }, 1000);
    }
  };

  // ── Settings updater ────────────────────
  const updateSettings = (updates: Partial<SurveySettings>) => {
    setSurveySettings((prev) => ({ ...prev, ...updates }));
  };

  const steps = [
    { id: 1, label: 'Edit', icon: Edit3 },
    { id: 2, label: 'Publish', icon: Send },
    { id: 3, label: 'Connect Apps', icon: Plug },
    { id: 4, label: 'Analytics', icon: BarChart3 },
  ];

  const getQuestionTypeLabel = (type: string) => {
    const t = allQuestionTypes.find((qt) => qt.id === type);
    return t?.label ?? type;
  };

  // ── Loading state ───────────────────────
  if (surveyId && surveyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="bg-card border-b border-border px-6 py-3 fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center justify-between max-w-full mx-auto relative">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => onNavigate('surveys')} className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div
              ref={titleWrapRef}
              className="relative min-w-0"
              onScroll={(e) => {
                const el = e.currentTarget.firstElementChild as HTMLElement;
                if (!el) return;
                const sl = el.scrollLeft;
                const sr = el.scrollWidth - el.clientWidth - sl;
                setTitleOverflow({ left: sl > 2, right: sr > 2 });
              }}
            >
              {titleOverflow.left && (
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.95), transparent)' }} />
              )}
              <div
                className="overflow-x-auto scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const sl = el.scrollLeft;
                  const sr = el.scrollWidth - el.clientWidth - sl;
                  setTitleOverflow({ left: sl > 2, right: sr > 2 });
                }}
              >
                <input
                  type="text" value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 whitespace-nowrap min-w-[120px] w-auto"
                  style={{ width: `${Math.max(120, surveyTitle.length * 10 + 20)}px`, maxWidth: '300px' }}
                />
              </div>
              {titleOverflow.right && (
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10" style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.95), transparent)' }} />
              )}
            </div>
          </div>

          {/* Center: breadcrumb stepper — truly centered */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => {
                      if (step.id !== currentStep && surveyId) {
                        if (step.id === 2) onNavigate(`surveys/${surveyId}/publish`);
                        else if (step.id === 3) onNavigate(`surveys/${surveyId}/connect`);
                        else if (step.id === 4) onNavigate(`surveys/${surveyId}/results`);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isActive ? 'bg-primary text-foreground shadow-sm' : isCompleted ? 'bg-secondary text-foreground' : 'bg-card text-muted-foreground border border-border'}`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${isActive ? 'bg-white/30' : isCompleted ? 'bg-white/50' : 'bg-muted'}`}>
                      <StepIcon className="w-3 h-3" />
                    </div>
                    <span className="hidden lg:inline">{step.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-secondary' : 'bg-border'}`}></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Save status icon */}
            <TooltipBelow text={saveIconState === 'saving' ? 'Saving...' : saveIconState === 'saved' ? 'Saved' : 'Auto-save'}>
              <div className="p-2 rounded-lg text-muted-foreground">
                {saveIconState === 'saving' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : saveIconState === 'saved' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </div>
            </TooltipBelow>
            {/* Preview/Edit toggle */}
            <TooltipBelow text={viewMode === 'editor' ? 'Preview' : 'Back to editor'}>
              <button
                onClick={() => setViewMode(viewMode === 'editor' ? 'preview' : 'editor')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {viewMode === 'editor' ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              </button>
            </TooltipBelow>
            <Button variant="primary" size="sm" className="gap-2" onClick={() => surveyId ? onNavigate(`surveys/${surveyId}/publish`) : handleSaveDraft()}>
              Continue to Publish
            </Button>
          </div>
        </div>
      </div>

      <div
        className="pt-16 pb-8 max-w-full px-8"
        style={{
          '--primary': surveySettings.accentColor,
          '--ring': surveySettings.accentColor,
          fontFamily: `'${surveySettings.fontFamily}', sans-serif`,
          backgroundColor: surveySettings.background.startsWith('#') && surveySettings.background !== '#FFFFFF' ? surveySettings.background : undefined,
        } as React.CSSProperties}
      >

        {viewMode === 'editor' ? (
          <div className="flex gap-6">
            {/* Left Panel */}
            <div className="w-72 flex-shrink-0">
              <Card className="sticky top-24">
                <div className="border-b border-border flex">
                  {(['build', 'logic', 'settings'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setLeftTab(tab)}
                      className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${leftTab === tab ? 'border-primary text-foreground bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="p-4 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {/* ── BUILD TAB (add question dropdown + style) ── */}
                  {leftTab === 'build' && (
                    <div className="space-y-6">
                      {/* Add question dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setAddQuestionOpen(!addQuestionOpen)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-primary/10 hover:bg-primary/15 border border-primary/30 rounded-lg text-sm font-medium text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Add Question
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${addQuestionOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {addQuestionOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-30 py-1 max-h-72 overflow-y-auto">
                            {questionTypeGroups.map((group) => (
                              <div key={group.label}>
                                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</div>
                                {group.types.map((type) => {
                                  const Icon = type.icon;
                                  return (
                                    <button
                                      key={type.id}
                                      onClick={() => { addQuestion(type.id); setAddQuestionOpen(false); }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors"
                                    >
                                      <Icon className="w-4 h-4 text-muted-foreground" />
                                      {type.label}
                                    </button>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Style controls */}
                      <div className="space-y-4 pt-2 border-t border-border">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Font Family</label>
                          <CustomDropdown
                            value={surveySettings.fontFamily}
                            onChange={(v) => updateSettings({ fontFamily: v })}
                            options={['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat']}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Accent Color</label>
                          <div className="flex gap-2 flex-wrap">
                            {['#E2F380', '#058ED9', '#E08E45', '#DA627D'].map((color) => (
                              <button
                                key={color}
                                onClick={() => updateSettings({ accentColor: color })}
                                className={`w-9 h-9 rounded-lg border-2 transition-all ${surveySettings.accentColor === color ? 'border-gray-800 scale-110' : 'border-gray-200'}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                            <label className={`w-9 h-9 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden ${!['#E2F380', '#C5EDCE', '#3B82F6', '#A855F7', '#F43F5E'].includes(surveySettings.accentColor) ? 'border-gray-800 scale-110' : 'border-gray-200'}`}
                              style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                            >
                              <input
                                type="color"
                                value={surveySettings.accentColor}
                                onChange={(e) => updateSettings({ accentColor: e.target.value })}
                                className="opacity-0 absolute w-0 h-0"
                              />
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Background</label>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: '#FFFFFF', label: 'White' },
                              { value: '#F9FAFB', label: 'Light Gray' },
                              { value: '#FEF3C7', label: 'Warm' },
                              { value: '#EDE9FE', label: 'Lavender' },
                            ].map((bg) => (
                              <button
                                key={bg.value}
                                onClick={() => updateSettings({ background: bg.value })}
                                className={`w-9 h-9 rounded-lg border-2 transition-all ${surveySettings.background === bg.value ? 'border-gray-800 scale-110' : 'border-gray-200'}`}
                                style={{ backgroundColor: bg.value }}
                                title={bg.label}
                              />
                            ))}
                            <label className={`w-9 h-9 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden ${!['#FFFFFF', '#F9FAFB', '#F3F4F6', '#FEF3C7', '#EDE9FE'].includes(surveySettings.background) ? 'border-gray-800 scale-110' : 'border-gray-200'}`}
                              style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                            >
                              <input
                                type="color"
                                value={surveySettings.background.startsWith('#') ? surveySettings.background : '#FFFFFF'}
                                onChange={(e) => updateSettings({ background: e.target.value })}
                                className="opacity-0 absolute w-0 h-0"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── LOGIC TAB ── */}
                  {leftTab === 'logic' && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground mb-3">Survey Logic</h3>
                      <ToggleSetting
                        label="Shuffle question order"
                        description="Randomize for each respondent"
                        checked={surveySettings.shuffleQuestions}
                        onChange={(v) => updateSettings({ shuffleQuestions: v })}
                      />
                      <div className="pt-4 border-t border-border">
                        <div className="font-medium text-foreground text-sm mb-2">Conditional Logic</div>
                        {selectedId === 'header' ? (
                          <p className="text-xs text-muted-foreground">Select a question to add conditional logic.</p>
                        ) : (() => {
                          const selectedQuestion = questions.find((q) => q.id === selectedId);
                          if (!selectedQuestion) return <p className="text-xs text-muted-foreground">Select a question to add conditional logic.</p>;
                          const qIndex = questions.findIndex((q) => q.id === selectedId);
                          const precedingQuestions = questions.slice(0, qIndex);
                          if (precedingQuestions.length === 0) return <p className="text-xs text-muted-foreground">This is the first question — no conditions can be set.</p>;

                          const logic: LogicRule = selectedQuestion.logic ?? { action: 'show', conjunction: 'and', conditions: [] };

                          const setLogic = (updated: LogicRule) => {
                            updateQuestion(selectedId, { logic: updated.conditions.length > 0 ? updated : undefined });
                          };

                          const addCondition = () => {
                            setLogic({
                              ...logic,
                              conditions: [...logic.conditions, { questionId: precedingQuestions[0].id, operator: 'equals' as LogicOperator, value: '' }],
                            });
                          };

                          const removeCondition = (idx: number) => {
                            const next = { ...logic, conditions: logic.conditions.filter((_, i) => i !== idx) };
                            setLogic(next);
                          };

                          const updateCondition = (idx: number, updates: Record<string, unknown>) => {
                            const next = { ...logic, conditions: logic.conditions.map((c, i) => (i === idx ? { ...c, ...updates } : c)) };
                            setLogic(next);
                          };

                          const getChoicesForQuestion = (qid: string) => {
                            const q = questions.find((x) => x.id === qid);
                            if (!q) return null;
                            if (['multiple', 'checkbox', 'dropdown'].includes(q.type) && q.options?.choices) return q.options.choices;
                            if (q.type === 'rating') return Array.from({ length: q.options?.scale ?? 5 }, (_, i) => String(i + 1));
                            return null;
                          };

                          return (
                            <div className="space-y-3">
                              <p className="text-xs text-muted-foreground">
                                Q{qIndex + 1}: {selectedQuestion.text || '(untitled)'}
                              </p>

                              {/* Action toggle */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setLogic({ ...logic, action: 'show' })}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${logic.action === 'show' ? 'bg-primary text-foreground' : 'bg-muted text-muted-foreground'}`}
                                >
                                  Show when
                                </button>
                                <button
                                  onClick={() => setLogic({ ...logic, action: 'hide' })}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${logic.action === 'hide' ? 'bg-primary text-foreground' : 'bg-muted text-muted-foreground'}`}
                                >
                                  Hide when
                                </button>
                              </div>

                              {/* Conjunction toggle */}
                              {logic.conditions.length > 1 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Match:</span>
                                  <button
                                    onClick={() => setLogic({ ...logic, conjunction: 'and' })}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${logic.conjunction === 'and' ? 'bg-secondary text-foreground' : 'bg-muted text-muted-foreground'}`}
                                  >
                                    All (AND)
                                  </button>
                                  <button
                                    onClick={() => setLogic({ ...logic, conjunction: 'or' })}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${logic.conjunction === 'or' ? 'bg-secondary text-foreground' : 'bg-muted text-muted-foreground'}`}
                                  >
                                    Any (OR)
                                  </button>
                                </div>
                              )}

                              {/* Conditions */}
                              {logic.conditions.map((cond, ci) => {
                                const choices = getChoicesForQuestion(cond.questionId);
                                const needsValue = !['is_answered', 'is_not_answered'].includes(cond.operator);
                                return (
                                  <div key={ci} className="p-3 bg-muted/50 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-medium text-muted-foreground uppercase">Condition {ci + 1}</span>
                                      <button onClick={() => removeCondition(ci)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    {/* Question selector */}
                                    <select
                                      value={cond.questionId}
                                      onChange={(e) => updateCondition(ci, { questionId: e.target.value, value: '' })}
                                      className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                      {precedingQuestions.map((pq, pi) => (
                                        <option key={pq.id} value={pq.id}>Q{pi + 1}: {pq.text || '(untitled)'}</option>
                                      ))}
                                    </select>
                                    {/* Operator selector */}
                                    <select
                                      value={cond.operator}
                                      onChange={(e) => updateCondition(ci, { operator: e.target.value })}
                                      className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                      <option value="equals">Equals</option>
                                      <option value="not_equals">Does not equal</option>
                                      <option value="contains">Contains</option>
                                      <option value="not_contains">Does not contain</option>
                                      <option value="is_answered">Is answered</option>
                                      <option value="is_not_answered">Is not answered</option>
                                    </select>
                                    {/* Value input */}
                                    {needsValue && (
                                      choices ? (
                                        <select
                                          value={(cond.value as string) ?? ''}
                                          onChange={(e) => updateCondition(ci, { value: e.target.value })}
                                          className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                          <option value="">Select a value...</option>
                                          {choices.map((ch, chi) => (
                                            <option key={chi} value={ch}>{ch}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type="text"
                                          value={(cond.value as string) ?? ''}
                                          onChange={(e) => updateCondition(ci, { value: e.target.value })}
                                          placeholder="Value..."
                                          className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                      )
                                    )}
                                  </div>
                                );
                              })}

                              {/* Add condition button */}
                              <button
                                onClick={addCondition}
                                className="w-full px-4 py-2.5 border-2 border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                              >
                                + Add Condition
                              </button>

                              {/* Clear all */}
                              {logic.conditions.length > 0 && (
                                <button
                                  onClick={() => updateQuestion(selectedId, { logic: undefined })}
                                  className="text-xs text-red-500 hover:text-red-600 transition-colors"
                                >
                                  Remove all conditions
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* ── SETTINGS TAB ── */}
                  {leftTab === 'settings' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Responses</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Collect email address?</label>
                            <CustomDropdown value={surveySettings.collectEmail} onChange={(v) => updateSettings({ collectEmail: v })} options={['none', 'required', 'optional']} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Send copy to responder</label>
                            <CustomDropdown value={surveySettings.sendCopy} onChange={(v) => updateSettings({ sendCopy: v })} options={['off', 'always', 'whenRequested']} />
                          </div>
                          <ToggleSetting label="Allow response editing" description="Let respondents edit after submit" checked={surveySettings.allowEditing} onChange={(v) => updateSettings({ allowEditing: v })} />
                          <ToggleSetting label="Limit to 1 response" description="One response per person" checked={surveySettings.limitOneResponse} onChange={(v) => updateSettings({ limitOneResponse: v })} />
                        </div>
                      </div>
                      <div className="pt-4 border-t border-border">
                        <h3 className="font-semibold text-foreground mb-3">Presentation</h3>
                        <div className="space-y-4">
                          <ToggleSetting label="Show progress bar" description="Display completion progress" checked={surveySettings.showProgressBar} onChange={(v) => updateSettings({ showProgressBar: v })} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Center Panel — Survey Canvas */}
            <div className="flex-1 max-w-3xl mx-auto pt-8">
              {/* Header Card */}
              <Card
                ref={(el) => { cardRefs.current['header'] = el; }}
                className={`p-8 mb-6 cursor-pointer transition-all ${selectedId === 'header' ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                onClick={() => setSelectedId('header')}
              >
                <Input label="Survey Title" value={surveyTitle} onChange={(e) => setSurveyTitle(e.target.value)} className="text-xl font-semibold mb-4" />
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                  <textarea
                    placeholder="Add a brief description of your survey..."
                    value={surveyDescription}
                    onChange={(e) => setSurveyDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                  />
                </div>
              </Card>

              {/* Questions */}
              <div className="space-y-4">
                {questions.map((question, qIdx) => {
                  const TypeIcon = allQuestionTypes.find((t) => t.id === question.type)?.icon ?? Type;
                  return (
                    <Card
                      key={question.id}
                      ref={(el) => { cardRefs.current[question.id] = el; }}
                      className={`p-6 group transition-all cursor-pointer ${selectedId === question.id ? 'ring-2 ring-primary' : 'hover:shadow-md'} ${draggedId === question.id ? 'opacity-50' : ''}`}
                      onClick={() => setSelectedId(question.id)}
                      draggable
                      onDragStart={(e) => { setDraggedId(question.id); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => setDraggedId(null)}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (!draggedId || draggedId === question.id) return;
                        const fromIdx = questions.findIndex((q) => q.id === draggedId);
                        moveQuestion(fromIdx, qIdx);
                        setDraggedId(null);
                      }}
                    >
                      <div className="flex-1">
                        {/* Top toolbar row */}
                        <div className="flex items-center justify-between mb-4 relative">
                          <div className="flex items-center gap-2">
                            {/* Question number */}
                            <span className="text-sm font-semibold text-muted-foreground">{qIdx + 1}.</span>
                            {/* Type icon badge */}
                            <Tooltip text={getQuestionTypeLabel(question.type)}>
                              <span className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                                <TypeIcon className="w-4 h-4 text-muted-foreground" />
                              </span>
                            </Tooltip>
                            {/* Logic badge */}
                            {question.logic && question.logic.conditions.length > 0 && (
                              <Tooltip text={`${question.logic.action === 'show' ? 'Shown' : 'Hidden'} conditionally (${question.logic.conditions.length} rule${question.logic.conditions.length > 1 ? 's' : ''})`}>
                                <span className="flex items-center justify-center w-6 h-6 bg-blue-50 rounded">
                                  <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                                </span>
                              </Tooltip>
                            )}
                          </div>

                          {/* Drag handle — absolute center */}
                          <button className="absolute left-1/2 -translate-x-1/2 p-1 text-muted-foreground hover:text-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripHorizontal className="w-5 h-5" />
                          </button>

                          {/* Action buttons — always visible when selected, hover otherwise */}
                          <div className={`flex items-center gap-0.5 transition-opacity ${selectedId === question.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <Tooltip text={question.required ? 'Remove required' : 'Mark required'}>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateQuestion(question.id, { required: !question.required }); }}
                                className={`p-2 rounded-lg transition-all ${question.required ? 'text-red-500 bg-red-50 dark:bg-red-950/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                              >
                                <Asterisk className="w-4 h-4" style={question.required ? { fill: 'currentColor' } : undefined} />
                              </button>
                            </Tooltip>

                            <Tooltip text="Duplicate">
                              <button onClick={(e) => { e.stopPropagation(); duplicateQuestion(question); }} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                                <Copy className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            <Tooltip text="Delete">
                              <button onClick={(e) => { e.stopPropagation(); removeQuestion(question.id); }} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          </div>
                        </div>



                        <Input value={question.text} onChange={(e) => updateQuestion(question.id, { text: e.target.value })} className="font-medium mb-4" placeholder="Enter your question..." />

                        {/* ── Type-specific editors ── */}
                        <QuestionEditor question={question} updateQuestion={updateQuestion} updateQuestionOption={updateQuestionOption} updateChoice={updateChoice} addChoice={addChoice} removeChoice={removeChoice} updateGridItem={updateGridItem} addGridItem={addGridItem} removeGridItem={removeGridItem} />

                        {/* Char limit for text types */}
                        {(question.type === 'short' || question.type === 'long') && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400">Char limit:</span>
                            <input
                              type="number" min={0} max={10000}
                              value={question.options?.charLimit ?? ''}
                              onChange={(e) => updateQuestionOption(question.id, { charLimit: e.target.value ? Number(e.target.value) : undefined })}
                              placeholder="None"
                              className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}

                {/* Add Question Placeholder */}
                <Card className="p-12 border-2 border-dashed border-border bg-muted/50 text-center hover:border-primary hover:bg-card transition-all cursor-pointer">
                  <p className="text-muted-foreground">Click a question type on the left to add to your survey</p>
                </Card>
              </div>
            </div>

            {/* Right Panel — AI Chatbot */}
            <div className="w-72 flex-shrink-0">
              <Card className="sticky top-24 flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground">AI Assistant</h3>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {chatMessages.map((message) => (
                    <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                      {message.sender === 'ai' && (
                        <div className="w-7 h-7 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-foreground" />
                        </div>
                      )}
                      {message.sender === 'user' && (
                        <div className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <div className={`flex-1 px-3 py-2 rounded-lg text-sm ${message.sender === 'ai' ? 'bg-muted text-foreground' : 'bg-primary text-foreground'}`}>
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <input
                      type="text" value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask AI to help..."
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                    />
                    <button onClick={handleSendMessage} className="w-9 h-9 bg-primary hover:bg-primary/90 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                      <Send className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          /* ── Preview Mode ── */
          <PreviewMode
            surveyTitle={surveyTitle}
            surveyDescription={surveyDescription}
            questions={questions}
            headerImageUrl={headerImageUrl}
            getQuestionTypeLabel={getQuestionTypeLabel}
            settings={surveySettings}
          />
        )}
      </div>
    </div >
  );
}

// ── Question Editor (type-specific controls) ──
function QuestionEditor({
  question, updateQuestion, updateQuestionOption, updateChoice, addChoice, removeChoice,
  updateGridItem, addGridItem, removeGridItem,
}: {
  question: Question;
  updateQuestion: (id: string, u: Partial<Question>) => void;
  updateQuestionOption: (id: string, u: Record<string, unknown>) => void;
  updateChoice: (qid: string, i: number, v: string) => void;
  addChoice: (qid: string) => void;
  removeChoice: (qid: string, i: number) => void;
  updateGridItem: (qid: string, f: 'rows' | 'columns', i: number, v: string) => void;
  addGridItem: (qid: string, f: 'rows' | 'columns') => void;
  removeGridItem: (qid: string, f: 'rows' | 'columns', i: number) => void;
}) {
  switch (question.type) {
    case 'short':
      return (
        <div className="mb-4">
          <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center px-4 text-sm text-gray-400">
            Short answer text
          </div>
        </div>
      );

    case 'long':
      return (
        <div className="mb-4">
          <div className="w-full h-24 bg-gray-50 border border-gray-200 rounded-lg flex items-start p-4 text-sm text-gray-400">
            Long answer text
          </div>
        </div>
      );

    case 'multiple':
    case 'checkbox':
    case 'dropdown':
      return (
        <div className="space-y-2 mb-4">
          {question.options?.choices?.map((choice, i) => (
            <div key={i} className="flex items-center gap-3">
              {question.type === 'dropdown' ? (
                <span className="text-xs text-gray-400 w-4 text-center">{i + 1}.</span>
              ) : (
                <div className={`w-4 h-4 border-2 border-gray-300 ${question.type === 'checkbox' ? 'rounded' : 'rounded-full'}`}></div>
              )}
              <input
                value={choice}
                onChange={(e) => updateChoice(question.id, i, e.target.value)}
                className="flex-1 text-gray-600 bg-transparent border-none focus:outline-none focus:ring-0 text-sm"
              />
              {question.options!.choices!.length > 1 && (
                <button onClick={() => removeChoice(question.id, i)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => addChoice(question.id)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-foreground transition-colors pl-7">
            <Plus className="w-3 h-3" /> Add option
          </button>
        </div>
      );

    case 'rating': {
      const scale = question.options?.scale ?? 5;
      const lowLabel = question.options?.lowLabel ?? '';
      const highLabel = question.options?.highLabel ?? '';
      return (
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Scale:</span>
            <select
              value={scale}
              onChange={(e) => updateQuestionOption(question.id, { scale: Number(e.target.value) })}
              className="px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>1 – {n}</option>
              ))}
            </select>
          </div>
          {/* Styled slider */}
          <RatingSlider min={1} max={scale} defaultValue={Math.ceil(scale / 2)} onClick={(e: React.MouseEvent) => e.stopPropagation()} />
          {/* Low / High labels */}
          <div className="flex items-center gap-3">
            <input
              value={lowLabel}
              onChange={(e) => updateQuestionOption(question.id, { lowLabel: e.target.value })}
              placeholder="Low label (e.g. Poor)"
              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-gray-50"
              onClick={(e) => e.stopPropagation()}
            />
            <input
              value={highLabel}
              onChange={(e) => updateQuestionOption(question.id, { highLabel: e.target.value })}
              placeholder="High label (e.g. Excellent)"
              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-gray-50"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      );
    }

    case 'grid_multiple':
    case 'grid_checkbox': {
      const rows = question.options?.rows ?? [];
      const columns = question.options?.columns ?? [];
      return (
        <div className="mb-4">
          <div className="flex gap-6">
            {/* Rows */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rows</label>
              <div className="space-y-1.5">
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={row} onChange={(e) => updateGridItem(question.id, 'rows', i, e.target.value)} className="flex-1 text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-0" onClick={(e) => e.stopPropagation()} />
                    {rows.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); removeGridItem(question.id, 'rows', i); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                    )}
                  </div>
                ))}
                <button onClick={(e) => { e.stopPropagation(); addGridItem(question.id, 'rows'); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-foreground transition-colors">
                  <Plus className="w-3 h-3" /> Add row
                </button>
              </div>
            </div>
            {/* Columns */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Columns</label>
              <div className="space-y-1.5">
                {columns.map((col, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={col} onChange={(e) => updateGridItem(question.id, 'columns', i, e.target.value)} className="flex-1 text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-0" onClick={(e) => e.stopPropagation()} />
                    {columns.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); removeGridItem(question.id, 'columns', i); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                    )}
                  </div>
                ))}
                <button onClick={(e) => { e.stopPropagation(); addGridItem(question.id, 'columns'); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-foreground transition-colors">
                  <Plus className="w-3 h-3" /> Add column
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'date':
      return (
        <div className="mb-4">
          <div className="w-full max-w-xs h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center px-4 gap-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4" /> mm/dd/yyyy
          </div>
        </div>
      );

    case 'time':
      return (
        <div className="mb-4">
          <div className="w-full max-w-xs h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center px-4 gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" /> hh:mm AM/PM
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ── Preview Mode ──────────────────────────
function PreviewMode({
  surveyTitle, surveyDescription, questions, headerImageUrl, getQuestionTypeLabel, settings,
}: {
  surveyTitle: string;
  surveyDescription: string;
  questions: Question[];
  headerImageUrl: string;
  getQuestionTypeLabel: (t: string) => string;
  settings?: SurveySettings;
}) {
  const fontFamily = settings?.fontFamily ? `'${settings.fontFamily}', sans-serif` : undefined;
  const bgColor = settings?.background?.startsWith('#') && settings.background !== '#FFFFFF' ? settings.background : undefined;
  return (
    <div
      className="max-w-3xl mx-auto"
      style={{
        fontFamily,
        '--primary': settings?.accentColor,
        '--ring': settings?.accentColor,
      } as React.CSSProperties}
    >
      <Card className="p-8" style={{ backgroundColor: bgColor }}>
        {headerImageUrl && (
          <img src={headerImageUrl} alt="Header" className="w-full h-48 object-cover rounded-lg mb-6" />
        )}
        <h2 className="text-2xl font-bold text-foreground mb-3">{surveyTitle}</h2>
        <p className="text-gray-500 mb-8">{surveyDescription || 'Survey preview — this is how respondents will see your survey'}</p>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="pb-6 border-b border-gray-100 last:border-0">
              <div className="flex gap-2 mb-3">
                <span className="font-semibold text-foreground">{index + 1}.</span>
                <div className="flex-1">
                  {question.options?.imageUrl && (
                    <img src={question.options.imageUrl} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />
                  )}
                  <p className="font-semibold text-foreground mb-1">
                    {question.text || 'Untitled question'}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                </div>
              </div>

              {/* Type-specific preview */}
              <div className="pl-6">
                {question.type === 'short' && (
                  <input type="text" placeholder="Your answer..." className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                )}
                {question.type === 'long' && (
                  <textarea placeholder="Your answer..." rows={4} className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                )}
                {(question.type === 'multiple' || question.type === 'checkbox') && question.options?.choices && (
                  <div className="space-y-2">
                    {question.options.choices.map((choice, i) => (
                      <label key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                        <div className={`w-5 h-5 border-2 border-gray-300 ${question.type === 'checkbox' ? 'rounded' : 'rounded-full'}`}></div>
                        <span className="text-gray-700">{choice}</span>
                      </label>
                    ))}
                  </div>
                )}
                {question.type === 'dropdown' && question.options?.choices && (
                  <select className="w-full max-w-sm px-4 py-3 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Choose an option...</option>
                    {question.options.choices.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                )}
                {question.type === 'rating' && (
                  <RatingSlider
                    min={1}
                    max={question.options?.scale ?? 5}
                    defaultValue={Math.ceil((question.options?.scale ?? 5) / 2)}
                    lowLabel={question.options?.lowLabel}
                    highLabel={question.options?.highLabel}
                  />
                )}
                {(question.type === 'grid_multiple' || question.type === 'grid_checkbox') && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="p-2 text-left"></th>
                          {question.options?.columns?.map((col, i) => (
                            <th key={i} className="p-2 text-center text-gray-500 font-medium">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {question.options?.rows?.map((row, ri) => (
                          <tr key={ri} className="border-t border-gray-100">
                            <td className="p-2 text-gray-700 font-medium">{row}</td>
                            {question.options?.columns?.map((_, ci) => (
                              <td key={ci} className="p-2 text-center">
                                <div className={`w-5 h-5 mx-auto border-2 border-gray-300 ${question.type === 'grid_checkbox' ? 'rounded' : 'rounded-full'}`}></div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {question.type === 'date' && (
                  <input type="date" className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                )}
                {question.type === 'time' && (
                  <input type="time" className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                )}
              </div>
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No questions added yet. Use the Build tab to add questions.
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button variant="primary" size="lg">Submit Survey</Button>
        </div>
      </Card>
    </div>
  );
}

// ── Toggle Setting Component ──────────────
function ToggleSetting({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-foreground text-sm">{label}</div>
        <div className="text-xs text-gray-500 mt-1">{description}</div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>
  );
}

// ── Tooltip Component ─────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tooltip inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </div>
    </div>
  );
}

// ── Tooltip Below (for navbar items near top edge) ──
function TooltipBelow({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tooltip inline-flex">
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
        {text}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800" />
      </div>
    </div>
  );
}

// ── Rating Slider (styled thick track) ──────
function RatingSlider({
  min, max, defaultValue, value: controlledValue, onChange, lowLabel, highLabel, onClick,
}: {
  min: number; max: number; defaultValue?: number; value?: number; onChange?: (v: number) => void;
  lowLabel?: string; highLabel?: string; onClick?: (e: React.MouseEvent) => void;
}) {
  const [internalVal, setInternalVal] = useState(controlledValue ?? defaultValue ?? min);
  const val = controlledValue ?? internalVal;
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setInternalVal(v);
    onChange?.(v);
  };

  return (
    <div className="space-y-1" onClick={onClick}>
      {/* Current value */}
      <div className="text-center text-sm font-medium text-gray-400">{val}</div>
      {/* Track */}
      <div className="relative h-3 rounded-full bg-gray-200 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        <input
          type="range" min={min} max={max} step={1}
          value={val}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      {/* Labels */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{lowLabel || min}</span>
        <span>{highLabel || max}</span>
      </div>
    </div>
  );
}

