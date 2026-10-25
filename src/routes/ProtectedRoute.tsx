import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '@/state/useApp';
import { BootScreen } from '@/components/layout/BootScreen';

export function ProtectedRoute() {
  const { user, booting } = useApp();

  if (booting) return <BootScreen />;
  if (!user) return <Navigate to="/sign-in" replace />;
  return <Outlet />;
}
