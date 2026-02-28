import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles, Settings, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { Card } from './Card';
import { useAuthContext } from '../../contexts/AuthContext';
import { signOut } from '../../lib/auth';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  themeMode: ThemeMode;
  onSetTheme: (mode: ThemeMode) => void;
}

const themeIcon: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const nextTheme: Record<ThemeMode, ThemeMode> = {
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

function getThemeLabel(mode: ThemeMode): string {
  if (mode === 'light') return 'Light Mode';
  if (mode === 'dark') return 'Dark Mode';
  return `System (${getSystemTheme()})`;
}

export function ProfileDropdown({ isOpen, onClose, onNavigate, collapsed, themeMode, onSetTheme }: ProfileDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

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

  if (!isOpen) return null;

  const ThemeIcon = themeIcon[themeMode];

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 transition-all duration-200"
      style={{
        bottom: '16px',
        left: collapsed ? '80px' : '260px',
        width: '260px'
      }}
    >
      <Card className="overflow-hidden shadow-xl" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        {/* User Header — clickable, navigates to Settings/General */}
        <button
          onClick={() => {
            onNavigate('settings');
            onClose();
          }}
          className="w-full p-2.5 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center font-bold text-foreground text-sm overflow-hidden flex-shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover rounded-full" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground text-sm truncate">{displayName}</div>
              <div className="text-xs text-gray-500 truncate">{email}</div>
            </div>
          </div>
        </button>

        <div className="border-t border-gray-100"></div>

        {/* Menu Items */}
        <div className="py-0.5">
          <button
            onClick={() => {
              onNavigate('plans');
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground text-sm">Upgrade Plan</span>
          </button>

          {/* Theme Toggle — cycles Light → Dark → System */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetTheme(nextTheme[themeMode]);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
          >
            <ThemeIcon className="w-4 h-4 text-gray-600" />
            <span className="text-foreground text-sm">{getThemeLabel(themeMode)}</span>
          </button>

          <button
            onClick={() => {
              onNavigate('settings');
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
          >
            <Settings className="w-4 h-4 text-gray-600" />
            <span className="text-foreground text-sm">Settings</span>
          </button>
        </div>

        <div className="border-t border-gray-100"></div>

        {/* Logout */}
        <div className="py-0.5">
          <button
            onClick={async () => {
              onClose();
              await signOut();
              navigate('/auth/login');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span className="text-red-600 font-medium text-sm">Log Out</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
