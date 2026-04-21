import React, { useState } from 'react';
import { Check, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSubscription } from '../../hooks/useSubscription';
import { callCreateCheckoutSession, callCreatePortalSession } from '../../lib/functions';

type Billing = 'monthly' | 'yearly';
type TierId = 'basic' | 'standard' | 'professional';

interface Tier {
  id: TierId;
  name: string;
  description: string;
  monthly: number;
  yearlyMonthly: number;
  cta: string;
  features: string[];
  popular?: boolean;
  subtitle?: string;
}

const TIERS: Tier[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'For individuals getting started.',
    monthly: 0,
    yearlyMonthly: 0,
    cta: 'Current plan',
    features: [
      'Up to 3 active surveys',
      '100 responses per survey',
      'Up to 5 questions per survey',
      'Core question types',
      'Basic CSV viewing',
      'Includes SurveyGo branding',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'For small teams and frequent users.',
    monthly: 19,
    yearlyMonthly: 15,
    cta: 'Upgrade to Standard',
    popular: true,
    subtitle: 'Everything in Basic, plus:',
    features: [
      'Unlimited surveys',
      '1,000 responses per survey',
      'Unlimited questions',
      'AI question generation (10/month)',
      'Conditional logic & branching',
      'Custom themes, remove SurveyGo branding',
      'CSV/Excel export',
      'Core integrations (up to 5 apps)',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing businesses with advanced needs.',
    monthly: 99,
    yearlyMonthly: 79,
    cta: 'Upgrade to Professional',
    subtitle: 'Everything in Standard, plus:',
    features: [
      'Unlimited responses',
      'Unlimited AI question generation',
      'AI sentiment analysis',
      'All integrations (Zapier, HubSpot, Salesforce)',
      'Priority support',
      'Team collaboration',
    ],
  },
];

const FAQS = [
  { q: 'Can I change plans later?', a: 'Yes — you can upgrade, downgrade, or cancel at any time. Changes take effect at the start of your next billing cycle.' },
  { q: 'What happens if I exceed my response limit?', a: "Your surveys stay live, but new responses will be queued until the next cycle or until you upgrade. We'll notify you before you hit the limit." },
  { q: 'Do you offer discounts for nonprofits or education?', a: 'Yes. Registered nonprofits and academic institutions get 40% off any paid plan. Contact our team to apply.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. There are no long-term contracts on any plan. Cancel with one click and keep access through the end of your billing period.' },
  { q: 'How does the free tier work?', a: 'Basic is free forever — no credit card required. You get 3 active surveys and 100 responses, with core question types.' },
];

export function DashboardPricing() {
  const [billing, setBilling] = useState<Billing>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [ctaLoading, setCtaLoading] = useState<TierId | 'portal' | null>(null);
  const { plan: currentPlan, stripeCustomerId } = useSubscription();

  const handleCta = async (tier: Tier) => {
    if (ctaLoading) return;
    if (tier.id === 'basic') return;

    if (currentPlan === tier.id) {
      // Manage current paid plan via Stripe portal
      setCtaLoading('portal');
      try {
        const res = await callCreatePortalSession();
        window.location.href = res.data.url;
      } catch {
        toast.error('Could not open billing portal.');
        setCtaLoading(null);
      }
      return;
    }

    setCtaLoading(tier.id);
    try {
      const res = await callCreateCheckoutSession({
        planId: tier.id as 'standard' | 'professional',
        billingPeriod: billing,
      });
      window.location.href = res.data.url;
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Could not start checkout.');
      setCtaLoading(null);
    }
  };

  const handleManage = async () => {
    if (!stripeCustomerId) {
      toast.error('No active subscription to manage.');
      return;
    }
    setCtaLoading('portal');
    try {
      const res = await callCreatePortalSession();
      window.location.href = res.data.url;
    } catch {
      toast.error('Could not open billing portal.');
      setCtaLoading(null);
    }
  };

  return (
    <div className="flex-1 h-full bg-brand-ghost overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-8 py-16">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-brand-black tracking-tight mb-3">Simple, transparent pricing</h1>
          <p className="text-brand-black/50 text-base max-w-xl mx-auto">Choose the plan that fits your team. Upgrade, downgrade, or cancel anytime.</p>

          <div className="inline-flex items-center gap-3 mt-8">
            <div className="flex items-center bg-white border border-black/10 rounded-full p-0.5 shadow-sm">
              {(['monthly', 'yearly'] as Billing[]).map(b => (
                <button key={b} onClick={() => setBilling(b)}
                  className={`px-5 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                    billing === b ? 'bg-brand-black text-white' : 'text-brand-black/50 hover:text-brand-black'
                  }`}>{b}</button>
              ))}
            </div>
            <span className="bg-brand-honeydew/60 text-green-700 text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wider">Save ~20%</span>
          </div>
        </header>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16 max-w-5xl mx-auto">
          {TIERS.map(t => (
            <TierCard
              key={t.id}
              tier={t}
              billing={billing}
              currentPlan={currentPlan}
              loading={ctaLoading === t.id}
              onCta={() => handleCta(t)}
            />
          ))}
        </div>

        {/* Manage billing */}
        {currentPlan !== 'basic' && stripeCustomerId && (
          <div className="text-center mb-16">
            <button
              onClick={handleManage}
              disabled={ctaLoading === 'portal'}
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-black/80 hover:text-brand-black underline disabled:opacity-60"
            >
              {ctaLoading === 'portal' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Manage billing
            </button>
          </div>
        )}

        {/* FAQ */}
        <section className="max-w-[720px] mx-auto">
          <h2 className="font-display text-2xl font-semibold text-brand-black tracking-tight text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-black/5 shadow-sm overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-brand-ghost/40 transition-colors">
                  <span className="text-sm font-medium text-brand-black">{f.q}</span>
                  <ChevronDown className={`w-4 h-4 text-brand-black/40 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-brand-black/60 leading-relaxed">{f.a}</div>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-brand-black/40 mt-10">
            Have questions? <a href="mailto:hello@surveygo.app" className="text-brand-black font-medium hover:underline">Contact our team</a> for a custom plan.
          </p>
        </section>
      </div>
    </div>
  );
}

function TierCard({
  tier,
  billing,
  currentPlan,
  loading,
  onCta,
}: {
  tier: Tier;
  billing: Billing;
  currentPlan: string;
  loading: boolean;
  onCta: () => void;
}) {
  const price = billing === 'monthly' ? tier.monthly : tier.yearlyMonthly;
  const isCurrent = currentPlan === tier.id;
  const ctaLabel = isCurrent
    ? (tier.id === 'basic' ? 'Current plan' : 'Manage plan')
    : tier.cta;

  const base = 'relative rounded-2xl shadow-sm p-6 flex flex-col gap-5 transition-all';
  const variant = tier.popular
    ? 'bg-brand-vanilla/20 border-2 border-brand-vanilla md:-translate-y-2 shadow-md'
    : 'bg-white border border-black/5';

  const mutedText = 'text-brand-black/40';
  const bodyText = 'text-brand-black/70';

  const ctaClass = isCurrent && tier.id === 'basic'
    ? 'bg-brand-ghost text-brand-black/60 border border-black/10 cursor-default'
    : tier.popular
    ? 'bg-brand-black text-white hover:bg-black/90'
    : tier.id === 'basic'
    ? 'bg-brand-ghost text-brand-black border border-black/10 hover:bg-black/5'
    : 'bg-brand-black text-white hover:bg-black/90';

  return (
    <div className={`${base} ${variant}`}>
      {tier.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1 flex items-center gap-1 shadow-sm">
          <Sparkles className="w-3 h-3" />
          Most popular
        </span>
      )}

      <div>
        <h3 className="text-lg font-semibold text-brand-black">{tier.name}</h3>
        <p className={`text-xs mt-1 leading-snug ${mutedText}`}>{tier.description}</p>
      </div>

      <div className="min-h-[60px]">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-semibold text-brand-black">${price}</span>
          <span className={`text-sm ${mutedText}`}>/ month</span>
          {billing === 'yearly' && price !== 0 && (
            <span className="bg-brand-honeydew/60 text-green-700 text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-1">-20%</span>
          )}
        </div>
      </div>

      <button
        onClick={onCta}
        disabled={loading || (isCurrent && tier.id === 'basic')}
        className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${ctaClass}`}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {ctaLabel}
      </button>

      <div className="border-t border-black/5" />

      <div className="flex flex-col gap-2.5">
        {tier.subtitle && (
          <p className={`text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>{tier.subtitle}</p>
        )}
        {tier.features.map(f => (
          <div key={f} className="flex items-start gap-2.5">
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
            <span className={`text-sm leading-snug ${bodyText}`}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
