import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import TranslationCard from '../components/TranslationCard';

const SearchIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default function History() {
  const [search, setSearch] = useState('');
  const { history, clearHistory, deleteHistoryItem, replayFromHistory } = useAppStore();
  const navigate = useNavigate();

  const filtered = search.trim()
    ? history.filter(
        (h) =>
          h.inputText?.toLowerCase().includes(search.toLowerCase()) ||
          h.chinese?.includes(search) ||
          h.pinyin?.toLowerCase().includes(search.toLowerCase())
      )
    : history;

  const handleReplay = (item) => {
    replayFromHistory(item);
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">History</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{history.length} translation{history.length !== 1 ? 's' : ''}</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => { if (confirm('Clear all history?')) clearHistory(); }}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <TrashIcon />
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      {history.length > 0 && (
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history…"
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-primary-400 transition-colors"
          />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">📭</div>
          <p className="text-[var(--text-muted)] text-sm">
            {search ? 'No results found' : 'No translation history yet'}
          </p>
          {!search && (
            <p className="text-xs text-[var(--text-muted)]">
              Your translations will appear here
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <TranslationCard
              key={item.id}
              item={item}
              onReplay={handleReplay}
              onDelete={deleteHistoryItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
