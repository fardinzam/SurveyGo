import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: "We switched to SurveyGo and saw a 40% increase in response rates. The AI summaries save us hours of manual analysis every week.",
    name: "Sarah Jenkins",
    role: "Head of Product",
    initial: "S",
  },
  {
    quote: "Finally a survey tool that doesn't feel like it's from 2010. Our team onboarded in an afternoon and we shipped our first NPS campaign the same day.",
    name: "Marcus Obi",
    role: "Growth Lead",
    initial: "M",
  },
  {
    quote: "The conditional logic builder is the best I've used. We replaced three separate tools with SurveyGo and cut our research cycle time in half.",
    name: "Priya Nair",
    role: "UX Researcher",
    initial: "P",
  },
];

function TestimonialPanel() {
  const [idx, setIdx] = useState(0);
  const t = TESTIMONIALS[idx];

  useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:flex flex-1 bg-brand-black p-12 lg:p-24 flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-vanilla/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-blue/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 flex items-center gap-2 text-white/50 text-sm font-bold uppercase tracking-wider">
        <Sparkles className="w-4 h-4" />
        SurveyGo Experience
      </div>

      <div className="relative z-10 space-y-8 max-w-lg">
        <blockquote className="text-3xl lg:text-4xl font-display font-bold text-white leading-tight transition-all">
          "{t.quote}"
        </blockquote>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white font-bold text-lg border border-white/10 shadow-sm shrink-0">
            {t.initial}
          </div>
          <div>
            <div className="text-white font-semibold">{t.name}</div>
            <div className="text-white/50 text-sm font-medium">{t.role}</div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex gap-2">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/20'}`}
          />
        ))}
      </div>
    </div>
  );
}
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  setAuthPersistence,
} from '../../lib/auth';

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchMode = () => {
    setIsLogin(v => !v);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await setAuthPersistence(rememberMe);
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name.trim() || undefined);
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(getAuthErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-brand-ghost font-sans text-brand-black">
      {/* Left Panel: Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 md:px-16 lg:px-24 bg-white relative min-h-screen md:min-h-0">
        <div className="absolute top-6 left-6 md:top-8 md:left-12">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-brand-black/60 hover:text-brand-black transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto mt-8 md:mt-0">
          <div className="mb-8 md:mb-10 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-8">
              <div className="w-8 h-8 bg-brand-black rounded-lg flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-brand-vanilla rounded-full"></div>
              </div>
              <span className="text-2xl font-bold font-display tracking-tight">SurveyGo</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-black mb-3 tracking-tight">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-brand-black/60 font-medium text-base">
              {isLogin
                ? 'Enter your details to access your dashboard.'
                : 'Start building smarter surveys today, for free.'}
            </p>
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-black/10 bg-white py-3.5 rounded-xl font-semibold text-sm hover:bg-brand-ghost/50 transition-all shadow-sm disabled:opacity-60 mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <hr className="flex-1 border-black/10" />
            <span className="text-xs text-brand-black/40 font-medium">or</span>
            <hr className="flex-1 border-black/10" />
          </div>

          <form className="space-y-4 md:space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="space-y-1.5 text-left">
                <label className="text-sm font-semibold text-brand-black">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-3 md:py-3.5 rounded-xl border border-black/10 bg-brand-ghost/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-black/5 focus:border-brand-black/20 transition-all font-medium placeholder:text-brand-black/30 text-base"
                />
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="text-sm font-semibold text-brand-black">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="hello@example.com"
                required
                className="w-full px-4 py-3 md:py-3.5 rounded-xl border border-black/10 bg-brand-ghost/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-black/5 focus:border-brand-black/20 transition-all font-medium placeholder:text-brand-black/30 text-base"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-brand-black">Password</label>
                {isLogin && (
                  <Link to="/forgot-password" className="text-sm font-semibold text-brand-black/60 hover:text-brand-black transition-colors">
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 md:py-3.5 rounded-xl border border-black/10 bg-brand-ghost/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-black/5 focus:border-brand-black/20 transition-all font-medium placeholder:text-brand-black/30 text-base"
              />
            </div>

            {!isLogin && (
              <div className="space-y-1.5 text-left">
                <label className="text-sm font-semibold text-brand-black">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 md:py-3.5 rounded-xl border border-black/10 bg-brand-ghost/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-black/5 focus:border-brand-black/20 transition-all font-medium placeholder:text-brand-black/30 text-base"
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center gap-2 pt-1 justify-center md:justify-start">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-black/20 accent-brand-black"
                />
                <label htmlFor="remember" className="text-sm font-medium text-brand-black/70 cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm font-medium text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-black text-white py-3.5 md:py-4 rounded-xl font-semibold text-base hover:bg-black/90 transition-all shadow-lg shadow-black/10 mt-2 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-brand-black/60">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={switchMode}
              className="text-brand-black font-semibold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>

      <TestimonialPanel />
    </div>
  );
}
