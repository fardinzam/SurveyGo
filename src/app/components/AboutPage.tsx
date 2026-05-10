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

export function AboutPage() {
  return (
    <div className="w-full min-h-screen bg-white text-brand-black">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-24">
        <p className="text-sm font-bold uppercase tracking-wider text-brand-black/30 mb-4">About</p>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-black leading-tight mb-8">
          Built for teams who care about feedback
        </h1>
        <div className="prose prose-neutral max-w-none space-y-6 text-brand-black/70 text-base leading-relaxed font-medium">
          <p>
            SurveyGo was created with a simple belief: collecting and understanding feedback should be effortless.
            Too many teams spend hours building surveys, only to receive data they can't act on. We set out to fix that.
          </p>
          <p>
            Our platform combines an intuitive no-code builder with AI-powered generation and analytics, so you can go
            from idea to insight in minutes. Whether you're validating a product hypothesis, measuring customer satisfaction,
            or running academic research, SurveyGo meets you where you are.
          </p>
          <h2 className="text-2xl font-display font-bold text-brand-black mt-12 mb-4">Our mission</h2>
          <p>
            To make structured feedback a natural part of how every team makes decisions — not an afterthought.
            We believe great products are built on real conversations with real people.
          </p>
          <h2 className="text-2xl font-display font-bold text-brand-black mt-12 mb-4">The team</h2>
          <p>
            SurveyGo is an independent product built by a small team of designers and engineers passionate about
            developer experience, minimal design, and tools that get out of your way.
          </p>
          <div className="mt-12 pt-8 border-t border-black/8">
            <p className="text-sm text-brand-black/40">
              Questions or partnership inquiries?{' '}
              <a href="mailto:hello@surveygo.app" className="text-brand-black font-semibold hover:underline">hello@surveygo.app</a>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
