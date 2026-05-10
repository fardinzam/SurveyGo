import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';

function Wordmark() {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fit = () => {
      const el = spanRef.current;
      if (!el) return;
      el.style.fontSize = '16px';
      const ratio = document.documentElement.clientWidth / el.scrollWidth;
      el.style.fontSize = Math.floor(16 * ratio) + 'px';
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="overflow-hidden w-full py-12 lg:py-16">
      <span
        ref={spanRef}
        className="block font-display font-bold text-white/10 leading-[0.85] tracking-tight whitespace-nowrap select-none"
      >
        SurveyGo
      </span>
    </div>
  );
}

export function SiteFooter() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Message from ${form.name}`);
    const body = encodeURIComponent(`From: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
    window.location.href = `mailto:hello@surveygo.app?subject=${subject}&body=${body}`;
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = `/#${id}`;
    }
  };

  return (
    <footer className="w-full bg-brand-black text-white overflow-hidden">
      {/* Top section */}
      <div className="max-w-[1200px] mx-auto px-6 pt-14 pb-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: brand + contact form */}
        <div>
          <div className="text-xl font-bold font-display text-white mb-3 flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <div className="w-2 h-2 bg-brand-black rounded-full"></div>
            </div>
            SurveyGo
          </div>
          <p className="text-white/40 text-sm leading-relaxed mb-6 max-w-xs">The intelligent survey builder for modern teams.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-white/10 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="bg-white/10 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
            </div>
            <textarea
              placeholder="Your message"
              rows={3}
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              className="bg-white/10 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
            />
            <button
              type="submit"
              className="w-full bg-white text-brand-black rounded-lg py-2.5 text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Send message
            </button>
          </form>
        </div>

        {/* Right: link columns + wordmark */}
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-white/30 uppercase tracking-wider text-[10px] mb-5">Product</h4>
              <ul className="space-y-3.5 text-sm text-white/50">
                <li><button onClick={() => scrollTo('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollTo('pricing')} className="hover:text-white transition-colors">Pricing</button></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li>
                  <a
                    href="https://github.com/fardinzam/surveygo/commits"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Changelog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white/30 uppercase tracking-wider text-[10px] mb-5">Legal</h4>
              <ul className="space-y-3.5 text-sm text-white/50">
                <li>
                  <a
                    href="https://github.com/fardinzam/surveygo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <Wordmark />
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/5 px-6 py-5">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center text-white/25 text-xs">
          <p>© 2026 SurveyGo Inc. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Designed with minimal perfection.</p>
        </div>
      </div>
    </footer>
  );
}
