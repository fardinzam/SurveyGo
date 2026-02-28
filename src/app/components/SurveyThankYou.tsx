import React from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { CheckCircle } from 'lucide-react';

interface SurveyThankYouProps {
    surveyTitle?: string;
}

export function SurveyThankYou({ surveyTitle }: SurveyThankYouProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-white to-background flex items-center justify-center px-4">
            <Card className="max-w-md w-full p-10 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3">Thank You!</h1>
                <p className="text-gray-500 mb-2">
                    Your response has been submitted successfully.
                </p>
                {surveyTitle && (
                    <p className="text-sm text-gray-400 mb-6">
                        Survey: {surveyTitle}
                    </p>
                )}
                <p className="text-gray-500 text-sm">
                    You may close this page now.
                </p>
            </Card>

            {/* Branding footer */}
            <div className="fixed bottom-6 left-0 right-0 text-center">
                <p className="text-xs text-gray-400">
                    Powered by <span className="font-semibold text-foreground">SurveyGo</span>
                </p>
            </div>
        </div>
    );
}
