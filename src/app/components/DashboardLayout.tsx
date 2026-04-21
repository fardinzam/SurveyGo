import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  Bell,
  Search,
  Home,
  LayoutTemplate,
  Plus,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowUp,
  Palette,
  Settings,
  LogOut,
  UserPlus,
  Check,
  Pencil,
  Sun,
  Moon,
  Monitor,
  Clock,
  Inbox,
  X,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { signOut } from '../../lib/auth';
import { useSurveys } from '../../hooks/useSurveys';
import type { SurveyClient } from '../../types/survey';
import { SettingsModal } from './SettingsModal';

type NotifTab = 'all' | 'requests' | 'unread';
type ThemeMode = 'light' | 'dark' | 'system';
type SettingsSection = 'profile' | 'notifications' | 'billing';

function useClickOutside(ref: React.RefObject<HTMLElement | null>, callback: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) callback();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, callback]);
}

function useEscapeKey(active: boolean, callback: () => void) {
  useEffect(() => {
    if (!active) return;
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') callback(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active, callback]);
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  const source = name?.trim() || email?.split('@')[0] || '';
  if (!source) return 'U';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

// ── Shared Profile Dropdown ─────────────────────────────────────────────────
export function ProfileDropdown({ align = 'left', onOpenSettings }: { align?: 'left' | 'right'; onOpenSettings?: (section: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [themeHovered, setThemeHovered] = useState(false);
  const { theme, setTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useClickOutside(ref, () => { setIsOpen(false); setThemeHovered(false); });
  useEscapeKey(isOpen, useCallback(() => { setIsOpen(false); setThemeHovered(false); }, []));

  const initials = getInitials(user?.displayName, user?.email);
  const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'User';

  const handleLogout = async () => {
    try { await signOut(); navigate('/', { replace: true }); }
    catch { toast.error('Could not sign out.'); }
  };

  const openSettings = (section: string) => {
    setIsOpen(false);
    onOpenSettings?.(section);
  };

  const themeOptions: { value: string; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System theme', icon: Monitor },
  ];

  const AvatarSm = user?.photoURL
    ? <img src={user.photoURL} alt={displayName} className="w-7 h-7 rounded-full object-cover border border-black/5 shrink-0" />
    : <div className="w-7 h-7 rounded-full bg-brand-vanilla flex items-center justify-center text-brand-black font-bold text-xs border border-black/5 shrink-0">{initials}</div>;
  const AvatarLg = user?.photoURL
    ? <img src={user.photoURL} alt={displayName} className="w-14 h-14 rounded-full object-cover border border-black/5" />
    : <div className="w-14 h-14 rounded-full bg-brand-vanilla flex items-center justify-center text-brand-black font-bold text-xl border border-black/5">{initials}</div>;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setIsOpen(o => !o)}
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isOpen ? 'ring-2 ring-brand-vanilla/60' : 'hover:ring-2 hover:ring-black/5'}`}>
        {AvatarSm}
      </button>
      {isOpen && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-black/5 z-50 py-2`}>
          <div className="px-4 pt-3 pb-3 flex flex-col items-center text-center border-b border-black/5">
            <div className="relative mb-2">
              {AvatarLg}
              <button onClick={() => openSettings('profile')} className="absolute bottom-0 right-0 w-5 h-5 bg-white border border-black/10 rounded-full flex items-center justify-center shadow-sm">
                <Pencil className="w-2.5 h-2.5 text-brand-black/60" />
              </button>
            </div>
            <p className="font-semibold text-sm text-brand-black">{displayName}</p>
            <p className="text-xs text-brand-black/50 mt-0.5 truncate max-w-full">{user?.email}</p>
          </div>
          <div className="py-1 relative">
            <div className="relative" onMouseEnter={() => setThemeHovered(true)} onMouseLeave={() => setThemeHovered(false)}>
              <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-brand-black/80 hover:bg-brand-ghost transition-colors">
                <Palette className="w-4 h-4 text-brand-black/50 shrink-0" /><span className="flex-1 text-left">Theme</span><ChevronRight className="w-3.5 h-3.5 text-brand-black/40" />
              </button>
              {themeHovered && (
                <div className={`absolute ${align === 'right' ? 'right-full mr-1' : 'left-full ml-1'} top-0 w-44 bg-white rounded-xl shadow-lg border border-black/5 py-1 z-10`}>
                  {themeOptions.map(opt => {
                    const Icon = opt.icon;
                    return (<button key={opt.value} onClick={() => setTheme(opt.value)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-brand-black/80 hover:bg-brand-ghost transition-colors">
                      {theme === opt.value ? <Check className="w-3.5 h-3.5 text-brand-black shrink-0" /> : <span className="w-3.5 shrink-0" />}
                      <Icon className="w-3.5 h-3.5 text-brand-black/50 shrink-0" />{opt.label}
                    </button>);
                  })}
                </div>
              )}
            </div>
            <button onClick={() => openSettings('profile')} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-brand-black/80 hover:bg-brand-ghost transition-colors">
              <Settings className="w-4 h-4 text-brand-black/50 shrink-0" />Settings
            </button>
          </div>
          <div className="h-px bg-black/5 mx-2" />
          <div className="py-1">
            <p className="px-4 py-1.5 text-xs font-semibold text-brand-black/40">Switch account</p>
            <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-brand-ghost transition-colors">
              {AvatarSm}
              <div className="flex-1 min-w-0 text-left"><p className="text-sm font-medium text-brand-black truncate">{displayName}</p><p className="text-xs text-brand-black/50 truncate">{user?.email}</p></div>
              <Check className="w-3.5 h-3.5 text-brand-black/60 shrink-0" />
            </button>
            <button onClick={() => { setIsOpen(false); toast.info('Add account coming soon'); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-brand-black/70 hover:bg-brand-ghost transition-colors">
              <UserPlus className="w-4 h-4 text-brand-black/50 shrink-0" />Add account
            </button>
          </div>
          <div className="h-px bg-black/5 mx-2" />
          <div className="py-1">
            <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-brand-black/80 hover:bg-brand-ghost transition-colors">
              <LogOut className="w-4 h-4 text-brand-black/50 shrink-0" />Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// ── Search Modal ─────────────────────────────────────────────────────────────

function SearchModal({ onClose, surveys }: { onClose: () => void; surveys: SurveyClient[] }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useClickOutside(modalRef, onClose);
  useEscapeKey(true, onClose);

  const filtered = query
    ? surveys.filter(s => s.title.toLowerCase().includes(query.toLowerCase()))
    : surveys.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] flex items-start justify-center pt-24 px-4">
      <div ref={modalRef} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-black/5 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/5">
          <Search className="w-4 h-4 text-brand-blue shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search surveys..."
            className="flex-1 outline-none text-sm font-medium text-brand-black placeholder:text-brand-black/30 bg-transparent"
            style={{ boxShadow: 'none' }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-brand-black/30 hover:text-brand-black transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="py-2">
            <p className="px-4 py-2 text-xs font-semibold text-brand-black/40">
              {query ? 'Results' : 'Recent'}
            </p>
            {filtered.map(s => (
              <Link
                key={s.id}
                to={`/builder/${s.id}`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-ghost transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9b51e0] to-[#7f3db5] flex items-center justify-center text-white shrink-0">
                  <Inbox className="w-4 h-4 opacity-80" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-black truncate">{s.title || 'Untitled'}</p>
                  <p className="text-xs text-brand-black/40 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Edited {timeAgo(s.updatedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {query && filtered.length === 0 && (
          <p className="text-center text-sm text-brand-black/40 py-8">No surveys found for &ldquo;{query}&rdquo;</p>
        )}
        {!query && filtered.length === 0 && (
          <p className="text-center text-sm text-brand-black/40 py-8">No surveys yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}

// ── Notification Helpers ─────────────────────────────────────────────────────

type Notification = {
  id: string;
  avatar: string;
  avatarBg: string;
  title: string;
  action: string;
  date: string;
  group: string;
  isUnread: boolean;
  href?: string;
};

function useDerivedNotifications(surveys: SurveyClient[]): Notification[] {
  return useMemo(() => {
    const items: Notification[] = [];
    const now = Date.now();
    const dayMs = 86_400_000;

    for (const s of surveys) {
      const updatedMs = s.updatedAt.getTime();
      const ageDays = Math.floor((now - updatedMs) / dayMs);
      const group = ageDays < 1 ? 'Today' : ageDays < 2 ? 'Yesterday' : 'Older';
      const unread = s.responseCount > (s.lastReadResponseCount ?? 0);

      if (s.responseCount > 0) {
        items.push({
          id: `${s.id}-responses`,
          avatar: 'R',
          avatarBg: 'bg-brand-honeydew',
          title: s.title || 'Untitled survey',
          action: unread
            ? `${s.responseCount - (s.lastReadResponseCount ?? 0)} new response${
                s.responseCount - (s.lastReadResponseCount ?? 0) === 1 ? '' : 's'
              }`
            : `${s.responseCount} total response${s.responseCount === 1 ? '' : 's'}`,
          date: timeAgo(s.updatedAt),
          group,
          isUnread: unread,
          href: `/builder/${s.id}?tab=results`,
        });
      }

      if (s.status === 'active' && s.publishedAt) {
        const pubAgeDays = Math.floor((now - s.publishedAt.getTime()) / dayMs);
        const pubGroup = pubAgeDays < 1 ? 'Today' : pubAgeDays < 2 ? 'Yesterday' : 'Older';
        items.push({
          id: `${s.id}-published`,
          avatar: 'P',
          avatarBg: 'bg-brand-vanilla',
          title: s.title || 'Untitled survey',
          action: 'Published and ready for responses',
          date: timeAgo(s.publishedAt),
          group: pubGroup,
          isUnread: false,
          href: `/builder/${s.id}?tab=share`,
        });
      }
    }

    return items.sort((a, b) => {
      const order: Record<string, number> = { Today: 0, Yesterday: 1, Older: 2 };
      return (order[a.group] ?? 3) - (order[b.group] ?? 3);
    });
  }, [surveys]);
}

// ── Main Layout ──────────────────────────────────────────────────────────────

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection | null>(null);
  const [notifTab, setNotifTab] = useState<NotifTab>('all');
  const [themeHovered, setThemeHovered] = useState(false);
  const { theme, setTheme } = useTheme();

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useAuthContext();
  const { data: surveys = [] } = useSurveys();
  const notifications = useDerivedNotifications(surveys);

  useClickOutside(notifRef, () => setIsNotifOpen(false));
  useClickOutside(profileRef, () => { setIsProfileOpen(false); setThemeHovered(false); });
  useEscapeKey(isNotifOpen, useCallback(() => setIsNotifOpen(false), []));
  useEscapeKey(isProfileOpen, useCallback(() => { setIsProfileOpen(false); setThemeHovered(false); }, []));

  const unreadCount = notifications.filter(n => n.isUnread).length;
  const visibleNotifs = notifTab === 'unread'
    ? notifications.filter(n => n.isUnread)
    : notifTab === 'requests' ? [] : notifications;

  const notifGroups = ['Today', 'Yesterday', 'Older'];

  const themeOptions: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System theme', icon: Monitor },
  ];

  const navItems = [
    { name: 'Home', icon: Home, path: '/dashboard' },
    { name: 'Templates', icon: LayoutTemplate, path: '/dashboard/create#templates' },
  ];

  const initials = getInitials(user?.displayName, user?.email);
  const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'User';

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch {
      toast.error('Could not sign out. Please try again.');
    }
  };

  const openSettings = (section: SettingsSection) => {
    setSettingsSection(section);
    setIsProfileOpen(false);
    setIsNotifOpen(false);
  };

  const AvatarSmall = user?.photoURL ? (
    <img src={user.photoURL} alt={displayName} className="w-7 h-7 rounded-full object-cover border border-black/5 shrink-0" />
  ) : (
    <div className="w-7 h-7 rounded-full bg-brand-vanilla flex items-center justify-center text-brand-black font-bold text-xs border border-black/5 shrink-0">
      {initials}
    </div>
  );

  const AvatarLarge = user?.photoURL ? (
    <img src={user.photoURL} alt={displayName} className="w-14 h-14 rounded-full object-cover border border-black/5" />
  ) : (
    <div className="w-14 h-14 rounded-full bg-brand-vanilla flex items-center justify-center text-brand-black font-bold text-lg border border-black/5">
      {initials}
    </div>
  );

  return (
    <div className="flex h-screen bg-brand-ghost font-sans text-brand-black overflow-hidden selection:bg-brand-blue selection:text-brand-black">
      {isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} surveys={surveys} />}
      <SettingsModal
        open={!!settingsSection}
        onClose={() => setSettingsSection(null)}
        initialSection={settingsSection ?? 'profile'}
      />

      {/* Sidebar */}
      <aside
        className={`relative bg-white border-r border-black/5 transition-all duration-300 ease-in-out flex flex-col ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-8 w-7 h-7 bg-white border border-black/5 rounded-full flex items-center justify-center text-brand-black/40 hover:text-brand-black hover:shadow-sm transition-all z-10"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <div className={`px-4 pt-5 pb-4 flex items-center ${isCollapsed ? 'justify-center flex-col gap-3' : 'justify-between'}`}>
          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => { setIsProfileOpen(o => !o); setIsNotifOpen(false); }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                isProfileOpen ? 'bg-brand-ghost' : 'hover:bg-brand-ghost/60'
              }`}
            >
              {AvatarSmall}
              {!isCollapsed && (
                <>
                  <span className="font-semibold text-sm truncate max-w-[100px]">{displayName}</span>
                  <ChevronDown className={`w-3 h-3 text-brand-black/40 transition-transform shrink-0 ${isProfileOpen ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-black/5 z-50 py-2">
                {/* User card */}
                <div className="px-4 pt-3 pb-3 flex flex-col items-center text-center border-b border-black/5">
                  <div className="relative mb-2">
                    {AvatarLarge}
                    <button
                      onClick={() => openSettings('profile')}
                      className="absolute bottom-0 right-0 w-5 h-5 bg-white border border-black/10 rounded-full flex items-center justify-center shadow-sm"
                    >
                      <Pencil className="w-2.5 h-2.5 text-brand-black/60" />
                    </button>
                  </div>
                  <p className="font-semibold text-sm text-brand-black">{displayName}</p>
                  <p className="text-xs text-brand-black/50 mt-0.5 truncate max-w-full">{user?.email}</p>
                </div>

                {/* Menu items */}
                <div className="py-1 relative">
                  {/* Theme */}
                  <div
                    className="relative"
                    onMouseEnter={() => setThemeHovered(true)}
                    onMouseLeave={() => setThemeHovered(false)}
                  >
                    <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-brand-black/80 hover:bg-brand-ghost transition-colors">
                      <Palette className="w-4 h-4 text-brand-black/50 shrink-0" />
                      <span className="flex-1 text-left">Theme</span>
                      <ChevronRight className="w-3.5 h-3.5 text-brand-black/40" />
                    </button>

                    {themeHovered && (
                      <div className="absolute left-full top-0 ml-1 w-44 bg-white rounded-xl shadow-lg border border-black/5 py-1 z-10">
                        {themeOptions.map(opt => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setTheme(opt.value)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-brand-black/80 hover:bg-brand-ghost transition-colors"
                            >
                              {theme === opt.value
                                ? <Check className="w-3.5 h-3.5 text-brand-black shrink-0" />
                                : <span className="w-3.5 shrink-0" />}
                              <Icon className="w-3.5 h-3.5 text-brand-black/50 shrink-0" />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Settings */}
                  <button
                    onClick={() => openSettings('profile')}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-brand-black/80 hover:bg-brand-ghost transition-colors"
                  >
                    <Settings className="w-4 h-4 text-brand-black/50 shrink-0" />
                    Settings
                  </button>
                </div>

                <div className="h-px bg-black/5 mx-2" />

                {/* Switch account */}
                <div className="py-1">
                  <p className="px-4 py-1.5 text-xs font-semibold text-brand-black/40">Switch account</p>
                  <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-brand-ghost transition-colors">
                    {AvatarSmall}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-brand-black truncate">{displayName}</p>
                      <p className="text-xs text-brand-black/50 truncate">{user?.email}</p>
                    </div>
                    <Check className="w-3.5 h-3.5 text-brand-black/60 shrink-0" />
                  </button>
                  <button
                    onClick={() => { setIsProfileOpen(false); toast.info('Add account coming soon'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-brand-black/70 hover:bg-brand-ghost transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-brand-black/50 shrink-0" />
                    Add account
                  </button>
                </div>

                <div className="h-px bg-black/5 mx-2" />

                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-brand-black/80 hover:bg-brand-ghost transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-brand-black/50 shrink-0" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setIsNotifOpen(o => !o); setIsProfileOpen(false); }}
              className={`relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                isNotifOpen
                  ? 'bg-brand-ghost text-brand-black'
                  : 'text-brand-black/40 hover:text-brand-black hover:bg-brand-ghost/60'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute left-full top-0 ml-4 w-80 bg-white rounded-2xl shadow-xl border border-black/5 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <span className="font-semibold text-sm text-brand-black">All notifications</span>
                  <button
                    onClick={() => openSettings('notifications')}
                    className="text-brand-black/40 hover:text-brand-black transition-colors"
                    title="Notification settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1 px-4 pb-3">
                  {(['all', 'requests', 'unread'] as NotifTab[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setNotifTab(tab)}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                        notifTab === tab ? 'bg-brand-black text-white' : 'text-brand-black/50 hover:text-brand-black'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-black/5" />

                <div className="max-h-80 overflow-y-auto">
                  {visibleNotifs.length === 0 ? (
                    <p className="text-center text-sm text-brand-black/40 py-12">
                      You don't have any notifications.
                    </p>
                  ) : (
                    notifGroups.map(group => {
                      const items = visibleNotifs.filter(n => n.group === group);
                      if (!items.length) return null;
                      return (
                        <div key={group}>
                          <p className="px-4 pt-3 pb-1 text-xs font-semibold text-brand-black/40">{group}</p>
                          {items.map(n => (
                            <button
                              key={n.id}
                              onClick={() => {
                                if (n.href) navigate(n.href);
                                setIsNotifOpen(false);
                              }}
                              className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-brand-ghost/50 transition-colors text-left"
                            >
                              <div className={`w-8 h-8 rounded-full ${n.avatarBg} flex items-center justify-center text-brand-black text-xs font-bold shrink-0 mt-0.5`}>
                                {n.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-brand-black truncate">{n.title}</p>
                                <p className="text-xs text-brand-black/50 truncate">{n.action}</p>
                              </div>
                              <span className="text-xs text-brand-black/40 shrink-0 mt-0.5">{n.date}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div className="px-4 pb-4">
          {isCollapsed ? (
            <Link
              to="/dashboard/create"
              className="w-12 h-12 mx-auto bg-brand-black text-white rounded-xl flex items-center justify-center hover:bg-black/90 transition-colors shadow-sm"
              title="Create New Survey"
            >
              <Plus className="w-5 h-5" />
            </Link>
          ) : (
            <Link
              to="/dashboard/create"
              className="w-full bg-brand-black text-white py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-black/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create New Survey
            </Link>
          )}
        </div>

        <div className="px-6 py-2"><div className="h-px bg-black/5 w-full" /></div>

        {/* Search */}
        <div className="px-4 py-2">
          {isCollapsed ? (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-12 h-10 mx-auto rounded-lg flex items-center justify-center text-brand-black/40 hover:bg-brand-ghost hover:text-brand-black transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center gap-2.5 bg-brand-ghost/50 border border-transparent hover:border-black/10 hover:bg-white rounded-lg py-2 pl-3 pr-3 text-sm text-brand-black/30 transition-all"
            >
              <Search className="w-4 h-4 text-brand-black/40 shrink-0" />
              <span className="font-medium">Search surveys...</span>
            </button>
          )}
        </div>

        <div className="px-6 py-2"><div className="h-px bg-black/5 w-full" /></div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/dashboard/create#templates' &&
                location.pathname === '/dashboard/create' &&
                location.hash === '#templates');
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-ghost text-brand-black'
                    : 'text-brand-black/60 hover:bg-brand-ghost/50 hover:text-brand-black'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-black' : ''}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Card */}
        <div className="p-4 mt-auto">
          {!isCollapsed ? (
            <div className="bg-brand-ghost rounded-2xl p-4 text-center">
              <div className="w-9 h-9 rounded-full border-2 border-brand-black/15 flex items-center justify-center mx-auto mb-3">
                <ArrowUp className="w-4 h-4 text-brand-black/50" />
              </div>
              <p className="text-xs font-medium text-brand-black/60 mb-3 leading-relaxed">
                Ready to go beyond the free plan? Upgrade for premium features.
              </p>
              <Link to="/dashboard/pricing" className="block w-full bg-brand-black hover:bg-black/90 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors">
                View plans
              </Link>
            </div>
          ) : (
            <Link
              to="/dashboard/pricing"
              className="w-10 h-10 mx-auto rounded-full border-2 border-brand-black/15 flex items-center justify-center text-brand-black/50 hover:text-brand-black transition-colors"
              title="Upgrade"
            >
              <ArrowUp className="w-4 h-4" />
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
