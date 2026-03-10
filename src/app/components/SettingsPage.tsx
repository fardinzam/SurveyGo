import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { User, Bell, CreditCard, Loader2, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { updateProfile, updatePassword, deleteAccount } from '../../lib/auth';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useUserPreferences, useUpdateUserPreferences } from '../../hooks/useUserPreferences';
import { DEFAULT_USER_PREFERENCES } from '../../types/survey';
import type { UserPreferences } from '../../types/survey';

interface SettingsPageProps {
  onNavigate: (page: string) => void;
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  usePageTitle('Settings');
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState('account');

  // Profile state
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isGoogleOnly = user?.providerData?.[0]?.providerId === 'google.com';
  const initials = (user?.displayName ?? user?.email ?? '?').slice(0, 2).toUpperCase();

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setProfileMsg(null);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message ?? 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    setPwMsg(null);
    if (newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setChangingPw(true);
    try {
      // Re-authenticate before changing password
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err: any) {
      const msg = err.code === 'auth/wrong-password'
        ? 'Current password is incorrect.'
        : err.message ?? 'Failed to change password.';
      setPwMsg({ type: 'error', text: msg });
    } finally {
      setChangingPw(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'General', icon: User },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <div className="w-64">
          <Card className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${activeTab === tab.id
                      ? 'bg-secondary text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Profile */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">General</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-2xl font-bold text-foreground">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-20 h-20 rounded-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user?.displayName ?? 'User'}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  <Input
                    label="Full Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                  />

                  {profileMsg && (
                    <div className={`flex items-center gap-2 text-sm ${profileMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {profileMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {profileMsg.text}
                    </div>
                  )}

                  <div className="pt-4">
                    <Button variant="primary" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Password — only for email/password users */}
              {!isGoogleOnly && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-6">Password</h2>
                  <div className="space-y-4">
                    <Input
                      label="Current Password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <Input
                      label="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />

                    {pwMsg && (
                      <div className={`flex items-center gap-2 text-sm ${pwMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {pwMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {pwMsg.text}
                      </div>
                    )}

                    <div className="pt-4">
                      <Button variant="primary" onClick={handleChangePassword} disabled={changingPw || !currentPassword || !newPassword}>
                        {changingPw ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Update Password
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {isGoogleOnly && (
                <Card className="p-6 bg-muted">
                  <h2 className="text-xl font-semibold text-foreground mb-2">Password</h2>
                  <p className="text-muted-foreground text-sm">
                    You signed in with Google. Password management is handled through your Google account.
                  </p>
                </Card>
              )}

              {/* Danger Zone */}
              <Card className="p-6 border-2 border-red-100">
                <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
                <p className="text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
                  {deleting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Deleting...</> : 'Delete Account'}
                </Button>
                {deleteError && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {deleteError}
                  </p>
                )}
              </Card>
            </div>
          )}



          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current Plan */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Current Plan</h2>
                <div className="flex items-center justify-between p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-border">
                  <div>
                    <div className="text-lg font-bold text-gray-900">Basic Plan</div>
                    <div className="text-sm text-gray-600 mt-1">Free — Up to 3 surveys, 100 responses each</div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-2"
                    onClick={() => onNavigate('plans')}
                  >
                    Upgrade Plan
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>

              {/* Transaction History */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Transaction History</h2>
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No transactions yet.</p>
                  <p className="text-muted-foreground text-xs mt-1">Your billing history will appear here once you upgrade.</p>
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Payment Method</h2>
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No payment method on file.</p>
                  <p className="text-muted-foreground text-xs mt-1">Add a payment method when you upgrade your plan.</p>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'notifications' && (
            <NotificationsTab />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Account"
        description="This will permanently delete your account, all your surveys, and all associated responses. This action cannot be undone."
        confirmLabel="Delete My Account"
        variant="danger"
        onConfirm={async () => {
          if (!user) return;
          setShowDeleteConfirm(false);
          setDeleting(true);
          setDeleteError(null);
          try {
            await deleteAccount(user);
            window.location.href = '/auth/login';
          } catch (err: any) {
            if (err?.code === 'auth/requires-recent-login') {
              setDeleteError('Please log out and log back in, then try again (recent authentication required).');
            } else {
              setDeleteError(err?.message ?? 'Failed to delete account.');
            }
            setDeleting(false);
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

// ── Notifications Tab (extracted to use hooks at top level) ──
function NotificationsTab() {
  const { data: prefs, isLoading } = useUserPreferences();
  const updatePrefs = useUpdateUserPreferences();

  const notifications = prefs?.notifications ?? DEFAULT_USER_PREFERENCES.notifications;

  const toggle = (key: keyof UserPreferences['notifications']) => {
    const updated: UserPreferences = {
      notifications: { ...notifications, [key]: !notifications[key] },
    };
    updatePrefs.mutate(updated);
  };

  const items: { key: keyof UserPreferences['notifications']; label: string }[] = [
    { key: 'emailNewResponses', label: 'Email notifications for new responses' },
    { key: 'weeklySummary', label: 'Weekly summary report' },
    { key: 'urgentAlerts', label: 'Alert for urgent issues' },
    { key: 'teamActivity', label: 'Team activity updates' },
    { key: 'productUpdates', label: 'Product updates and news' },
  ];

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">Notification Preferences</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-6">Notification Preferences</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <label key={item.key} className="flex items-center justify-between p-4 hover:bg-muted rounded-lg cursor-pointer transition-colors">
            <span className="text-foreground">{item.label}</span>
            <input
              type="checkbox"
              checked={notifications[item.key]}
              onChange={() => toggle(item.key)}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
            />
          </label>
        ))}
      </div>
      {updatePrefs.isError && (
        <p className="text-red-500 text-sm mt-4 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          Failed to save preferences. Please try again.
        </p>
      )}
    </Card>
  );
}
