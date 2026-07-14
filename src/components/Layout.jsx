import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, PlusCircle, Target, BarChart3, Settings,
  Moon, Sun, PanelLeftClose, PanelLeftOpen, LogOut, Plus,
} from 'lucide-react'
import { useI18n, useUIStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { ConfirmDialog } from './ui'

const NAV = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', key: 'nav.transactions', icon: ArrowLeftRight },
  { to: '/add', key: 'nav.add', icon: PlusCircle, fab: true },
  { to: '/goals', key: 'nav.goals', icon: Target },
  { to: '/reports', key: 'nav.reports', icon: BarChart3 },
]

function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useUIStore()
  const { t } = useI18n()
  const dark = theme === 'dark'
  return (
    <button
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={`rounded-xl p-2 text-neutral-500 transition hover:bg-black/5 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white ${className}`}
      aria-label={t(dark ? 'settings.light' : 'settings.dark')}
      title={t(dark ? 'settings.light' : 'settings.dark')}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}

export default function Layout({ children }) {
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const linkBase =
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:hover:bg-white/10'

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-e border-black/5 bg-surface-light transition-all duration-300 dark:border-white/5 dark:bg-surface-dark lg:flex ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <div className={`flex items-center gap-3 px-4 pb-2 pt-5 ${collapsed ? 'justify-center px-2' : ''}`}>
          <img src="/favicon.svg" alt="" className="h-9 w-9 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-bold leading-tight">{t('app.name')}</p>
              <p className="text-[11px] font-semibold tracking-wide text-neutral-400">{t('app.rule')}</p>
            </div>
          )}
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {NAV.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${linkBase} ${collapsed ? 'justify-center px-2' : ''} ${
                  isActive
                    ? 'bg-[#0b0b0b] text-white hover:bg-[#0b0b0b] dark:bg-white dark:text-[#0b0b0b] dark:hover:bg-white'
                    : 'text-neutral-600 dark:text-neutral-300'
                }`
              }
              title={collapsed ? t(key) : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed && <span className="truncate">{t(key)}</span>}
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `${linkBase} ${collapsed ? 'justify-center px-2' : ''} ${
                isActive
                  ? 'bg-[#0b0b0b] text-white hover:bg-[#0b0b0b] dark:bg-white dark:text-[#0b0b0b] dark:hover:bg-white'
                  : 'text-neutral-600 dark:text-neutral-300'
              }`
            }
            title={collapsed ? t('nav.settings') : undefined}
          >
            <Settings className="h-5 w-5 shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">{t('nav.settings')}</span>}
          </NavLink>
        </nav>

        <div className={`border-t border-black/5 p-3 dark:border-white/5 ${collapsed ? 'flex flex-col items-center gap-1' : 'flex items-center justify-between'}`}>
          {!collapsed && (
            <div className="min-w-0 px-1">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-[11px] text-neutral-400">{user?.email}</p>
            </div>
          )}
          <div className={`flex ${collapsed ? 'flex-col' : ''} items-center`}>
            <ThemeToggle />
            <button
              onClick={() => setConfirmSignOut(true)}
              className="rounded-xl p-2 text-neutral-500 transition hover:bg-black/5 hover:text-danger dark:text-neutral-400 dark:hover:bg-white/10"
              aria-label={t('auth.signOut')}
              title={t('auth.signOut')}
            >
              <LogOut className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-xl p-2 text-neutral-500 transition hover:bg-black/5 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/10"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-surface-light/90 px-4 py-3 backdrop-blur dark:border-white/5 dark:bg-surface-dark/90 lg:hidden">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <div>
            <p className="text-sm font-bold leading-tight">{t('app.name')}</p>
            <p className="text-[10px] font-semibold tracking-wide text-neutral-400">{t('app.rule')}</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-surface-light/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/5 dark:bg-surface-dark/95 lg:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
          {NAV.map(({ to, key, icon: Icon, end, fab }) =>
            fab ? (
              <NavLink
                key={to}
                to={to}
                className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#0b0b0b] text-white shadow-lg transition active:scale-95 dark:bg-white dark:text-[#0b0b0b]"
                aria-label={t(key)}
              >
                <Plus className="h-7 w-7" />
              </NavLink>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition ${
                    isActive ? 'text-[#0b0b0b] dark:text-white' : 'text-neutral-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-5 w-5 ${isActive ? '' : 'opacity-80'}`} aria-hidden />
                    <span>{t(key)}</span>
                  </>
                )}
              </NavLink>
            )
          )}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition ${
                isActive ? 'text-[#0b0b0b] dark:text-white' : 'text-neutral-400'
              }`
            }
          >
            <Settings className="h-5 w-5" aria-hidden />
            <span>{t('nav.settings')}</span>
          </NavLink>
        </div>
      </nav>

      <ConfirmDialog
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={() => {
          logout()
          navigate('/')
        }}
        title={t('settings.signOutTitle')}
        body={t('settings.signOutBody')}
        confirmLabel={t('auth.signOut')}
        danger={false}
      />
    </div>
  )
}
