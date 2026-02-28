import React, { useState, useCallback } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Activity as ActivityIcon, MessageSquare, TrendingUp, Inbox, ArrowRight, ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react';
import { useSurveys } from '../../hooks/useSurveys';
import { usePageTitle } from '../../hooks/usePageTitle';
import { markSurveyAsRead } from '../../lib/firestore';

interface ActivityPageProps {
    onNavigate: (page: string) => void;
}

const ITEMS_PER_PAGE = 8;

export function ActivityPage({ onNavigate }: ActivityPageProps) {
    usePageTitle('Activity');
    const { data: surveys = [], isLoading, refetch } = useSurveys();
    const [page, setPage] = useState(1);
    const [markingRead, setMarkingRead] = useState<string | null>(null);

    // Only show surveys that have unread responses
    const unreadSurveys = surveys
        .filter((s) => s.responseCount > (s.lastReadResponseCount ?? 0))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Pagination
    const totalPages = Math.max(1, Math.ceil(unreadSurveys.length / ITEMS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const paginatedSurveys = unreadSurveys.slice(
        (safePage - 1) * ITEMS_PER_PAGE,
        safePage * ITEMS_PER_PAGE
    );

    const handleMarkAsRead = useCallback(async (surveyId: string) => {
        setMarkingRead(surveyId);
        try {
            await markSurveyAsRead(surveyId);
            await refetch();
        } finally {
            setMarkingRead(null);
        }
    }, [refetch]);

    const handleViewAnalytics = useCallback(async (surveyId: string) => {
        // Mark as read, then navigate
        try {
            await markSurveyAsRead(surveyId);
            refetch();
        } catch {
            // Navigate anyway even if marking fails
        }
        onNavigate(`surveys/${surveyId}/results`);
    }, [onNavigate, refetch]);

    const timeAgo = (d: Date) => {
        const diff = Date.now() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="p-8">
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-[28px] font-bold text-foreground mb-2">Activity</h1>
                    <p className="text-gray-500">
                        {unreadSurveys.length > 0
                            ? `You have ${unreadSurveys.length} survey${unreadSurveys.length > 1 ? 's' : ''} with new responses`
                            : 'Recent activity across all your surveys'}
                    </p>
                </div>
            </div>

            {isLoading && (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-5 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </Card>
                    ))}
                </div>
            )}

            {!isLoading && unreadSurveys.length === 0 && (
                <Card className="p-12 text-center border-dashed">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">All caught up!</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        No new responses to review. Activity will appear here when you receive new survey responses.
                    </p>
                    <Button variant="primary" size="sm" onClick={() => onNavigate('surveys')}>
                        Go to My Surveys
                    </Button>
                </Card>
            )}

            {!isLoading && paginatedSurveys.length > 0 && (
                <>
                    <div className="space-y-3">
                        {paginatedSurveys.map((survey) => {
                            const newResponses = survey.responseCount - (survey.lastReadResponseCount ?? 0);
                            return (
                                <Card key={survey.id} className="p-5 hover:shadow-sm transition-shadow border-gray-100">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <MessageSquare className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-foreground truncate">{survey.title}</h3>
                                                <Badge variant={survey.status === 'active' ? 'success' : 'neutral'} className="capitalize text-[10px] px-1.5 py-0 h-5">
                                                    {survey.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-700">
                                                {newResponses === 1
                                                    ? 'There is 1 new response'
                                                    : `There are ${newResponses} new responses`}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1.5">
                                                Last updated {timeAgo(survey.updatedAt)} · {survey.responseCount} total responses
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-1.5 text-gray-500 hover:text-foreground"
                                                onClick={() => handleMarkAsRead(survey.id)}
                                                disabled={markingRead === survey.id}
                                            >
                                                <CheckCheck className="w-4 h-4" />
                                                {markingRead === survey.id ? 'Marking...' : 'Mark read'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => handleViewAnalytics(survey.id)}
                                            >
                                                View Analytics
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                            <p className="text-sm text-gray-500">
                                Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, unreadSurveys.length)} of {unreadSurveys.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={safePage <= 1}
                                    onClick={() => setPage(safePage - 1)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-sm text-gray-600 min-w-[80px] text-center">
                                    Page {safePage} of {totalPages}
                                </span>
                                <button
                                    disabled={safePage >= totalPages}
                                    onClick={() => setPage(safePage + 1)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
