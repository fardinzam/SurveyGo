import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { BuilderNavbar } from './BuilderNavbar';
import { Link2, Code, Mail, QrCode, Copy, Edit3, Send, BarChart3, Check, Loader2, Eye } from 'lucide-react';
import { getSurvey, updateSurvey } from '../../lib/firestore';
import type { SurveyClient } from '../../types/survey';
import { usePageTitle } from '../../hooks/usePageTitle';

interface PublishPageProps {
  onNavigate: (page: string) => void;
  surveyId?: string;
}

export function PublishPage({ onNavigate, surveyId }: PublishPageProps) {
  usePageTitle('Publish');
  const [copied, setCopied] = useState<string | null>(null);
  const [survey, setSurvey] = useState<SurveyClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Build the real survey URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const surveyUrl = surveyId ? `${origin}/s/${surveyId}` : '';
  const embedCode = surveyId
    ? `<iframe src="${origin}/s/${surveyId}" width="100%" height="600" frameborder="0"></iframe>`
    : '';

  // Load survey metadata
  useEffect(() => {
    if (!surveyId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await getSurvey(surveyId);
        if (!cancelled) setSurvey(data);
      } catch (err) {
        console.error('[SurveyGo] Error loading survey:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [surveyId]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Publish (set survey to active)
  const handlePublish = async () => {
    if (!surveyId) return;
    setPublishing(true);
    try {
      await updateSurvey(surveyId, { status: 'active' });
      // Reload survey to reflect new status
      const updated = await getSurvey(surveyId);
      setSurvey(updated);
    } catch (err) {
      console.error('[SurveyGo] Error publishing survey:', err);
    } finally {
      setPublishing(false);
    }
  };

  const isActive = survey?.status === 'active';
  const surveyTitle = survey?.title || 'Untitled Survey';

  return (
    <div className="min-h-screen bg-background">
      <BuilderNavbar
        surveyId={surveyId}
        currentStep={2}
        onNavigate={onNavigate}
        rightContent={
          <div className="flex items-center gap-3">
            {surveyId && (
              <a
                href={surveyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </a>
            )}
            {!isActive && (
              <Button
                variant="primary"
                size="sm"
                className="gap-2"
                onClick={handlePublish}
                disabled={publishing || !surveyId}
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Publish Survey
              </Button>
            )}
            {isActive && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Live
              </span>
            )}
          </div>
        }
      />

      <div className="pt-16 pb-8 max-w-4xl mx-auto px-8">
        {/* Content */}
        <div className="text-center mb-8 mt-4">
          <h2 className="text-3xl font-bold text-foreground mb-3">Distribute Your Survey</h2>
          <p className="text-gray-500 text-lg">
            {isActive
              ? 'Your survey is live! Share it using any of these methods.'
              : 'Publish your survey first, then share using the link below.'}
          </p>
        </div>

        {/* Status Banner */}
        {!isActive && !loading && (
          <Card className="p-4 mb-8 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Send className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">Survey not published yet</p>
                <p className="text-xs text-yellow-600">Click "Publish Survey" to make it available at the link below.</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="gap-2"
                onClick={handlePublish}
                disabled={publishing || !surveyId}
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Publish Now
              </Button>
            </div>
          </Card>
        )}

        {/* Distribution Options */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Share Link */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Link2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">Share Link</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Share this direct link with your audience
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={surveyUrl}
                readOnly
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
              />
              <Button
                variant={copied === 'link' ? 'secondary' : 'outline'}
                onClick={() => handleCopy(surveyUrl, 'link')}
                className="gap-2"
                disabled={!surveyUrl}
              >
                {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === 'link' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </Card>

          {/* Embed Code */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">Embed Code</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Embed the survey directly on your website
            </p>
            <div className="mb-3">
              <div className="px-4 py-3 bg-gray-900 rounded-lg overflow-x-auto">
                <code className="text-xs text-green-400 font-mono whitespace-nowrap">
                  {embedCode}
                </code>
              </div>
            </div>
            <Button
              variant={copied === 'embed' ? 'secondary' : 'outline'}
              onClick={() => handleCopy(embedCode, 'embed')}
              className="w-full gap-2"
              disabled={!embedCode}
            >
              {copied === 'embed' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied === 'embed' ? 'Copied!' : 'Copy Code'}
            </Button>
          </Card>

          {/* Email Invitation (deferred) */}
          <Card className="p-6 opacity-60">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">Email Invitation</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Send survey invitations directly via email
            </p>
            <p className="text-xs text-gray-400 italic">Coming soon</p>
          </Card>

          {/* QR Code (deferred) */}
          <Card className="p-6 opacity-60">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">QR Code</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Generate a QR code for offline distribution
            </p>
            <p className="text-xs text-gray-400 italic">Coming soon</p>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex justify-center items-center">
          <Button
            variant="primary"
            className="gap-2"
            onClick={() => surveyId ? onNavigate(`surveys/${surveyId}/connect`) : undefined}
          >
            Continue to Connect Apps
            <BarChart3 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
