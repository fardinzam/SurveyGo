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

export function TermsPage() {
  return (
    <div className="w-full min-h-screen bg-white text-brand-black">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-24">
        <p className="text-sm font-bold uppercase tracking-wider text-brand-black/30 mb-4">Legal</p>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-black leading-tight mb-3">Terms of Service</h1>
        <p className="text-sm text-brand-black/40 mb-12">Last updated: May 9, 2026</p>

        <div className="space-y-10 text-brand-black/70 text-base leading-relaxed font-medium">
          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">1. Acceptance of terms</h2>
            <p>By accessing or using SurveyGo, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service. We reserve the right to update these terms at any time, with notice provided via email or in-app notification.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">2. Use of the service</h2>
            <p>You may use SurveyGo only for lawful purposes and in accordance with these terms. You agree not to use the service to collect data without respondent consent, send spam or unsolicited communications, violate any applicable law or regulation, or attempt to gain unauthorized access to any part of the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">3. Your account</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. Notify us immediately at <a href="mailto:hello@surveygo.app" className="text-brand-black font-semibold hover:underline">hello@surveygo.app</a> if you believe your account has been compromised.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">4. Content and data</h2>
            <p>You retain ownership of all survey content and response data you create. By using SurveyGo, you grant us a limited license to store and process that content solely to provide the service. You are solely responsible for ensuring your surveys comply with applicable data protection laws.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">5. Billing and payments</h2>
            <p>Paid plans are billed in advance on a monthly or annual basis. Subscriptions automatically renew unless cancelled before the renewal date. Refunds are provided at our discretion; please contact support within 7 days of a charge if you believe an error has occurred. Payments are processed securely by Stripe.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">6. Disclaimer of warranties</h2>
            <p>SurveyGo is provided "as is" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of harmful components. Your use of the service is at your sole risk.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">7. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, SurveyGo and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service, even if we have been advised of the possibility of such damages.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-brand-black mb-3">8. Governing law</h2>
            <p>These terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.</p>
          </section>

          <div className="pt-8 border-t border-black/8">
            <p className="text-sm text-brand-black/40">
              Questions about these terms?{' '}
              <a href="mailto:hello@surveygo.app" className="text-brand-black font-semibold hover:underline">hello@surveygo.app</a>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
