import { type Permission, can } from '@transfasa/domain';
import { label, msg } from '@transfasa/i18n';
import { Loader2, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-cement-500" role="status">
      <Loader2 className="animate-spin" aria-hidden />
      <span className="ml-2 text-sm">{label('app.loading')}</span>
    </div>
  );
}

export function RequireSignedIn({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'signedOut') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** UI gate only — the server and Firestore rules are the real enforcement (SEC-01). */
export function RequirePermission({ perm, children }: { perm: Permission | null; children: ReactNode }) {
  const { roles } = useAuth();
  if (perm && !can(roles, perm)) return <Forbidden />;
  return <>{children}</>;
}

export function Forbidden() {
  return (
    <div className="card flex items-center gap-3 p-6 text-red-700">
      <ShieldAlert aria-hidden />
      <span>{msg('error.permissionDenied')}</span>
    </div>
  );
}
