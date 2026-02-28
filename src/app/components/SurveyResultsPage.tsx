import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { BuilderNavbar } from './BuilderNavbar';
import { Download, Share2, TrendingUp, Clock, CheckCircle, Loader2, Inbox } from 'lucide-react';
import { useResponses } from '../../hooks/useResponses';
import { useSurvey } from '../../hooks/useSurveys';
import type { SurveyResponseClient, Question, Answer } from '../../types/survey';
import { usePageTitle } from '../../hooks/usePageTitle';
import { markSurveyAsRead } from '../../lib/firestore';

interface SurveyResultsPageProps {
  onNavigate: (page: string) => void;
  surveyId?: string;
}

export function SurveyResultsPage({ onNavigate, surveyId }: SurveyResultsPageProps) {
  usePageTitle('Analytics');
  const [activeTab, setActiveTab] = useState('overview');
  const { data: responses = [], isLoading: loadingResponses } = useResponses(surveyId);
  const { data: survey, isLoading: loadingSurvey } = useSurvey(surveyId);

  const isLoading = loadingResponses || loadingSurvey;
  const totalResponses = responses.length;
  const questions = survey?.questions ?? [];

  // Auto-mark survey as read when viewing analytics
  useEffect(() => {
    if (surveyId && survey && survey.responseCount > (survey.lastReadResponseCount ?? 0)) {
      markSurveyAsRead(surveyId).catch(() => { });
    }
  }, [surveyId, survey]);

  // Build answer lookup: questionId -> Answer[]
  const answersByQuestion: Record<string, Answer[]> = {};
  for (const r of responses) {
    for (const a of r.answers) {
      if (!answersByQuestion[a.questionId]) answersByQuestion[a.questionId] = [];
      answersByQuestion[a.questionId].push(a);
    }
  }

  // Helper: get question text by id
  const questionText = (qId: string) => questions.find((q) => q.id === qId)?.text ?? qId;
  const questionType = (qId: string) => questions.find((q) => q.id === qId)?.type ?? 'short';

  // Average rating for rating-type questions
  const avgRating = (() => {
    const ratingQs = questions.filter((q) => q.type === 'rating');
    if (ratingQs.length === 0) return null;
    let sum = 0, count = 0;
    for (const q of ratingQs) {
      const answers = answersByQuestion[q.id] ?? [];
      for (const a of answers) {
        const val = typeof a.value === 'number' ? a.value : Number(a.value);
        if (!isNaN(val)) { sum += val; count++; }
      }
    }
    return count > 0 ? (sum / count).toFixed(1) : null;
  })();

  return (
    <div className="min-h-screen bg-background">
      <BuilderNavbar
        surveyId={surveyId}
        currentStep={4}
        onNavigate={onNavigate}
        rightContent={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        }
      />

      <div className="pt-16 pb-8 max-w-6xl mx-auto px-8">
        {/* Header */}
        <div className="mb-6 mt-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Analytics</h2>
              <div className="flex items-center gap-3">
                {survey && (
                  <Badge variant={survey.status === 'active' ? 'success' : survey.status === 'draft' ? 'neutral' : 'error'} className="capitalize">
                    {survey.status}
                  </Badge>
                )}
                <span className="text-gray-500">{totalResponses} response{totalResponses !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex gap-8">
            {['overview', 'responses'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-2 font-medium capitalize transition-colors relative ${activeTab === tab ? 'text-foreground' : 'text-gray-500 hover:text-foreground'
                  }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Overview Tab */}
        {!isLoading && activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="text-sm text-gray-500 mb-2">Total Responses</div>
                <div className="text-3xl font-bold text-foreground mb-1">{totalResponses}</div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <TrendingUp className="w-3 h-3" />
                  <span>All time</span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-sm text-gray-500 mb-2">Questions</div>
                <div className="text-3xl font-bold text-foreground mb-1">{questions.length}</div>
                <div className="text-sm text-gray-500">in this survey</div>
              </Card>

              {avgRating !== null && (
                <Card className="p-6">
                  <div className="text-sm text-gray-500 mb-2">Avg Rating</div>
                  <div className="text-3xl font-bold text-foreground mb-1">{avgRating}</div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    <span>out of 5</span>
                  </div>
                </Card>
              )}

              {avgRating === null && (
                <Card className="p-6">
                  <div className="text-sm text-gray-500 mb-2">Avg Time</div>
                  <div className="text-3xl font-bold text-foreground mb-1">—</div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Not enough data</span>
                  </div>
                </Card>
              )}
            </div>

            {/* Per-Question Breakdown */}
            <h3 className="text-lg font-semibold text-foreground mt-2">Response Breakdown by Question</h3>
            {questions.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-gray-500">No questions in this survey.</p>
              </Card>
            )}

            {questions.map((q) => (
              <QuestionSummaryCard
                key={q.id}
                question={q}
                answers={answersByQuestion[q.id] ?? []}
              />
            ))}

            {/* Empty state */}
            {totalResponses === 0 && (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No responses yet</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Share your survey to start collecting responses.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => surveyId ? onNavigate(`surveys/${surveyId}/publish`) : undefined}
                >
                  Go to Publish
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Responses Tab — individual responses */}
        {!isLoading && activeTab === 'responses' && (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Showing {totalResponses} response{totalResponses !== 1 ? 's' : ''}
            </p>

            {totalResponses === 0 && (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No responses yet</h3>
                <p className="text-gray-500 text-sm">Share your survey link to start collecting data.</p>
              </Card>
            )}

            {responses.map((response, idx) => (
              <Card key={response.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-foreground">Response #{totalResponses - idx}</h4>
                    <p className="text-sm text-gray-500">
                      {response.submittedAt.toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {response.answers.map((answer) => (
                    <div key={answer.questionId} className="border-l-2 border-gray-200 pl-4">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {questionText(answer.questionId)}
                      </p>
                      <ResponseValueDisplay
                        value={answer.value}
                        questionType={questionType(answer.questionId)}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Question Summary Card ──────────────────

function QuestionSummaryCard({ question, answers }: { question: Question; answers: Answer[] }) {
  const totalAnswers = answers.length;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <Badge className="text-xs capitalize mb-1">{question.type}</Badge>
          <h4 className="font-medium text-foreground">{question.text}</h4>
        </div>
        <span className="text-sm text-gray-500 flex-shrink-0 ml-4">{totalAnswers} answer{totalAnswers !== 1 ? 's' : ''}</span>
      </div>

      {/* Rating summary */}
      {question.type === 'rating' && totalAnswers > 0 && (
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4, 5].map((star) => {
            const count = answers.filter((a) => Number(a.value) === star).length;
            const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
            return (
              <div key={star} className="flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs text-gray-500">{star}★</span>
                  <span className="text-xs text-gray-400">{count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multiple choice / checkbox summary */}
      {(question.type === 'multiple' || question.type === 'checkbox') && totalAnswers > 0 && (
        <div className="space-y-2">
          {(question.options?.choices ?? []).map((choice) => {
            const count = answers.filter((a) => {
              if (Array.isArray(a.value)) return a.value.includes(choice);
              return a.value === choice;
            }).length;
            const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
            return (
              <div key={choice} className="flex items-center gap-3">
                <span className="text-sm text-foreground w-32 truncate">{choice}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                </div>
                <span className="text-xs text-gray-500 w-14 text-right">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Short / Long text – show recent answers */}
      {(question.type === 'short' || question.type === 'long') && totalAnswers > 0 && (
        <div className="space-y-2 mt-2">
          {answers.slice(0, 3).map((a, i) => (
            <div key={i} className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
              "{String(a.value)}"
            </div>
          ))}
          {totalAnswers > 3 && (
            <p className="text-xs text-gray-400">+{totalAnswers - 3} more answers</p>
          )}
        </div>
      )}

      {totalAnswers === 0 && (
        <p className="text-sm text-gray-400 italic">No answers yet</p>
      )}
    </Card>
  );
}

// ── Response Value Display ─────────────────

function ResponseValueDisplay({ value, questionType }: { value: string | number | string[]; questionType: string }) {
  if (questionType === 'rating') {
    const n = Number(value);
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < n ? 'text-yellow-400' : 'text-gray-200'}>★</span>
        ))}
        <span className="text-sm text-gray-500 ml-1">{n}/5</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
        ))}
      </div>
    );
  }

  return <p className="text-foreground">{String(value)}</p>;
}
