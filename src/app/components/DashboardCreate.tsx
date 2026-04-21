import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Sparkles,
  Send,
  FileText,
  Loader2,
  FileUp,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateSurvey } from '../../hooks/useSurveys';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuthContext } from '../../contexts/AuthContext';
import { canUseAI } from '../../lib/planLimits';
import { callGenerateQuestions, type GeneratedQuestion } from '../../lib/functions';
import {
  templateQuestions,
  templateMeta,
  templateCategories,
  type TemplateCategory,
} from '../../lib/surveyTemplates';
import type { Question, QuestionType } from '../../types/survey';

const CATEGORIES_WITH_ALL = ['All', ...templateCategories];

function mapAiType(type: GeneratedQuestion['type']): QuestionType {
  switch (type) {
    case 'multiple-choice':
    case 'yes-no':
      return 'multiple';
    case 'checkbox': return 'checkbox';
    case 'short-answer': return 'short';
    case 'long-answer': return 'long';
    case 'rating': return 'rating';
    default: return 'short';
  }
}

function aiToQuestion(g: GeneratedQuestion, idx: number): Question {
  const type = mapAiType(g.type);
  const q: Question = {
    id: `q${idx + 1}`,
    type,
    text: g.text,
    required: !!g.required,
  };
  if (g.type === 'yes-no' && !g.options?.length) {
    q.options = { choices: ['Yes', 'No'] };
  } else if ((type === 'multiple' || type === 'checkbox') && g.options?.length) {
    q.options = { choices: g.options };
  } else if (type === 'rating') {
    q.options = { scale: 5 };
  }
  return q;
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  const source = name?.trim() || email?.split('@')[0] || '';
  if (!source) return 'U';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function DashboardCreate() {
  const location = useLocation();
  const navigate = useNavigate();
  const templatesRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthContext();
  const createMut = useCreateSurvey();
  const { plan } = useSubscription();

  const [prompt, setPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [blankLoading, setBlankLoading] = useState(false);
  const [templateLoadingId, setTemplateLoadingId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('All');

  const visibleTemplates = useMemo(() => {
    return templateMeta
      .filter(t => category === 'All' || t.category === (category as TemplateCategory))
      .map(t => ({ ...t, ...templateQuestions[t.id] }));
  }, [category]);

  useEffect(() => {
    if (location.hash === '#templates' && templatesRef.current) {
      templatesRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.key, location.hash]);

  const handleBlank = async () => {
    if (blankLoading) return;
    setBlankLoading(true);
    try {
      const id = await createMut.mutateAsync({
        title: 'Untitled Survey',
        description: '',
        questions: [],
      });
      navigate(`/builder/${id}`);
    } catch {
      toast.error('Could not create survey');
    } finally {
      setBlankLoading(false);
    }
  };

  const handleTemplate = async (templateId: string) => {
    if (templateLoadingId) return;
    const tpl = templateQuestions[templateId];
    if (!tpl) return;
    setTemplateLoadingId(templateId);
    try {
      const id = await createMut.mutateAsync({
        title: tpl.title,
        description: tpl.description,
        questions: tpl.questions,
      });
      navigate(`/builder/${id}`);
    } catch {
      toast.error('Could not create survey from template');
    } finally {
      setTemplateLoadingId(null);
    }
  };

  const handleAi = async () => {
    const text = prompt.trim();
    if (!text || aiLoading) return;
    if (!user) return;
    if (!canUseAI(plan)) {
      toast.error('AI generation requires a Standard or Professional plan.');
      return;
    }
    setAiLoading(true);
    try {
      const result = await callGenerateQuestions({
        surveyTitle: 'AI Generated Survey',
        userPrompt: text,
      });
      const questions = (result.data.questions ?? []).map(aiToQuestion);
      if (!questions.length) {
        toast.error('AI returned no questions. Try a different prompt.');
        return;
      }
      const id = await createMut.mutateAsync({
        title: 'AI Generated Survey',
        description: text.slice(0, 200),
        questions,
      });
      toast.success(`Generated ${questions.length} questions`);
      navigate(`/builder/${id}`);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? '';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('plan')) {
        toast.error('AI generation requires a paid plan.');
      } else {
        toast.error('Could not generate questions. Try again.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const initials = getInitials(user?.displayName, user?.email);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full bg-[#fbfbfd] overflow-y-auto relative scroll-smooth">

      {/* Top Section: AI Creation */}
      <section className="min-h-screen flex flex-col items-center justify-center p-8 relative shrink-0">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center -mt-20">
          <div className="text-xs font-bold tracking-widest text-brand-black/40 uppercase mb-4">
            SurveyGo AI
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-medium text-brand-black mb-8 tracking-tight">
            What would you like to create?
          </h1>

          <div className="w-full relative group">
            <div className="absolute -inset-[2px] bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 rounded-2xl opacity-60 group-hover:opacity-100 blur-[2px] transition-opacity duration-500"></div>

            <div className="relative bg-white rounded-xl border border-white p-1 shadow-sm">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAi(); }}
                placeholder="Describe the survey you want to create..."
                className="w-full h-32 resize-none bg-transparent outline-none p-4 text-base font-medium placeholder:text-brand-black/30 text-brand-black"
              />

              <div className="flex items-center justify-between p-2 pt-0">
                <div className="flex items-center gap-2 text-xs text-brand-black/30 pl-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Powered by SurveyGo AI
                </div>

                <button
                  onClick={handleAi}
                  disabled={aiLoading || !prompt.trim()}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-brand-black/30 hover:text-brand-black hover:bg-brand-ghost transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={handleBlank}
              disabled={blankLoading}
              className="px-6 py-2.5 bg-brand-ghost border border-black/5 rounded-full text-sm font-medium text-brand-black/70 hover:bg-white hover:shadow-sm transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {blankLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Start from scratch
            </button>
            <button
              onClick={() => toast.info('Survey import coming soon')}
              className="px-6 py-2.5 bg-brand-ghost border border-black/5 rounded-full text-sm font-medium text-brand-black/70 hover:bg-white hover:shadow-sm transition-all flex items-center gap-2"
            >
              <FileUp className="w-4 h-4 text-brand-black/50" />
              Import survey
            </button>
          </div>

          <button
            onClick={() => templatesRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-12 flex flex-col items-center gap-2 text-sm font-medium text-brand-black/40 hover:text-brand-black/70 transition-colors cursor-pointer group"
          >
            <span>Or browse templates</span>
            <ChevronDown className="w-5 h-5 animate-bounce group-hover:text-brand-black/60" />
          </button>
        </div>
      </section>

      {/* Bottom Section: Template Library */}
      <section
        ref={templatesRef}
        className="min-h-screen bg-white px-8 py-24 border-t border-black/5"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-display font-bold text-brand-black mb-4">Start with a Template</h2>
            <p className="text-brand-black/50 text-base font-medium">Choose from our collection of expertly designed templates to save time.</p>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES_WITH_ALL.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                  category === cat
                    ? 'bg-brand-black text-white shadow-sm'
                    : 'bg-brand-ghost text-brand-black/60 hover:bg-black/5 hover:text-brand-black'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleTemplates.map(template => (
              <div
                key={template.id}
                className="group relative bg-brand-ghost/30 border border-black/5 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-ghost flex items-center justify-center mb-6 group-hover:bg-brand-blue/20 transition-colors">
                  <FileText className="w-6 h-6 text-brand-black/40 group-hover:text-brand-blue" />
                </div>

                <h3 className="text-lg font-bold text-brand-black mb-2">{template.title}</h3>
                <p className="text-brand-black/60 text-sm font-medium mb-8 leading-relaxed flex-1">
                  {template.description}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-black/40">{template.category}</span>
                  <button
                    onClick={() => handleTemplate(template.id)}
                    disabled={templateLoadingId === template.id}
                    className="text-sm font-semibold text-brand-black bg-brand-ghost px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {templateLoadingId === template.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Use template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
