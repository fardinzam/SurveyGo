import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { FileText, Sparkles } from 'lucide-react';

interface DashboardEmptyStateProps {
  onNavigate: (page: string) => void;
}

export function DashboardEmptyState({ onNavigate }: DashboardEmptyStateProps) {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to SurveyGo! Let's get started.</p>
      </div>

      {/* Empty State */}
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="max-w-md text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
              <FileText className="w-12 h-12 text-foreground" />
            </div>
          </div>

          {/* Content */}
          <h2 className="text-2xl font-bold text-foreground mb-4">Welcome to SurveyGo!</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            You haven't created any surveys yet. Start collecting feedback in just a few minutes.
          </p>

          {/* CTA */}
          <Button 
            variant="primary" 
            size="lg" 
            className="gap-2 mb-4"
            onClick={() => onNavigate('templates-browse')}
          >
            <Sparkles className="w-5 h-5" />
            Create Your First Survey
          </Button>

          <p className="text-sm text-muted-foreground">
            or{' '}
            <button 
              onClick={() => onNavigate('templates-browse')}
              className="text-foreground font-semibold hover:text-primary"
            >
              Browse Templates
            </button>
            {' '}to get started quickly
          </p>
        </div>
      </div>
    </div>
  );
}
