import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { X, User as UserIcon, Bell, CreditCard, Loader2, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useUserPreferences, useUpdateUserPreferences } from '../../hooks/useUserPreferences';
import { updateProfile, updatePassword, deleteAccount } from '../../lib/auth';
import { callCreateCheckoutSession, callCreatePortalSession } from '../../lib/functions';
import { DEFAULT_USER_PREFERENCES, type UserPreferences, type SurveyUpdateFrequency } from '../../types/survey';
import { PLAN_LIMITS, type PlanId } from '../../lib/planLimits';
import { ConfirmDialog } from '../../components/ConfirmDialog';

type Section = 'profile' | 'notifications' | 'billing';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialSection?: Section;
}

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'profile',       label: 'Profile',            icon: UserIcon },
  { id: 'notifications', label: 'Notifications',      icon: Bell },
  { id: 'billing',       label: 'Plans & Billing',    icon: CreditCard },
];

export function SettingsModal({ open, onClose, initialSection = 'profile' }: SettingsModalProps) {
  const [section, setSection] = useState<Section>(initialSection);

  useEffect(() => {
    if (open) setSection(initialSection);
  }, [open, initialSection]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <aside className="w-full md:w-56 bg-brand-ghost/40 border-b md:border-b-0 md:border-r border-black/5 p-4 shrink-0">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-base font-semibold text-brand-black">Settings</h2>
            <button onClick={onClose} className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-brand-black/40 hover:text-brand-black hover:bg-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <nav className="space-y-1">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                    section === s.id
                      ? 'bg-white text-brand-black shadow-sm'
                      : 'text-brand-black/60 hover:bg-white/60 hover:text-brand-black'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 shrink-0">
            <h3 className="text-sm font-semibold text-brand-black">{SECTIONS.find(s => s.id === section)?.label}</h3>
            <button onClick={onClose} className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-brand-black/40 hover:text-brand-black hover:bg-brand-ghost transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-minimal p-6">
            {section === 'profile' && <ProfileSection />}
            {section === 'notifications' && <NotificationsSection />}
            {section === 'billing' && <BillingSection onClose={onClose} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile ──────────────────────────────────────────────────────────────────

function ProfileSection() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [editingName, setEditingName] = useState(false);
  const [photoURL, setPhotoURL] = useState(user?.photoURL ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const isPasswordProvider = !!user?.providerData?.some(p => p.providerId === 'password');

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    setPhotoURL(user?.photoURL ?? '');
  }, [user?.displayName, user?.photoURL]);

  const handleSaveName = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: displayName.trim(), photoURL: photoURL.trim() });
      toast.success('Profile updated');
      setEditingName(false);
    } catch {
      toast.error('Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!user || savingPassword) return;
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPassword(true);
    try {
      await updatePassword(user, newPassword);
      toast.success('Password updated');
      setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/requires-recent-login') toast.error('Please log out and back in, then try again.');
      else toast.error('Could not update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (!user || deleting) return;
    setDeleting(true);
    try {
      await deleteAccount(user);
      toast.success('Account deleted');
      navigate('/', { replace: true });
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/requires-recent-login') toast.error('Please log out and back in, then try again.');
      else toast.error('Could not delete account');
    } finally {
      setDeleting(false); setConfirmDelete(false);
    }
  };

  const createdAt = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const initials = (() => {
    const source = displayName.trim() || user?.email?.split('@')[0] || '';
    if (!source) return 'U';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  })();

  return (
    <div className="space-y-8 max-w-lg">
      <ConfirmDialog
        open={confirmDelete}
        title="Delete account permanently?"
        description="This will delete your profile, all your surveys, and all responses. You won't be able to recover any of it."
        confirmLabel={deleting ? 'Deleting...' : 'Yes, delete everything'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* ─── Profile ─── */}
      <div>
        <SectionHeader title="Profile" />
        <div className="flex items-center gap-4 mt-3">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full object-cover border border-black/5" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-vanilla flex items-center justify-center text-brand-black font-bold text-xl border border-black/5">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="flex-1 bg-brand-ghost border border-black/5 rounded-lg px-3 py-1.5 text-sm outline-none focus:bg-white focus:border-brand-black/20"
                />
                <button onClick={handleSaveName} disabled={saving} className="px-3 py-1.5 bg-brand-black text-white rounded-lg text-xs font-semibold disabled:opacity-60">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                </button>
                <button onClick={() => { setEditingName(false); setDisplayName(user?.displayName ?? ''); }} className="text-xs text-brand-black/50">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="text-left group">
                <p className="text-base font-semibold text-brand-black group-hover:underline">{displayName || 'Set your name'}</p>
              </button>
            )}
            {createdAt && <p className="text-xs text-brand-black/40 mt-0.5">Member since {createdAt}</p>}
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs font-semibold text-brand-black/50 uppercase tracking-wide block mb-1">Photo URL</label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-brand-ghost border border-black/5 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-brand-black/20"
            />
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="px-3 py-2 bg-brand-black text-white rounded-lg text-xs font-semibold disabled:opacity-60"
            >
              Update
            </button>
          </div>
        </div>
      </div>

      {/* ─── Login details ─── */}
      <div>
        <SectionHeader title="Login details" />
        <div className="mt-3 space-y-3">
          <Field label="Email">
            <input type="email" value={user?.email ?? ''} disabled className="w-full bg-brand-ghost/60 border border-black/5 rounded-lg px-3 py-2 text-sm outline-none text-brand-black/60" />
          </Field>
          <Field label="Sign-in method">
            <p className="text-sm text-brand-black/70 capitalize">{user?.providerData?.[0]?.providerId === 'password' ? 'Email & Password' : user?.providerData?.[0]?.providerId ?? 'Unknown'}</p>
          </Field>
          {isPasswordProvider && (
            <>
              <Field label="New password">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-brand-ghost border border-black/5 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-brand-black/20" />
              </Field>
              <Field label="Confirm new password">
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-brand-ghost border border-black/5 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-brand-black/20" />
              </Field>
              <button onClick={handleSavePassword} disabled={savingPassword || !newPassword}
                className="px-4 py-2 bg-brand-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 transition-colors disabled:opacity-60 flex items-center gap-2">
                {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                Update password
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── Delete account ─── */}
      <div>
        <SectionHeader title="Delete account" />
        <p className="text-sm text-brand-black/60 mt-2">
          Permanently delete your account and all surveys, responses, and data. This action cannot be undone.
        </p>
        <button
          onClick={() => setConfirmDelete(true)}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          Delete my account
        </button>
      </div>
    </div>
  );
}

// ── Notifications ────────────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function NotificationsSection() {
  const { data: prefs = DEFAULT_USER_PREFERENCES } = useUserPreferences();
  const updateMut = useUpdateUserPreferences();
  const [local, setLocal] = useState<UserPreferences>(prefs);

  useEffect(() => { setLocal(prefs); }, [prefs]);

  const su = local.notifications.surveyUpdates;
  const setSurveyUpdates = (updates: Partial<typeof su>) => {
    setLocal(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        surveyUpdates: { ...prev.notifications.surveyUpdates, ...updates },
      },
    }));
  };

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync(local);
      toast.success('Preferences saved');
    } catch {
      toast.error('Could not save preferences');
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Survey updates */}
      <div>
        <SectionHeader title="Survey updates" />
        <p className="text-xs text-brand-black/50 mt-1 mb-3">Get notified about new responses and survey activity.</p>

        <ToggleRow label="Enable survey update emails" checked={su.enabled} onChange={(v) => setSurveyUpdates({ enabled: v })} />

        {su.enabled && (
          <div className="ml-6 mt-3 space-y-3">
            <Field label="Frequency">
              <div className="flex items-center gap-2 flex-wrap">
                {(['hourly', 'daily', 'weekly', 'monthly'] as SurveyUpdateFrequency[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setSurveyUpdates({ frequency: f })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      su.frequency === f ? 'bg-brand-black text-white' : 'bg-brand-ghost text-brand-black/60 hover:text-brand-black'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </Field>

            {su.frequency === 'hourly' && (
              <Field label="Every how many hours?">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={su.hourlyInterval}
                    onChange={(e) => setSurveyUpdates({ hourlyInterval: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) })}
                    className="w-20 bg-brand-ghost border border-black/5 rounded-lg px-3 py-1.5 text-sm outline-none focus:bg-white focus:border-brand-black/20"
                  />
                  <span className="text-xs text-brand-black/50">hour{su.hourlyInterval === 1 ? '' : 's'}</span>
                </div>
              </Field>
            )}

            {su.frequency === 'weekly' && (
              <Field label="Which day?">
                <div className="relative">
                  <select
                    value={su.weeklyDay}
                    onChange={(e) => setSurveyUpdates({ weeklyDay: parseInt(e.target.value) })}
                    className="w-full appearance-none bg-brand-ghost border border-black/5 rounded-lg py-2 pl-3 pr-8 text-sm outline-none"
                  >
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-black/40 pointer-events-none" />
                </div>
              </Field>
            )}

            {su.frequency === 'monthly' && (
              <Field label="Which day of the month?">
                <div className="relative">
                  <select
                    value={su.monthlyDay}
                    onChange={(e) => setSurveyUpdates({ monthlyDay: parseInt(e.target.value) })}
                    className="w-full appearance-none bg-brand-ghost border border-black/5 rounded-lg py-2 pl-3 pr-8 text-sm outline-none"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-black/40 pointer-events-none" />
                </div>
              </Field>
            )}
          </div>
        )}
      </div>

      {/* Product updates */}
      <div>
        <SectionHeader title="Product updates" />
        <p className="text-xs text-brand-black/50 mt-1 mb-3">New features and improvements from SurveyGo.</p>
        <ToggleRow label="Receive product update emails" checked={local.notifications.productUpdates}
          onChange={(v) => setLocal(prev => ({ ...prev, notifications: { ...prev.notifications, productUpdates: v } }))} />
      </div>

      {/* Promotional */}
      <div>
        <SectionHeader title="Promotional announcements" />
        <p className="text-xs text-brand-black/50 mt-1 mb-3">Special offers, discounts, and partnership announcements.</p>
        <ToggleRow label="Receive promotional emails" checked={local.notifications.promotionalAnnouncements}
          onChange={(v) => setLocal(prev => ({ ...prev, notifications: { ...prev.notifications, promotionalAnnouncements: v } }))} />
      </div>

      <button
        onClick={handleSave}
        disabled={updateMut.isPending}
        className="px-4 py-2 bg-brand-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 transition-colors disabled:opacity-60 flex items-center gap-2"
      >
        {updateMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Save preferences
      </button>
    </div>
  );
}

// ── Plans & Billing ──────────────────────────────────────────────────────────

const PLAN_DISPLAY: Record<PlanId, { name: string; features: string[] }> = {
  basic: {
    name: 'Basic (Free)',
    features: ['Up to 3 surveys', '100 responses per survey', 'Up to 5 questions', 'Core question types', 'SurveyGo branding'],
  },
  standard: {
    name: 'Standard ($19/mo)',
    features: ['Unlimited surveys', '1,000 responses per survey', 'AI generation (10/mo)', 'Branching & custom themes', 'CSV/Excel export', 'Email invitations'],
  },
  professional: {
    name: 'Professional ($99/mo)',
    features: ['Everything in Standard', 'Unlimited responses & AI', 'AI sentiment analysis', 'All integrations', 'Priority support'],
  },
};

function BillingSection({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { plan, status, currentPeriodEnd, stripeCustomerId, cancelAtPeriodEnd } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const planInfo = PLAN_DISPLAY[plan as PlanId] ?? PLAN_DISPLAY.basic;

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await callCreatePortalSession();
      window.location.href = res.data.url;
    } catch {
      toast.error('Could not open billing portal');
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-lg">
      {/* Section 1: Current plan */}
      <div>
        <SectionHeader title="Current plan" />
        <div className="bg-brand-ghost rounded-xl p-4 mt-3">
          <p className="text-lg font-semibold text-brand-black">{planInfo.name}</p>
          {status && <p className="text-xs text-brand-black/50 mt-1 capitalize">Status: {status}</p>}
          {cancelAtPeriodEnd && currentPeriodEnd && (
            <p className="text-xs text-red-600 mt-1">Cancels on {currentPeriodEnd.toLocaleDateString()}</p>
          )}
          {!cancelAtPeriodEnd && currentPeriodEnd && (
            <p className="text-xs text-brand-black/50 mt-1">Renews {currentPeriodEnd.toLocaleDateString()}</p>
          )}
          <div className="mt-3 space-y-1">
            {planInfo.features.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-brand-black/70">
                <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {plan === 'basic' ? (
            <button onClick={() => { onClose(); navigate('/dashboard/pricing'); }} className="px-4 py-2 bg-brand-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 transition-colors">
              Upgrade plan
            </button>
          ) : (
            <>
              <button onClick={() => { onClose(); navigate('/dashboard/pricing'); }} className="px-4 py-2 bg-brand-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 transition-colors">
                Change plan
              </button>
              <button onClick={handlePortal} disabled={portalLoading}
                className="px-4 py-2 bg-brand-ghost border border-black/10 text-brand-black rounded-lg text-sm font-semibold hover:bg-white transition-colors disabled:opacity-60 flex items-center gap-2">
                {portalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Cancel subscription
              </button>
            </>
          )}
        </div>
      </div>

      {/* Section 2: Payment methods */}
      <div>
        <SectionHeader title="Payment methods" />
        {stripeCustomerId ? (
          <div className="mt-3">
            <p className="text-sm text-brand-black/60 mb-3">Manage your payment methods via the billing portal.</p>
            <button onClick={handlePortal} disabled={portalLoading}
              className="px-4 py-2 bg-brand-ghost border border-black/10 text-brand-black rounded-lg text-sm font-semibold hover:bg-white transition-colors disabled:opacity-60 flex items-center gap-2">
              {portalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Manage payment methods
            </button>
          </div>
        ) : (
          <p className="text-sm text-brand-black/50 mt-3">No payment method on file. Upgrade to add one.</p>
        )}
      </div>

      {/* Section 3: Transaction history */}
      <div>
        <SectionHeader title="Transaction history" />
        {stripeCustomerId ? (
          <div className="mt-3">
            <p className="text-sm text-brand-black/60 mb-3">View invoices and past payments in the billing portal.</p>
            <button onClick={handlePortal} disabled={portalLoading}
              className="px-4 py-2 bg-brand-ghost border border-black/10 text-brand-black rounded-lg text-sm font-semibold hover:bg-white transition-colors disabled:opacity-60 flex items-center gap-2">
              {portalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              View transaction history
            </button>
          </div>
        ) : (
          <p className="text-sm text-brand-black/50 mt-3">No transactions yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <>
      <h4 className="text-sm font-semibold text-brand-black">{title}</h4>
      <div className="h-px bg-black/5 mt-2" />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-brand-black/50 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
      <span className="text-sm font-medium text-brand-black">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full p-1 transition-colors shrink-0 ${checked ? 'bg-brand-black' : 'bg-black/10'}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}
