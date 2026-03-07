import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation, useParams } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { CollapsibleSidebar } from './components/CollapsibleSidebar';
import { ProfileDropdown } from './components/ProfileDropdown';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { DashboardPage } from './components/DashboardPage';
import { DashboardEmptyState } from './components/DashboardEmptyState';
import { SurveysListPage } from './components/SurveysListPage';
import { TemplatesBrowsePage } from './components/TemplatesBrowsePage';
import { SurveyBuilderPageNew } from './components/SurveyBuilderPageNew';
import { PublishPage } from './components/PublishPage';
import { SurveyRespondentPage } from './components/SurveyRespondentPage';
import { SettingsPage } from './components/SettingsPage';
import { TeamPage } from './components/TeamPage';
import { SurveyResultsPage } from './components/SurveyResultsPage';
import { ConnectAppsPage } from './components/ConnectAppsPage';
import { LandingPage } from './components/LandingPage';
import { ActivityPage } from './components/ActivityPage';
import { PlansPage } from './components/PlansPage';
import { ChevronDown, ChevronUp } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Maps old page IDs to new route paths
const pageToRoute: Record<string, string> = {
  'landing': '/',
  'login': '/auth/login',
  'signup': '/auth/signup',
  'dashboard': '/app/dashboard',
  'dashboard-empty': '/app/dashboard/empty',
  'surveys': '/app/surveys',
  'templates-browse': '/app/templates',
  'builder': '/app/surveys/new',
  'publish': '/app/surveys/new/publish',
  'survey-results': '/app/surveys/results',
  'team': '/app/team',
  'settings': '/app/settings',
  'upgrade': '/app/plans',
  'activity': '/app/activity',
  'plans': '/app/plans',
  'personalization': '/app/settings',
};

/**
 * Creates an onNavigate adapter that maps old page IDs to React Router navigation.
 */
function useOnNavigate() {
  const navigate = useNavigate();
  return (pageId: string) => {
    // Static mapping
    const route = pageToRoute[pageId];
    if (route) {
      navigate(route);
      return;
    }
    // Dynamic path: if it looks like a relative sub-path (contains '/'), treat as /app/{pageId}
    if (pageId.includes('/')) {
      navigate(`/app/${pageId}`);
      return;
    }
    console.warn(`Unknown page ID: ${pageId}`);
  };
}

/** Maps route paths back to page IDs for the Screen Navigator */
const routeToPage: Record<string, string> = Object.fromEntries(
  Object.entries(pageToRoute).map(([k, v]) => [v, k])
);

