import React from 'react';
import { Link } from 'react-router';
import { SiteFooter } from './SiteFooter';

function Nav() {
  return (
    <nav className="w-full px-6 py-6 md:px-12 border-b border-black/5">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <Link to="/" className="text-xl font-bold font-display flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-black rounded-md flex items-center justify-center">
            <div className="w-2 h-2 bg-brand-vanilla rounded-full"></div>
          </div>
          SurveyGo
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-sm font-medium text-brand-black/80 hover:text-brand-black transition-colors hidden sm:block">Log in</Link>
          <Link to="/auth" className="bg-brand-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-black/90 transition-colors shadow-sm">Sign up</Link>
        </div>
      </div>
    </nav>
  );
}

export function PrivacyPage() {
  return (
    <div className="w-full min-h-screen bg-white text-brand-black">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-24">
        <p className="text-sm font-bold uppercase tracking-wider text-brand-black/30 mb-4">Legal</p>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-black leading-tight mb-3">Privacy Policy</h1>
        <p className="text-sm text-brand-black/40 mb-12">Last updated: May 9, 2026</p>

        <div className="space-y-10 text-brand-black/70 text-base leading-relaxed font-medium">
          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">1. Information we collect</h2>
            <p>We collect information you provide directly — such as your name, email address, and any survey content you create. We also collect usage data automatically, including log files, device type, browser, and pages visited, to improve the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">2. How we use your information</h2>
            <p>We use your information to operate and improve SurveyGo, send transactional emails (account confirmations, billing receipts), respond to support requests, and analyze usage patterns to guide product decisions. We do not sell your personal data.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">3. Data storage and security</h2>
            <p>Your data is stored on servers provided by Google Firebase, located in the United States. We implement industry-standard security measures, including encryption in transit (TLS) and at rest. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">4. Cookies</h2>
            <p>We use essential cookies to maintain your session and authentication state. We may use analytics cookies (e.g., Google Analytics) to understand aggregate usage. You can disable cookies in your browser settings, though some features may not function correctly.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">5. Third-party services</h2>
            <p>SurveyGo uses third-party services including Stripe (payments), Firebase (authentication and storage), and Google Analytics (usage analytics). These services have their own privacy policies and may process your data independently.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">6. Your rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at <a href="mailto:hello@surveygo.app" className="text-brand-black font-semibold hover:underline">hello@surveygo.app</a>. Account deletion removes your profile and surveys permanently within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">7. Changes to this policy</h2>
            <p>We may update this policy periodically. When we do, we will revise the "Last updated" date at the top of this page. Continued use of SurveyGo after changes constitutes your acceptance of the revised policy.</p>
          </section>

          <div className="pt-8 border-t border-black/8">
            <p className="text-sm text-brand-black/40">
              Questions about this policy?{' '}
              <a href="mailto:hello@surveygo.app" className="text-brand-black font-semibold hover:underline">hello@surveygo.app</a>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
