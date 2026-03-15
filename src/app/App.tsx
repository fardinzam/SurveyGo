import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation, useParams } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { GuestRoute } from '../components/GuestRoute';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { CollapsibleSidebar } from './components/CollapsibleSidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
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

/** Maps route paths back to page IDs for the active nav highlight */
const routeToPage: Record<string, string> = Object.fromEntries(
  Object.entries(pageToRoute).map(([k, v]) => [v, k])
);

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

      <main className={`transition-all duration-300 min-h-screen pb-16 lg:pb-0 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <Outlet />
      </main>

      <MobileBottomNav activePage={activePage} onNavigate={onNavigate} />

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
      <Toaster position="bottom-right" richColors />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public pages (no sidebar) */}
                <Route path="/" element={<LandingRoute />} />
                <Route path="/auth/login" element={<GuestRoute><LoginRoute /></GuestRoute>} />
                <Route path="/auth/signup" element={<GuestRoute><SignUpRoute /></GuestRoute>} />
                {/* Public survey respondent page (no auth, no sidebar) */}
                <Route path="/s/:id" element={<RespondentRoute />} />

                {/* Builder & Publish (custom layout, no sidebar, protected) */}
                <Route path="/app/surveys/new" element={<ProtectedRoute><BuilderRoute /></ProtectedRoute>} />
                <Route path="/app/surveys/:id/edit" element={<ProtectedRoute><BuilderEditRoute /></ProtectedRoute>} />
                <Route path="/app/surveys/:id/publish" element={<ProtectedRoute><PublishEditRoute /></ProtectedRoute>} />
                <Route path="/app/surveys/:id/connect" element={<ProtectedRoute><ConnectAppsRoute /></ProtectedRoute>} />
                <Route path="/app/surveys/:id/results" element={<ProtectedRoute><SurveyResultsEditRoute /></ProtectedRoute>} />

                {/* App pages (with sidebar, protected) */}
                <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardRoute />} />
                  <Route path="dashboard/empty" element={<DashboardEmptyRoute />} />
                  <Route path="surveys" element={<SurveysRoute />} />
                  <Route path="surveys/results" element={<SurveyResultsRoute />} />
                  <Route path="templates" element={<TemplatesRoute />} />
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