// --- Screen Navigator FAB ---
function ScreenNavigator() {
  const [showScreenNav, setShowScreenNav] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = routeToPage[location.pathname] || '';

  const allScreens = [
    { id: 'landing', name: '🏠 Landing Page' },
    { id: 'login', name: 'Login Page' },
    { id: 'signup', name: 'Sign Up Page' },
    { id: 'dashboard', name: 'Dashboard (with data)' },
    { id: 'dashboard-empty', name: 'Dashboard (empty state)' },
    { id: 'surveys', name: 'My Surveys' },
    { id: 'templates-browse', name: 'Templates Page' },
    { id: 'builder', name: 'Survey Builder' },
    { id: 'publish', name: 'Publish Page' },
    { id: 'survey-results', name: 'Survey Results' },
    { id: 'team', name: 'Team Page' },
    { id: 'settings', name: 'Settings Page' },
    { id: 'activity', name: 'Activity Page' },
    { id: 'plans', name: 'Plans Page' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <button
          onClick={() => setShowScreenNav(!showScreenNav)}
          className="w-full px-6 py-3 bg-primary text-foreground font-semibold flex items-center justify-between gap-3 hover:bg-primary/90 transition-colors"
        >
          <span>Navigate Screens</span>
          {showScreenNav ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>

        {showScreenNav && (
          <div className="max-h-96 overflow-y-auto">
            {allScreens.map((screen) => (
              <button
                key={screen.id}
                onClick={() => {
                  const route = pageToRoute[screen.id];
                  if (route) navigate(route);
                  setShowScreenNav(false);
                }}
                className={`w-full px-6 py-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-100 ${currentPage === screen.id ? 'bg-secondary font-medium' : ''
                  }`}
              >
                {screen.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- App Layout (sidebar + main content area) ---
function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const onNavigate = useOnNavigate();
  const location = useLocation();
  const activePage = routeToPage[location.pathname] || 'dashboard';

  return (
    <div className="min-h-screen bg-background">
      <CollapsibleSidebar
        activePage={activePage}
        onNavigate={onNavigate}
        onProfileClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className={`${sidebarCollapsed ? 'ml-16' : 'ml-60'} transition-all duration-300 min-h-screen`}>
        <Outlet />
      </main>

      <ProfileDropdown
        isOpen={profileDropdownOpen}
        onClose={() => setProfileDropdownOpen(false)}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
      />
    </div>
  );
}

// --- Page wrapper components ---
function DashboardRoute() {
  const onNavigate = useOnNavigate();
  return <DashboardPage onNavigate={onNavigate} />;
}

function DashboardEmptyRoute() {
  const onNavigate = useOnNavigate();
  return <DashboardEmptyState onNavigate={onNavigate} />;
}

function SurveysRoute() {
  const onNavigate = useOnNavigate();
  return <SurveysListPage onNavigate={onNavigate} />;
}

function TemplatesRoute() {
  const onNavigate = useOnNavigate();
  return <TemplatesBrowsePage onNavigate={onNavigate} />;
}

function TeamRoute() {
  const onNavigate = useOnNavigate();
  return <TeamPage onNavigate={onNavigate} />;
}

function SettingsRoute() {
  const onNavigate = useOnNavigate();
  return <SettingsPage onNavigate={onNavigate} />;
}

function SurveyResultsRoute() {
  const onNavigate = useOnNavigate();
  return <SurveyResultsPage onNavigate={onNavigate} />;
}

function BuilderRoute() {
  const onNavigate = useOnNavigate();
  return <SurveyBuilderPageNew onNavigate={onNavigate} />;
}

function BuilderEditRoute() {
  const onNavigate = useOnNavigate();
  const { id } = useParams<{ id: string }>();
  return <SurveyBuilderPageNew onNavigate={onNavigate} surveyId={id} />;
}

function PublishEditRoute() {
  const onNavigate = useOnNavigate();
  const { id } = useParams<{ id: string }>();
  return <PublishPage onNavigate={onNavigate} surveyId={id} />;
}

function RespondentRoute() {
  const { id } = useParams<{ id: string }>();
  return <SurveyRespondentPage surveyId={id!} />;
}

function ConnectAppsRoute() {
  const onNavigate = useOnNavigate();
  const { id } = useParams<{ id: string }>();
  return <ConnectAppsPage onNavigate={onNavigate} surveyId={id} />;
}

function SurveyResultsEditRoute() {
  const onNavigate = useOnNavigate();
  const { id } = useParams<{ id: string }>();
  return <SurveyResultsPage onNavigate={onNavigate} surveyId={id} />;
}

function LoginRoute() {
  const onNavigate = useOnNavigate();
  return <LoginPage onNavigate={onNavigate} />;
}

function SignUpRoute() {
  const onNavigate = useOnNavigate();
  return <SignUpPage onNavigate={onNavigate} />;
}

function LandingRoute() {
  const onNavigate = useOnNavigate();
  return <LandingPage onNavigate={onNavigate} />;
}

function ActivityRoute() {
  const onNavigate = useOnNavigate();
  return <ActivityPage onNavigate={onNavigate} />;
}

function PlansRoute() {
  const onNavigate = useOnNavigate();
  return <PlansPage onNavigate={onNavigate} />;
}

// --- Main App ---
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public pages (no sidebar) */}
                <Route path="/" element={<><LandingRoute />{import.meta.env.DEV && <ScreenNavigator />}</>} />
                <Route path="/auth/login" element={<><LoginRoute />{import.meta.env.DEV && <ScreenNavigator />}</>} />
                <Route path="/auth/signup" element={<><SignUpRoute />{import.meta.env.DEV && <ScreenNavigator />}</>} />
                {/* Public survey respondent page (no auth, no sidebar) */}
                <Route path="/s/:id" element={<RespondentRoute />} />

                {/* Builder & Publish (custom layout, no sidebar, protected) */}
                <Route path="/app/surveys/new" element={<ProtectedRoute><BuilderRoute />{import.meta.env.DEV && <ScreenNavigator />}</ProtectedRoute>} />
                <Route path="/app/surveys/:id/edit" element={<ProtectedRoute><BuilderEditRoute />{import.meta.env.DEV && <ScreenNavigator />}</ProtectedRoute>} />
                <Route path="/app/surveys/:id/publish" element={<ProtectedRoute><PublishEditRoute />{import.meta.env.DEV && <ScreenNavigator />}</ProtectedRoute>} />
                <Route path="/app/surveys/:id/connect" element={<ProtectedRoute><ConnectAppsRoute />{import.meta.env.DEV && <ScreenNavigator />}</ProtectedRoute>} />
                <Route path="/app/surveys/:id/results" element={<ProtectedRoute><SurveyResultsEditRoute />{import.meta.env.DEV && <ScreenNavigator />}</ProtectedRoute>} />

                {/* App pages (with sidebar, protected) */}
                <Route path="/app" element={<ProtectedRoute><AppLayout />{import.meta.env.DEV && <ScreenNavigator />}</ProtectedRoute>}>
                  <Route index element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardRoute />} />
                  <Route path="dashboard/empty" element={<DashboardEmptyRoute />} />
                  <Route path="surveys" element={<SurveysRoute />} />
                  <Route path="surveys/results" element={<SurveyResultsRoute />} />
                  <Route path="templates" element={<TemplatesRoute />} />
                  <Route path="team" element={<TeamRoute />} />
                  <Route path="settings" element={<SettingsRoute />} />
                  <Route path="activity" element={<ActivityRoute />} />
                  <Route path="plans" element={<PlansRoute />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
