import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Check, Sparkles, Zap, Crown, ArrowRight } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

interface PlansPageProps {
    onNavigate: (page: string) => void;
}

const plans = [
    {
        id: 'basic',
        name: 'Basic',
        price: 0,
        period: 'forever',
        description: 'Perfect for individuals getting started with surveys',
        icon: Sparkles,
        color: 'from-gray-100 to-gray-200',
        features: [
            'Up to 3 surveys',
            '100 responses per survey',
            '5 questions per survey',
            'Basic question types (text, rating, multiple choice)',
            'Share via link',
            'Basic analytics',
            'Community support',
        ],
        limitations: [
            'SurveyGo branding on surveys',
            'No export to CSV/PDF',
            'No custom themes',
        ],
        cta: 'Current Plan',
        popular: false,
    },
    {
        id: 'standard',
        name: 'Standard',
        price: 19,
        period: '/month',
        description: 'For growing teams that need more power and customization',
        icon: Zap,
        color: 'from-blue-100 to-blue-200',
        features: [
            'Unlimited surveys',
            '1,000 responses per survey',
            'Unlimited questions',
            'All question types',
            'Share via link, email & QR code',
            'Advanced analytics & exports (CSV, PDF)',
            'Remove SurveyGo branding',
            'Custom themes & colors',
            'Priority email support',
            'Connect up to 5 apps',
        ],
        limitations: [],
        cta: 'Upgrade to Standard',
        popular: true,
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 49,
        period: '/month',
        description: 'For organizations that demand enterprise features',
        icon: Crown,
        color: 'from-purple-100 to-purple-200',
        features: [
            'Everything in Standard',
            'Unlimited responses',
            'AI-powered survey generation',
            'AI sentiment analysis',
            'Branching logic & skip patterns',
            'Team collaboration (up to 10 members)',
            'White-label surveys (custom domain)',
            'Webhook integrations',
            'Unlimited app connections',
            'SSO / SAML authentication',
            'Dedicated account manager',
            'API access',
        ],
        limitations: [],
        cta: 'Upgrade to Professional',
        popular: false,
    },
];

export function PlansPage({ onNavigate }: PlansPageProps) {
    usePageTitle('Plans');
    const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
    const yearlyDiscount = 0.8; // 20% off

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-foreground mb-3">Choose Your Plan</h1>
                <p className="text-gray-500 text-lg mb-6">
                    Scale your feedback collection as your business grows
                </p>

                {/* Billing Toggle */}
                <div className="inline-flex bg-gray-100 rounded-xl p-1">
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-white text-foreground shadow-sm' : 'text-gray-500'
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBilling('yearly')}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${billing === 'yearly' ? 'bg-white text-foreground shadow-sm' : 'text-gray-500'
                            }`}
                    >
                        Yearly
                        <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                            Save 20%
                        </span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                    const PlanIcon = plan.icon;
                    const displayPrice = plan.price === 0
                        ? 0
                        : billing === 'yearly'
                            ? Math.round(plan.price * yearlyDiscount)
                            : plan.price;

                    return (
                        <Card
                            key={plan.id}
                            className={`p-6 relative overflow-hidden ${plan.popular ? 'border-2 border-primary shadow-lg ring-1 ring-primary/20' : ''
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0 bg-primary text-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
                                    Most Popular
                                </div>
                            )}

                            <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-4`}>
                                <PlanIcon className="w-6 h-6 text-foreground" />
                            </div>

                            <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

                            <div className="mb-6">
                                <span className="text-4xl font-bold text-foreground">
                                    ${displayPrice}
                                </span>
                                <span className="text-gray-500 text-sm">
                                    {plan.price === 0 ? ' forever' : billing === 'yearly' ? '/mo (billed yearly)' : '/month'}
                                </span>
                            </div>

                            <Button
                                variant={plan.id === 'basic' ? 'outline' : 'primary'}
                                className="w-full gap-2 mb-6"
                                disabled={plan.id === 'basic'}
                            >
                                {plan.cta}
                                {plan.id !== 'basic' && <ArrowRight className="w-4 h-4" />}
                            </Button>

                            <div className="space-y-3">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-700">{feature}</span>
                                    </div>
                                ))}
                                {plan.limitations.map((limit, i) => (
                                    <div key={`l-${i}`} className="flex items-start gap-2.5">
                                        <span className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0 text-center">—</span>
                                        <span className="text-sm text-gray-400">{limit}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* FAQ / Bottom CTA */}
            <div className="text-center mt-12">
                <p className="text-gray-500 text-sm">
                    All plans include a 14-day free trial of Standard features.{' '}
                    <button onClick={() => onNavigate('settings')} className="text-primary font-medium hover:underline">
                        Contact support
                    </button>{' '}
                    for custom enterprise pricing.
                </p>
            </div>
        </div>
    );
}
