import { ROLE_LABELS, can } from '@transfasa/domain';
import { msg, phaseLabel } from '@transfasa/i18n';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Stacked } from '../components/Bilingual';
import { NAV } from '../nav';

export function DashboardPage() {
  const { profile, roles } = useAuth();
  const modules = NAV.filter((n) => n.path !== '/' && (n.perm === null || can(roles, n.perm)));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-900">
          <Stacked k="nav.dashboard" />
        </h1>
        {profile && <p className="mt-1 text-sm text-cement-700">{profile.fullName}</p>}
        <div className="mt-3 flex flex-wrap gap-2" data-testid="role-chips">
          {roles.map((r) => (
            <span key={r} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {ROLE_LABELS[r].fr} / {ROLE_LABELS[r].en}
            </span>
          ))}
        </div>
      </header>

      {roles.length === 0 ? (
        <p className="card p-5 text-sm text-red-700" role="alert">
          {msg('auth.noRole')}
        </p>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.path}
                to={m.path}
                className="card group flex items-center gap-4 p-4 transition hover:border-brand-500"
              >
                <span className="rounded-lg bg-brand-50 p-2.5 text-brand-700">
                  <Icon size={22} aria-hidden />
                </span>
                <span className="flex-1">
                  <Stacked k={m.label} className="font-semibold" />
                  {m.phase > 0 && (
                    <span className="mt-1 inline-block text-xs text-cement-500">
                      {phaseLabel(m.phase)}
                    </span>
                  )}
                </span>
                <ArrowRight size={18} className="text-cement-500 group-hover:text-brand-700" aria-hidden />
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
