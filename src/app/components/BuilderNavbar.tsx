import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { ArrowLeft, Edit3, Send, Plug, BarChart3 } from 'lucide-react';
import { getSurvey } from '../../lib/firestore';

export type BuilderStep = 1 | 2 | 3 | 4;

interface BuilderNavbarProps {
    surveyId?: string;
    currentStep: BuilderStep;
    onNavigate: (page: string) => void;
    /** Optional: custom right-side content (replaces the default CTA) */
    rightContent?: React.ReactNode;
}

const steps = [
    { id: 1 as const, label: 'Edit', icon: Edit3 },
    { id: 2 as const, label: 'Publish', icon: Send },
    { id: 3 as const, label: 'Connect Apps', icon: Plug },
    { id: 4 as const, label: 'Analytics', icon: BarChart3 },
];

function getStepRoute(stepId: number, surveyId?: string): string | null {
    if (!surveyId) return null;
    switch (stepId) {
        case 1: return `surveys/${surveyId}/edit`;
        case 2: return `surveys/${surveyId}/publish`;
        case 3: return `surveys/${surveyId}/connect`;
        case 4: return `surveys/${surveyId}/results`;
        default: return null;
    }
}

export function BuilderNavbar({
    surveyId,
    currentStep,
    onNavigate,
    rightContent,
}: BuilderNavbarProps) {
    const [surveyTitle, setSurveyTitle] = useState('...');

    useEffect(() => {
        if (!surveyId) return;
        let cancelled = false;
        (async () => {
            try {
                const s = await getSurvey(surveyId);
                if (!cancelled && s) setSurveyTitle(s.title);
            } catch { /* ignore */ }
        })();
        return () => { cancelled = true; };
    }, [surveyId]);

    // Back: go to previous step, or "surveys" for step 1
    const handleBack = () => {
        if (currentStep === 1) {
            onNavigate('surveys');
        } else {
            const prevRoute = getStepRoute(currentStep - 1, surveyId);
            if (prevRoute) onNavigate(prevRoute);
        }
    };

    return (
        <div className="bg-card border-b border-border px-6 py-3 fixed top-0 left-0 right-0 z-20">
            <div className="flex items-center justify-between max-w-full mx-auto relative">
                {/* Left: back + title */}
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-lg font-semibold truncate">{surveyTitle}</span>
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
                                        if (step.id !== currentStep) {
                                            const route = getStepRoute(step.id, surveyId);
                                            if (route) onNavigate(route);
                                        }
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isActive
                                        ? 'bg-primary text-foreground shadow-sm'
                                        : isCompleted
                                            ? 'bg-secondary text-foreground'
                                            : 'bg-card text-muted-foreground border border-border'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${isActive ? 'bg-white/30' : isCompleted ? 'bg-white/50' : 'bg-muted'
                                        }`}>
                                        <StepIcon className="w-3 h-3" />
                                    </div>
                                    <span className="hidden lg:inline">{step.label}</span>
                                </button>

                                {index < steps.length - 1 && (
                                    <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-secondary' : 'bg-border'
                                        }`}></div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Right: action buttons or custom content */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {rightContent}
                </div>
            </div>
        </div>
    );
}
