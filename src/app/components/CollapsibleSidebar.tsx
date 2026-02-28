import React from 'react';
import { Home, Activity, FileText, LayoutTemplate, Users, Settings, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

interface CollapsibleSidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onProfileClick: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function CollapsibleSidebar({
  activePage,
  onNavigate,
  onProfileClick,
  collapsed,
  onToggleCollapse
}: CollapsibleSidebarProps) {
  const { user } = useAuthContext();

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'surveys', label: 'My Surveys', icon: FileText },
    { id: 'templates-browse', label: 'Templates', icon: LayoutTemplate },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div
      className={`bg-white border-r border-gray-100 h-screen flex flex-col fixed left-0 top-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'
        }`}
    >
      {/* Logo / Brand */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between relative">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-foreground">S</span>
            </div>
            <span className="text-lg font-bold text-foreground">SurveyGo</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <span className="text-sm font-bold text-foreground">S</span>
          </div>
        )}

        {/* Collapse Button — positioned where notification bell was */}
        <button
          onClick={onToggleCollapse}
          className={`p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-foreground ${collapsed
            ? 'absolute -right-5 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-sm rounded-r-lg z-10'
            : ''
            }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${isActive
                    ? 'bg-secondary text-foreground font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-foreground'
                    } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : ''}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Upgrade CTA — for Basic plan users */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Upgrade Plan</span>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Unlock unlimited surveys, responses, and premium features.
            </p>
            <button
              onClick={() => onNavigate('plans')}
              className="w-full bg-primary hover:bg-primary/90 text-foreground text-sm font-medium py-2 rounded-lg transition-colors"
            >
              View Plans
            </button>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="px-2 pb-2">
          <button
            onClick={() => onNavigate('plans')}
            className="w-full flex justify-center p-2.5 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/20 hover:from-primary/20 hover:to-secondary/30 transition-all group relative"
            title="Upgrade Plan"
          >
            <Sparkles className="w-5 h-5 text-primary" />
            <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none z-50">
              Upgrade Plan
            </div>
          </button>
        </div>
      )}

      {/* Bottom Section - Profile */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={onProfileClick}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-foreground transition-all group relative ${collapsed ? 'justify-center' : ''
            }`}
          title={collapsed ? 'Profile' : ''}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center font-semibold text-foreground text-sm flex-shrink-0 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover rounded-full" />
            ) : (
              initials
            )}
          </div>
          {!collapsed && (
            <div className="text-left flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">{displayName}</div>
              <div className="text-xs text-gray-500 truncate">{email}</div>
            </div>
          )}

          {collapsed && (
            <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none z-50">
              Profile
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
