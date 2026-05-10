import React, { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
import { resetPassword } from '../../lib/auth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setIsSubmitted(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTryAnother = () => {
    setIsSubmitted(false);
    setEmail('');
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-brand-ghost font-sans text-brand-black">
      {/* Left Panel: Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 md:px-16 lg:px-24 bg-white relative min-h-screen md:min-h-0">
        <div className="absolute top-6 left-6 md:top-8 md:left-12">
          <Link to="/auth" className="flex items-center gap-2 text-sm font-medium text-brand-black/60 hover:text-brand-black transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to login</span>
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto mt-8 md:mt-0">
          <div className="mb-8 md:mb-10 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-6 md:mb-8">
              <div className="w-10 h-10 bg-brand-black/5 rounded-xl flex items-center justify-center text-brand-black">
                <KeyRound className="w-5 h-5" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-black mb-3 tracking-tight">
              {isSubmitted ? 'Check your email' : 'Forgot password?'}
            </h1>
            <p className="text-brand-black/60 font-medium text-sm md:text-base">
              {isSubmitted
                ? 'We sent a password reset link to your email address. Please check your inbox and spam folder.'
                : "No worries, we'll send you reset instructions. Enter the email associated with your account."}
            </p>
          </div>

          {!isSubmitted ? (
            <form className="space-y-4 md:space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5 text-left">
                <label className="text-sm font-semibold text-brand-black">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="hello@example.com"
                  className="w-full px-4 py-3 md:py-3.5 rounded-xl border border-black/10 bg-brand-ghost/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-black/5 focus:border-brand-black/20 transition-all font-medium placeholder:text-brand-black/30 text-base"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-black text-white py-3.5 md:py-4 rounded-xl font-semibold text-base hover:bg-black/90 transition-all shadow-lg shadow-black/10 mt-2 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Reset password
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleTryAnother}
                className="w-full bg-white text-brand-black border border-black/10 py-3.5 md:py-4 rounded-xl font-semibold text-base hover:bg-brand-ghost/50 transition-all shadow-sm mt-4 active:scale-[0.98]"
              >
                Try another email
              </button>
            </div>
          )}

          <div className="mt-8 text-center text-sm font-medium text-brand-black/60">
            Remember your password?{' '}
            <Link to="/auth" className="text-brand-black font-semibold hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden md:flex flex-1 bg-brand-black p-12 lg:p-24 flex-col justify-center items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-brand-blue/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-brand-vanilla/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-sm text-center">
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-brand-vanilla rounded-full"></div>
            </div>
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-4">Secure Access</h2>
          <p className="text-white/50 text-base leading-relaxed">
            We employ industry-standard encryption to ensure your data and survey responses remain completely private and secure.
          </p>
        </div>
      </div>
    </div>
  );
}
