import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppProvider } from '@/state/AppProvider';
import { ToastProvider } from '@/state/ToastProvider';
import { useApp } from '@/state/useApp';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { LiveStudio } from '@/routes/LiveStudio';
import { Sessions } from '@/routes/Sessions';
import { Wallet } from '@/routes/Wallet';
import { Transactions } from '@/routes/Transactions';
import { Profile } from '@/routes/Profile';
import { Settings } from '@/routes/Settings';
import { SignIn } from '@/routes/auth/SignIn';
import { Register } from '@/routes/auth/Register';
import { Onboarding } from '@/routes/Onboarding';
import { NotFound } from '@/routes/NotFound';

const titles: Record<string, string> = {
  '/studio': 'Live Studio',
  '/sessions': 'Session history',
  '/wallet': 'Wallet',
  '/transactions': 'Transactions',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/sign-in': 'Sign in',
  '/login': 'Sign in',
  '/register': 'Create account',
  '/signup': 'Create account',
  '/onboarding': 'Hardware Setup',
};

function AppFrame() {
  const { settings } = useApp();
  const location = useLocation();

  useEffect(() => {
    const page = titles[location.pathname];
    document.title = page ? `${page} · Dallr Cam Studio` : 'Dallr Cam Studio';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <MotionConfig reducedMotion={settings.reduceMotion ? 'always' : 'user'}>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/login" element={<Navigate to="/sign-in" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/studio" replace />} />
            <Route path="/studio" element={<LiveStudio />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AppProvider>
          <AppFrame />
        </AppProvider>
      </ToastProvider>
    </HashRouter>
  );
}
