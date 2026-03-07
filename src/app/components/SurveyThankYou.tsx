import React from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { CheckCircle } from 'lucide-react';

interface SurveyThankYouProps {
    surveyTitle?: string;
    accentColor?: string;
}

export function SurveyThankYou({ surveyTitle, accentColor }: SurveyThankYouProps) {
    const color = accentColor || '#E2F380';

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-white to-background flex items-center justify-center px-4">
            <Card className="max-w-md w-full p-10 text-center">
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ backgroundColor: `${color}30` }}
                >
                    <CheckCircle className="w-8 h-8" style={{ color }} />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3">Thank You!</h1>
                <p className="text-muted-foreground mb-2">
                    Your response has been submitted successfully.
                </p>
                {surveyTitle && (
                    <p className="text-sm text-muted-foreground mb-6">
                        Survey: {surveyTitle}
                    </p>
                )}
                <p className="text-muted-foreground text-sm">
                    You may close this page now.
                </p>
            </Card>

            {/* Branding footer */}
            <div className="fixed bottom-6 left-0 right-0 text-center">
                <p className="text-xs text-muted-foreground">
                    Powered by <span className="font-semibold text-foreground">SurveyGo</span>
                </p>
            </div>
        </div>
    );
}
