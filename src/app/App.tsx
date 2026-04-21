import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { GuestRoute } from '../components/GuestRoute';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { LandingPage } from './components/LandingPage';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHome } from './components/DashboardHome';
import { DashboardCreate } from './components/DashboardCreate';
import { DashboardPricing } from './components/DashboardPricing';
import { DashboardBuilder } from './components/DashboardBuilder';
import { SurveyRespondentPage } from './components/SurveyRespondentPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function useOnNavigate() {
  const navigate = useNavigate();
  return (pageId: string) => {
    const routes: Record<string, string> = {
      landing: '/', login: '/auth/login', signup: '/auth/signup',
      dashboard: '/dashboard', create: '/dashboard/create', pricing: '/dashboard/pricing',
    };
    navigate(routes[pageId] ?? '/dashboard');
  };
}

function BuilderRoute() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/dashboard" replace />;
  return <DashboardBuilder surveyId={id} />;
}

function RespondentRoute() {
  const { id } = useParams<{ id: string }>();
  return <SurveyRespondentPage surveyId={id!} />;
}

function LandingRoute() { const nav = useOnNavigate(); return <LandingPage onNavigate={nav} />; }
function LoginRoute() { const nav = useOnNavigate(); return <LoginPage onNavigate={nav} />; }
function SignUpRoute() { const nav = useOnNavigate(); return <SignUpPage onNavigate={nav} />; }

function App() {
  return (
    <ErrorBoundary>
      <Toaster position="bottom-right" richColors />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingRoute />} />
                <Route path="/auth/login" element={<GuestRoute><LoginRoute /></GuestRoute>} />
                <Route path="/auth/signup" element={<GuestRoute><SignUpRoute /></GuestRoute>} />

                <Route path="/s/:id" element={<RespondentRoute />} />

                <Route path="/builder/:id" element={<ProtectedRoute><BuilderRoute /></ProtectedRoute>} />

                <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route index element={<DashboardHome />} />
                  <Route path="create" element={<DashboardCreate />} />
                  <Route path="pricing" element={<DashboardPricing />} />
                </Route>

                <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />
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
