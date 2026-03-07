import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles, Settings, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { Card } from './Card';
import { useAuthContext } from '../../contexts/AuthContext';
import { signOut } from '../../lib/auth';
import { useTheme } from 'next-themes';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  collapsed: boolean;
}

const themeIcon: Record<string, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const nextThemeMap: Record<string, string> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

function getSystemTheme(): 'Light' | 'Dark' {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'Dark';
  }
  return 'Light';
}

function getThemeLabel(mode: string): string {
  if (mode === 'light') return 'Light Mode';
  if (mode === 'dark') return 'Dark Mode';
  return `System (${getSystemTheme()})`;
}

export function ProfileDropdown({ isOpen, onClose, onNavigate, collapsed }: ProfileDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const { theme, setTheme } = useTheme();

  const currentTheme = theme || 'light';

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const showPhoto = user?.photoURL && !imgError;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Reset image error when user changes
  useEffect(() => { setImgError(false); }, [user?.photoURL]);

  if (!isOpen) return null;

  const ThemeIcon = themeIcon[currentTheme] || Monitor;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 transition-all duration-200"
      style={{
        bottom: '16px',
        left: collapsed ? '80px' : '260px',
        width: '240px'
      }}
    >
      <Card className="overflow-hidden shadow-xl gap-2" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        {/* User Header */}
        <button
          onClick={() => { onNavigate('settings'); onClose(); }}
          className="w-full px-3 py-2.5 hover:bg-muted transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center font-bold text-foreground text-sm overflow-hidden flex-shrink-0">
              {showPhoto ? (
                <img src={user!.photoURL!} alt={displayName} className="w-full h-full object-cover rounded-full" onError={() => setImgError(true)} />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground text-sm truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{email}</div>
            </div>
          </div>
        </button>

        <div className="border-t border-border" />

        {/* Menu Items */}
        <div className="py-1">
          <button
            onClick={() => { onNavigate('plans'); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-left"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground text-sm">Upgrade Plan</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setTheme(nextThemeMap[currentTheme] || 'light'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-left"
          >
            <ThemeIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground text-sm">{getThemeLabel(currentTheme)}</span>
          </button>

          <button
            onClick={() => { onNavigate('settings'); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-left"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground text-sm">Settings</span>
          </button>
        </div>

        <div className="border-t border-border" />

        {/* Logout */}
        <div className="py-1">
          <button
            onClick={async () => {
              onClose();
              await signOut();
              navigate('/auth/login');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span className="text-red-600 dark:text-red-400 font-medium text-sm">Log Out</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
