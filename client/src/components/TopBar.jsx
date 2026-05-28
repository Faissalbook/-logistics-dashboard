import { useAppStore } from '../store/appStore';

const SunIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

export default function TopBar() {
  const { isDark, toggleTheme } = useAppStore();

  return (
    <header className="sticky top-0 z-50 glass safe-top">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">中</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--text)] leading-none">中文 AI</h1>
            <p className="text-[10px] text-[var(--text-muted)] leading-none mt-0.5">Chinese Translator</p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="btn-icon text-[var(--text-muted)] hover:text-[var(--text)]"
          aria-label="Toggle theme"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
