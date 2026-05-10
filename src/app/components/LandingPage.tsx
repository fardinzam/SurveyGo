import React, { useState } from 'react';
import { Link } from 'react-router';
import { SiteFooter } from './SiteFooter';
import {
  ArrowRight,
  Sparkles,
  LayoutTemplate,
  Wand2,
  Share2,
  RefreshCw,
  Layout,
  MessageSquare,
  Zap,
  BarChart2,
  Database,
  Lightbulb,
  PenLine,
  Star,
  Check,
} from 'lucide-react';

// ── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="absolute top-0 left-0 right-0 w-full z-50 px-6 py-6 md:px-12">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <Link to="/" className="text-xl font-bold font-display flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-black rounded-md flex items-center justify-center">
            <div className="w-2 h-2 bg-brand-vanilla rounded-full"></div>
          </div>
          SurveyGo
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-brand-black/60">
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-brand-black transition-colors">Features</button>
          <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-brand-black transition-colors">Pricing</button>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-sm font-medium text-brand-black/80 hover:text-brand-black transition-colors hidden sm:block">
            Log in
          </Link>
          <Link to="/auth" className="bg-brand-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-black/90 transition-colors shadow-sm">
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative w-full bg-brand-ghost font-sans pt-32 pb-24 px-6 md:px-12 flex items-center overflow-hidden">
      <div className="max-w-[1200px] mx-auto w-full grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center relative z-10">
        <div className="flex flex-col items-start gap-8 relative z-20">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-brand-black leading-[1.1] tracking-tight">
            Build smarter surveys. <br /> Get answers that matter.
          </h1>
          <p className="text-lg md:text-xl text-brand-black/70 leading-relaxed max-w-lg">
            Design, publish, and analyze surveys with AI-powered insights. Minimal effort, maximum conversion.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <Link
              to="/auth"
              className="bg-brand-black text-white px-8 py-4 rounded-xl font-medium text-base hover:bg-black/90 transition-colors flex items-center gap-2 shadow-lg shadow-black/10"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Mockup */}
        <div className="w-full relative hidden lg:block">
          <div className="w-[120%] h-[600px] bg-white rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)] border border-black/5 flex flex-col overflow-hidden transform rotate-[-2deg] hover:rotate-0 transition-transform duration-700 ml-8">
            <div className="h-14 border-b border-black/5 flex items-center px-6 gap-4 bg-brand-ghost/30">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-black/10"></div>
                <div className="w-3 h-3 rounded-full bg-black/10"></div>
                <div className="w-3 h-3 rounded-full bg-black/10"></div>
              </div>
              <div className="flex-1 bg-white h-7 rounded-md border border-black/5 shadow-sm max-w-sm flex items-center px-3 gap-2 text-xs text-brand-black/40 font-medium">
                <LayoutTemplate className="w-3.5 h-3.5" />
                surveygo.app/dashboard
              </div>
            </div>
            <div className="flex-1 flex bg-white p-6 relative">
              <div className="w-48 border-r border-black/5 flex flex-col gap-4 pr-6">
                <div className="h-8 bg-brand-ghost rounded-lg w-full"></div>
                <div className="h-8 bg-brand-ghost/50 rounded-lg w-3/4"></div>
                <div className="h-8 bg-brand-ghost/50 rounded-lg w-5/6"></div>
              </div>
              <div className="flex-1 pl-6 flex flex-col gap-6">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="h-6 w-32 bg-brand-black/5 rounded mb-2"></div>
                    <div className="h-10 w-48 bg-brand-black/10 rounded"></div>
                  </div>
                  <div className="h-10 w-32 bg-brand-blue rounded-lg"></div>
                </div>
                <div className="flex-1 border-2 border-dashed border-brand-blue/50 bg-brand-ghost/30 rounded-2xl flex items-center justify-center">
                  <p className="text-brand-black/40 font-semibold tracking-widest uppercase text-sm">Dashboard View</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── TrustStrip ───────────────────────────────────────────────────────────────

