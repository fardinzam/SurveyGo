import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Check, Sparkles, Zap, Crown, ArrowRight, Loader2 } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useSubscription } from '../../hooks/useSubscription';
import { callCreateCheckoutSession } from '../../lib/functions';
import { toast } from 'sonner';

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
            'No AI features',
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
            'All question types + branching logic',
            'Share via link, email & QR code',
            'Advanced analytics & exports (CSV, PDF)',
            'Remove SurveyGo branding',
            'Custom themes & colors',
            'AI question generation (10 requests/month)',
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
            'Unlimited AI question generation',
            'AI sentiment analysis on open-ended responses',
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
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const yearlyDiscount = 0.8; // 20% off
    const { plan: currentPlan, loading: subLoading } = useSubscription();

    async function handleUpgrade(planId: 'standard' | 'professional') {
        setLoadingPlan(planId);
        try {
            const result = await callCreateCheckoutSession({ planId, billingPeriod: billing });
            const url = result.data.url;
            if (url) window.location.href = url;
        } catch (err) {
            console.error('Checkout error:', err);
            toast.error('Could not start checkout. Please try again.');
        } finally {
            setLoadingPlan(null);
        }
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-foreground mb-3">Choose Your Plan</h1>
                <p className="text-muted-foreground text-lg mb-6">
                    Scale your feedback collection as your business grows
                </p>

                {/* Billing Toggle */}
                <div className="inline-flex bg-muted rounded-xl p-1">
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBilling('yearly')}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${billing === 'yearly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
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

                    const isCurrentPlan = !subLoading && currentPlan === plan.id;
                    const isDowngrade = !subLoading && currentPlan !== 'basic' &&
                        plans.findIndex(p => p.id === plan.id) < plans.findIndex(p => p.id === currentPlan);

                    let ctaLabel = plan.cta;
                    if (isCurrentPlan) ctaLabel = 'Current Plan';
                    else if (isDowngrade) ctaLabel = `Downgrade to ${plan.name}`;

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
                            {isCurrentPlan && (
                                <div className="absolute top-0 left-0 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-br-lg">
                                    Active
                                </div>
                            )}

                            <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-4`}>
                                <PlanIcon className="w-6 h-6 text-gray-900" />
                            </div>

                            <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                            <div className="mb-6">
                                <span className="text-4xl font-bold text-foreground">
                                    ${displayPrice}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                    {plan.price === 0 ? ' forever' : billing === 'yearly' ? '/mo (billed yearly)' : '/month'}
                                </span>
                            </div>

                            <Button
                                variant={isCurrentPlan || plan.id === 'basic' ? 'outline' : 'primary'}
                                className="w-full gap-2 mb-6"
                                disabled={isCurrentPlan || plan.id === 'basic' || loadingPlan !== null || subLoading}
                                onClick={() => {
                                    if (plan.id === 'standard' || plan.id === 'professional') {
                                        handleUpgrade(plan.id);
                                    }
                                }}
                            >
                                {loadingPlan === plan.id
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
                                    : <>{ctaLabel}{!isCurrentPlan && plan.id !== 'basic' && <ArrowRight className="w-4 h-4" />}</>
                                }
                            </Button>

                            <div className="space-y-3">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-foreground">{feature}</span>
                                    </div>
                                ))}
                                {plan.limitations.map((limit, i) => (
                                    <div key={`l-${i}`} className="flex items-start gap-2.5">
                                        <span className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0 text-center">—</span>
                                        <span className="text-sm text-muted-foreground">{limit}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Bottom note */}
            <div className="text-center mt-12">
                <p className="text-muted-foreground text-sm">
                    All paid plans include a 14-day free trial.{' '}
                    <button onClick={() => onNavigate('settings')} className="text-primary font-medium hover:underline">
                        Contact support
                    </button>{' '}
                    for custom enterprise pricing.
                </p>
            </div>
        </div>
    );
}
