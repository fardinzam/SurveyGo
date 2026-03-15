import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Home, Activity, FileText, LayoutTemplate, UserCircle, Sparkles, Settings, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useSurveys } from '../../hooks/useSurveys';
import { useAuthContext } from '../../contexts/AuthContext';
import { signOut } from '../../lib/auth';
import { useTheme } from 'next-themes';
import { Card } from './Card';

interface MobileBottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const themeIcon: Record<string, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const nextThemeMap: Record<string, string> = { light: 'dark', dark: 'system', system: 'light' };
function getSystemTheme(): string { return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'; }
function getThemeLabel(mode: string): string { return mode === 'light' ? 'Light Mode' : mode === 'dark' ? 'Dark Mode' : `System (${getSystemTheme()})`; }

export function MobileBottomNav({ activePage, onNavigate }: MobileBottomNavProps) {
  const { data: surveys } = useSurveys();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const currentTheme = theme || 'light';
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasUnread = surveys?.some(s => s.responseCount > (s.lastReadResponseCount ?? 0)) ?? false;
  const initials = (user?.displayName || user?.email?.split('@')[0] || 'U').slice(0, 2).toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'surveys', label: 'My Surveys', icon: FileText },
    { id: 'templates-browse', label: 'Templates', icon: LayoutTemplate },
  ];

  const ThemeIcon = themeIcon[currentTheme] || Monitor;

  return (
    <>
      {/* Profile dropdown — slides up from bottom */}
      {profileOpen && (
        <div ref={dropdownRef} className="fixed bottom-16 right-2 z-[60] lg:hidden w-56">
          <Card className="overflow-hidden shadow-xl gap-2" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div className="py-1">
              <button
                onClick={() => { onNavigate('plans'); setProfileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground text-sm">Upgrade Plan</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setTheme(nextThemeMap[currentTheme] || 'light'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <ThemeIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground text-sm">{getThemeLabel(currentTheme)}</span>
              </button>

              <button
                onClick={() => { onNavigate('settings'); setProfileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground text-sm">Settings</span>
              </button>
            </div>

            <div className="border-t border-border" />

            <div className="py-1">
              <button
                onClick={async () => { setProfileOpen(false); await signOut(); navigate('/auth/login'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span className="text-red-600 dark:text-red-400 font-medium text-sm">Log Out</span>
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex lg:hidden pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setProfileOpen(false); }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.id === 'activity' && hasUnread && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Profile button */}
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${profileOpen || activePage === 'settings' ? 'text-foreground' : 'text-muted-foreground'
            }`}
        >
          <div className="w-5 h-5 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-[8px] font-bold text-foreground">
            {initials}
          </div>
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </nav>
    </>
  );
}
