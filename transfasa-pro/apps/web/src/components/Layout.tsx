import { ROLE_LABELS, can } from '@transfasa/domain';
import { label } from '@transfasa/i18n';
import { LogOut, MoreHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { NAV, type NavItem } from '../nav';
import { Stacked } from './Bilingual';

const MOBILE_SLOTS = 4;

function useVisibleNav(): NavItem[] {
  const { roles } = useAuth();
  return NAV.filter((n) => n.perm === null || can(roles, n.perm));
}

export function Layout() {
  const { profile, user, roles, signOut } = useAuth();
  const items = useVisibleNav();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.slice(0, items.length > MOBILE_SLOTS + 1 ? MOBILE_SLOTS : MOBILE_SLOTS + 1);
  const overflow = items.slice(primary.length);
  const name = profile?.fullName || user?.email || '';

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-cement-200 bg-white lg:flex">
        <Brand />
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navigation">
          {items.map((n) => (
            <SideLink key={n.path} item={n} />
          ))}
        </nav>
        <UserBox name={name} roles={roles} onSignOut={signOut} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-cement-200 bg-white/95 px-4 py-2 backdrop-blur lg:hidden">
          <Brand compact />
          <button className="btn-secondary px-3" onClick={signOut} aria-label={label('auth.signOut')}>
            <LogOut size={18} aria-hidden />
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid border-t border-cement-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
          style={{ gridTemplateColumns: `repeat(${primary.length + (overflow.length ? 1 : 0)}, minmax(0, 1fr))` }}
          aria-label="Navigation"
        >
          {primary.map((n) => (
            <BottomLink key={n.path} item={n} />
          ))}
          {overflow.length > 0 && (
            <button
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] text-cement-700"
              onClick={() => setMoreOpen(true)}
            >
              <MoreHorizontal size={20} aria-hidden />
              <Stacked k="nav.more" className="items-center" />
            </button>
          )}
        </nav>

        {moreOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setMoreOpen(false)}>
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex justify-end">
                <button className="btn-secondary px-3" onClick={() => setMoreOpen(false)} aria-label={label('common.close')}>
                  <X size={18} aria-hidden />
                </button>
              </div>
              <div className="space-y-1" onClick={() => setMoreOpen(false)}>
                {overflow.map((n) => (
                  <SideLink key={n.path} item={n} />
                ))}
              </div>
              <div className="mt-3 border-t border-cement-200 pt-3">
                <UserBox name={name} roles={roles} onSignOut={signOut} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'border-b border-cement-200 px-5 py-4'}`}>
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <div className="leading-tight">
        <p className="font-bold text-brand-900">TransFasa Pro</p>
        {!compact && <p className="text-xs text-cement-500">{label('app.company')}</p>}
      </div>
    </div>
  );
}

function SideLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-cement-100'
        }`
      }
    >
      <Icon size={18} aria-hidden />
      <Stacked k={item.label} />
    </NavLink>
  );
}

function BottomLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] ${
          isActive ? 'font-semibold text-brand-700' : 'text-cement-700'
        }`
      }
    >
      <Icon size={20} aria-hidden />
      <Stacked k={item.label} className="items-center text-center" />
    </NavLink>
  );
}

function UserBox({ name, roles, onSignOut }: { name: string; roles: string[]; onSignOut: () => void }) {
  return (
    <div className="border-t border-cement-200 p-4 lg:border-t">
      <p className="truncate text-sm font-semibold" data-testid="user-name">
        {name}
      </p>
      <p className="mb-3 text-xs text-cement-500" data-testid="user-roles">
        {roles.map((r) => ROLE_LABELS[r as keyof typeof ROLE_LABELS]?.fr ?? r).join(', ')}
      </p>
      <button className="btn-secondary w-full" onClick={onSignOut}>
        <LogOut size={16} aria-hidden />
        {label('auth.signOut')}
      </button>
    </div>
  );
}
