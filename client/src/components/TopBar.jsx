import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

const SunIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const titles = {
  '/': { brand: true },
  '/explore': { title: 'Explore' },
  '/create': { title: 'New post' },
  '/notifications': { title: 'Activity' },
  '/profile': { title: 'Profile' },
};

export default function TopBar() {
  const { pathname } = useLocation();
  const isDark = useAppStore((s) => s.isDark);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  const config =
    titles[pathname] ||
    (pathname.startsWith('/profile') ? { title: 'Profile' } : { brand: true });

  return (
    <header className="sticky top-0 z-50 glass safe-top">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {config.brand ? (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
              <span className="text-white text-base font-black tracking-tight">T</span>
            </div>
            <div>
              <h1 className="text-base font-bold leading-none gradient-text">Triboo</h1>
              <p className="text-[10px] text-[var(--text-muted)] leading-none mt-1">Social Kit</p>
            </div>
          </div>
        ) : (
          <h1 className="text-lg font-bold tracking-tight">{config.title}</h1>
        )}

        <div className="flex items-center gap-1">
          <Link
            to="/notifications"
            className="btn-icon text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label="Notifications"
          >
            <BellIcon />
          </Link>
          <button
            onClick={toggleTheme}
            className="btn-icon text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label="Toggle theme"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
