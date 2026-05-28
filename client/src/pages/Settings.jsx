import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { checkHealth } from '../utils/api';
import toast from 'react-hot-toast';

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

function SettingRow({ icon, label, description, children }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-lg shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
          {description && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0 ml-4">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="card overflow-hidden mb-4">
      <div className="px-4 pt-4 pb-1">
        <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-4 divide-y divide-[var(--border)]">
        {children}
      </div>
    </div>
  );
}

export default function Settings() {
  const { isDark, toggleTheme, history, favorites, clearHistory } = useAppStore();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    checkHealth().then(setHealth).catch(() => setHealth({ status: 'error' }));
  }, []);

  const handleClearHistory = () => {
    if (confirm('Clear all translation history?')) {
      clearHistory();
      toast.success('History cleared');
    }
  };

  const handleExport = () => {
    const data = JSON.stringify({ history, favorites }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chinese-translator-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[var(--text)]">Settings</h2>
      </div>

      {/* Appearance */}
      <Section title="Appearance">
        <SettingRow
          icon={isDark ? <MoonIcon /> : <SunIcon />}
          label="Dark Mode"
          description="Switch between light and dark theme"
        >
          <Toggle checked={isDark} onChange={toggleTheme} />
        </SettingRow>
      </Section>

      {/* Data */}
      <Section title="Data">
        <SettingRow
          icon="📚"
          label="Translation History"
          description={`${history.length} saved translations`}
        >
          <button
            onClick={handleClearHistory}
            disabled={history.length === 0}
            className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Clear
          </button>
        </SettingRow>

        <SettingRow
          icon="⭐"
          label="Favorites"
          description={`${favorites.length} saved phrases`}
        >
          <span className="text-xs text-[var(--text-muted)]">{favorites.length} items</span>
        </SettingRow>

        <SettingRow
          icon="💾"
          label="Export Data"
          description="Download history & favorites as JSON"
        >
          <button
            onClick={handleExport}
            className="text-xs font-semibold text-primary-500 hover:text-primary-600 px-3 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
          >
            Export
          </button>
        </SettingRow>
      </Section>

      {/* API Status */}
      <Section title="API Status">
        <SettingRow
          icon={health?.hasOpenAI ? '✅' : '❌'}
          label="OpenAI API"
          description={
            health?.hasOpenAI
              ? 'Connected and ready'
              : 'Not configured — add OPENAI_API_KEY to server .env'
          }
        >
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              health?.hasOpenAI
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {health?.hasOpenAI ? 'Active' : 'Missing'}
          </span>
        </SettingRow>

        <SettingRow
          icon="🔊"
          label="Text-to-Speech"
          description="Browser native Chinese pronunciation"
        >
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {typeof window !== 'undefined' && 'speechSynthesis' in window ? 'Supported' : 'N/A'}
          </span>
        </SettingRow>
      </Section>

      {/* About */}
      <Section title="About">
        <SettingRow icon="🐉" label="中文 AI Translator" description="Version 1.0.0">
          <span className="text-xs text-[var(--text-muted)]">v1.0.0</span>
        </SettingRow>
        <SettingRow
          icon="🤖"
          label="AI Model"
          description="Powered by OpenAI GPT-4o-mini + pinyin-pro"
        >
          <span className="text-xs text-[var(--text-muted)]">GPT-4o</span>
        </SettingRow>
        <SettingRow
          icon="🌐"
          label="Supported Languages"
          description="Arabic, French, English → Simplified Chinese"
        >
          <span className="text-xs text-[var(--text-muted)]">3 → 1</span>
        </SettingRow>
      </Section>

      {/* Setup guide */}
      {health && !health.hasOpenAI && (
        <div className="card p-4 border-l-4 border-primary-500 bg-primary-50 dark:bg-primary-500/10">
          <h4 className="text-sm font-bold text-[var(--text)] mb-2">Setup Required</h4>
          <ol className="text-xs text-[var(--text-muted)] space-y-1 list-decimal pl-4">
            <li>Copy <code className="font-mono bg-[var(--bg)] px-1 rounded">.env.example</code> to <code className="font-mono bg-[var(--bg)] px-1 rounded">.env</code> in the root folder</li>
            <li>Add your OpenAI API key to <code className="font-mono bg-[var(--bg)] px-1 rounded">OPENAI_API_KEY</code></li>
            <li>Restart the server with <code className="font-mono bg-[var(--bg)] px-1 rounded">npm run dev</code></li>
          </ol>
        </div>
      )}
    </div>
  );
}