function TrustStrip() {
  const items = [
    { icon: <Wand2 className="w-4 h-4" />, text: "AI-powered survey generation" },
    { icon: <BarChart2 className="w-4 h-4" />, text: "Real-time analytics dashboard" },
    { icon: <Layout className="w-4 h-4" />, text: "No-code builder" },
    { icon: <Share2 className="w-4 h-4" />, text: "Export to Sheets & integrations" },
    { icon: <RefreshCw className="w-4 h-4" />, text: "Built for fast iteration" },
  ];
  return (
    <section className="w-full bg-brand-ghost border-y border-black/5 py-12 px-6">
      <div className="max-w-[1200px] mx-auto flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-brand-black/60 font-medium text-sm">
            <span className="p-2 bg-brand-black/5 rounded-full">{item.icon}</span>
            {item.text}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── ProductPreview ────────────────────────────────────────────────────────────

function ProductPreview() {
  const sections = [
    { title: "Design", heading: "Create surveys manually or generate them with AI", description: "Stop wrestling with clunky form builders. Just describe what you need, and SurveyGo creates a tailored, responsive survey in seconds.", imagePlaceholder: "Survey Editor UI", bgColor: "bg-brand-vanilla" },
    { title: "Publish", heading: "Share via link, embed, or integrations", description: "Reach your audience wherever they are. Easily share via a secure link, embed right on your website, or connect straight into your existing workflow tools.", imagePlaceholder: "Share / Embed UI", bgColor: "bg-brand-honeydew", reverse: true },
    { title: "Analyze", heading: "View responses and get AI-powered insights", description: "Don't just collect data—understand it. SurveyGo processes natural language answers and highlights key trends automatically.", imagePlaceholder: "Analytics Dashboard", bgColor: "bg-brand-blue" },
  ];
  return (
    <section className="w-full bg-white py-32 px-6">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-32">
        {sections.map((section, idx) => (
          <div key={idx} className={`flex flex-col gap-12 lg:gap-24 items-center ${section.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
            <div className="flex-1 space-y-6 max-w-xl">
              <span className="text-sm font-bold uppercase tracking-wider text-brand-black/40 border border-brand-black/10 px-3 py-1 rounded-full">{section.title}</span>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-brand-black leading-[1.2]">{section.heading}</h2>
              <p className="text-lg text-brand-black/60 font-medium leading-relaxed">{section.description}</p>
            </div>
            <div className="flex-[1.5] w-full">
              <div className="aspect-[4/3] rounded-3xl bg-brand-ghost border border-black/5 shadow-xl flex items-center justify-center relative overflow-hidden">
                <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[80px] opacity-50 ${section.bgColor}`}></div>
                <div className="border-2 border-dashed border-black/10 px-8 py-4 rounded-xl backdrop-blur-sm bg-white/50 text-brand-black/40 font-semibold tracking-widest uppercase text-sm z-10">{section.imagePlaceholder}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── HowItWorks ────────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { number: "01", title: "Create", desc: "Use AI to generate a survey instantly.", icon: <Wand2 className="w-6 h-6" /> },
    { number: "02", title: "Share", desc: "Distribute across channels with one click.", icon: <Share2 className="w-6 h-6" /> },
    { number: "03", title: "Analyze", desc: "Review AI-summarized insights & charts.", icon: <BarChart2 className="w-6 h-6" /> },
  ];
  return (
    <section className="w-full bg-brand-ghost py-32 px-6">
      <div className="max-w-[1000px] mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-display font-bold text-brand-black mb-20">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div className="hidden md:block absolute top-[52px] left-[16%] right-[16%] h-[2px] bg-brand-black/5"></div>
          {steps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center relative z-10">
              <div className="w-24 h-24 rounded-full bg-white shadow-sm border border-black/5 flex items-center justify-center text-brand-black mb-6 relative">
                <span className="absolute -top-2 -right-2 bg-brand-black text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">{step.number}</span>
                {step.icon}
              </div>
              <h3 className="text-xl font-bold font-display text-brand-black mb-2">{step.title}</h3>
              <p className="text-brand-black/60 font-medium max-w-[250px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FeaturesGrid ──────────────────────────────────────────────────────────────

function FeaturesGrid() {
  const features = [
    { title: "AI Survey Builder", desc: "Turn a single prompt into a professional, multi-question survey instantly.", icon: <Sparkles className="w-5 h-5 text-brand-black" />, color: "bg-brand-vanilla" },
    { title: "Conditional Logic", desc: "Show or hide questions based on previous answers for a tailored experience.", icon: <Zap className="w-5 h-5 text-brand-black" />, color: "bg-brand-honeydew" },
    { title: "Real-Time Analytics", desc: "Watch responses roll in with live updating charts and data summaries.", icon: <BarChart2 className="w-5 h-5 text-brand-black" />, color: "bg-brand-blue" },
    { title: "Smart Integrations", desc: "Connect with Slack, Google Sheets, Notion, and your favorite tools.", icon: <Share2 className="w-5 h-5 text-brand-black" />, color: "bg-white" },
    { title: "Response Management", desc: "Filter, tag, and organize incoming responses with intuitive tools.", icon: <MessageSquare className="w-5 h-5 text-brand-black" />, color: "bg-white" },
    { title: "Export & Reporting", desc: "Download raw data or beautifully formatted PDF reports for stakeholders.", icon: <Database className="w-5 h-5 text-brand-black" />, color: "bg-white" },
  ];
  return (
    <section id="features" className="w-full bg-white py-32 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-brand-black mb-6">Everything you need</h2>
          <p className="text-lg text-brand-black/60 font-medium max-w-2xl mx-auto">Powerful features wrapped in a simple, minimalist interface. Built for speed, flexibility, and actionable results.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="p-8 rounded-3xl border border-black/5 hover:shadow-lg hover:border-black/10 transition-all duration-300 cursor-default">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm border border-black/5 ${f.color}`}>{f.icon}</div>
              <h3 className="text-xl font-bold font-display text-brand-black mb-3">{f.title}</h3>
              <p className="text-brand-black/60 font-medium leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── UseCases ──────────────────────────────────────────────────────────────────

function UseCases() {
  const cases = [
    { title: "Product Teams", subtitle: "Validate ideas with user feedback", text: "Ship features your users actually want. Easily collect targeted feedback during beta testing and early access phases." },
    { title: "Marketers", subtitle: "Measure campaign performance", text: "Understand your audience deeply. Run NPS, CSAT, and brand awareness surveys with out-of-the-box templates." },
    { title: "Researchers", subtitle: "Collect & analyze data easily", text: "Built for rigor but designed for simplicity. Handle large datasets and complex logic branching without the headache." },
  ];
  return (
    <section className="w-full bg-white py-32 px-6 border-y border-black/5">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-3xl md:text-5xl font-display font-bold text-brand-black mb-16 text-center">Built for every team</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cases.map((c, i) => (
            <div key={i} className="bg-white p-10 rounded-3xl border border-black/5 shadow-sm">
              <div className="w-10 h-1 bg-brand-black rounded-full mb-8"></div>
              <h3 className="text-2xl font-bold font-display text-brand-black mb-2">{c.title}</h3>
              <div className="text-sm font-semibold text-brand-black/40 mb-4">{c.subtitle}</div>
              <p className="text-brand-black/60 font-medium leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── DiscoverBuildAnalyze ──────────────────────────────────────────────────────

function DiscoverBuildAnalyze() {
  const columns = [
    {
      icon: <Lightbulb className="w-5 h-5" />,
      iconBg: 'bg-[#EEEEED]',
      stage: 'Strategy',
      title: 'Discover',
      pills: [
        { label: 'Ideation Stage', filled: true },
        { label: 'Hypothesis', filled: false },
      ],
    },
    {
      icon: <PenLine className="w-5 h-5" />,
      iconBg: 'bg-[#E5EBD9]',
      stage: 'Creation',
      title: 'Build',
      pills: [
        { label: 'AI Generation', filled: true },
        { label: 'Logic Jump', filled: false },
      ],
    },
    {
      icon: <Star className="w-5 h-5" />,
      iconBg: 'bg-[#EEE9D2]',
      stage: 'Solution',
      title: 'Analyze',
      pills: [
        { label: 'Real-time Data', filled: true },
        { label: 'Reporting', filled: false },
      ],
    },
  ];

  return (
    <section className="w-full bg-brand-ghost">
      {/* Part A: three-column grid — full width, no max-width so columns have room */}
      <div className="w-full border-b border-black/8">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-black/8">
          {columns.map((col, i) => (
            <div key={i} className="py-12 px-8 md:px-10 flex flex-col gap-7 overflow-hidden">
              {/* Icon left, stage label right */}
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-full ${col.iconBg} flex items-center justify-center text-brand-black shrink-0`}>
                  {col.icon}
                </div>
                <span className="text-sm font-medium text-brand-black/35 tracking-wide">{col.stage}</span>
              </div>
              {/* Title — sized to fill the column without overflowing */}
              <h3 className="text-[clamp(1.75rem,3.2vw,3rem)] font-display font-bold text-brand-black leading-none tracking-tight whitespace-nowrap">
                {col.title}
              </h3>
              {/* Pills */}
              <div className="flex flex-wrap gap-2.5">
                {col.pills.map((pill, j) => (
                  <span
                    key={j}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                      pill.filled
                        ? 'border-2 border-brand-black/25 bg-transparent text-brand-black'
                        : 'border border-brand-black/10 text-brand-black/40'
                    }`}
                  >
                    {pill.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Part B: large statement */}
      <div className="border-t border-black/8">
        <div className="max-w-[1400px] mx-auto py-28 px-10 md:px-14 flex flex-col lg:flex-row gap-16 lg:gap-32 items-start">
          {/* Left: huge heading with "feedback" in gray */}
          <h2 className="flex-[3] text-4xl md:text-5xl lg:text-7xl font-display font-bold text-brand-black leading-[1.05] tracking-tight">
            The intelligent<br />way to collect<br />customer{' '}
            <span className="text-brand-black/20">feedback</span>
          </h2>
          {/* Right: accent bar + text + CTA */}
          <div className="flex-[2] flex flex-col gap-6 lg:pt-6">
            <div className="border-l-[3px] border-brand-vanilla pl-8">
              <p className="text-base text-brand-black/55 font-medium leading-relaxed">
                SurveyGo simplifies complex survey creation and delivers rich analytics through our CRM integrations.
              </p>
            </div>
            <Link
              to="/auth"
              className="inline-flex items-center gap-3 text-base font-semibold text-brand-black hover:text-brand-black/70 transition-colors group w-fit"
            >
              Start Design Process
              <div className="w-6 h-6 bg-brand-black rounded-full flex items-center justify-center text-white group-hover:bg-black/80 transition-colors shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthly: number;
  yearlyMonthly: number;
  features: string[];
  popular?: boolean;
  subtitle?: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'For individuals getting started.',
    monthly: 0,
    yearlyMonthly: 0,
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

function Pricing() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section id="pricing" className="w-full bg-brand-ghost py-32 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-brand-black mb-6">Simple, transparent pricing</h2>
          <p className="text-lg text-brand-black/60 font-medium max-w-2xl mx-auto mb-10">Choose the plan that fits your team. Upgrade, downgrade, or cancel anytime.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3">
            <div className="flex items-center bg-brand-ghost border border-black/10 rounded-full p-0.5 shadow-sm">
              {(['monthly', 'yearly'] as const).map(b => (
                <button key={b} onClick={() => setBilling(b)}
                  className={`px-5 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                    billing === b ? 'bg-brand-black text-white' : 'text-brand-black/50 hover:text-brand-black'
                  }`}>{b}</button>
              ))}
            </div>
            <span className="bg-brand-honeydew/60 text-green-700 text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wider">Save ~20%</span>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_TIERS.map(tier => {
            const price = billing === 'monthly' ? tier.monthly : tier.yearlyMonthly;
            const base = 'relative rounded-2xl shadow-sm p-6 flex flex-col gap-5 transition-all';
            const variant = tier.popular
              ? 'bg-brand-vanilla/20 border-2 border-brand-vanilla md:-translate-y-2 shadow-md'
              : 'bg-white border border-black/5';
            const mutedText = 'text-brand-black/40';
            const bodyText = 'text-brand-black/70';
            const ctaClass = tier.popular
              ? 'bg-brand-black text-white hover:bg-black/90'
              : 'bg-brand-ghost text-brand-black border border-black/10 hover:bg-black/5';

            return (
              <div key={tier.id} className={`${base} ${variant}`}>
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

                <Link
                  to="/auth"
                  className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 ${ctaClass}`}
                >
                  Get Started
                </Link>

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
          })}
        </div>
      </div>
    </section>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="w-full min-h-screen bg-brand-ghost text-brand-black selection:bg-brand-blue selection:text-brand-black">
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <ProductPreview />
        <HowItWorks />
        <FeaturesGrid />
        <Pricing />
        <UseCases />
        <DiscoverBuildAnalyze />
      </main>
      <SiteFooter />
    </div>
  );
}
