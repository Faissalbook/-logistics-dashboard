import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import AudioButton from './AudioButton';

const LANG_FLAGS = { english: '🇬🇧', french: '🇫🇷', arabic: '🇸🇦', other: '🌐' };

const CopyIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg width="15" height="15" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default function TranslationCard({ item, onReplay, onDelete, compact = false }) {
  const { addFavorite, removeFavorite, isFavorited } = useAppStore();
  const favorited = isFavorited(item.id);
  const flag = LANG_FLAGS[item.detected] || '🌐';

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${item.chinese}\n${item.pinyin}`);
    toast.success('Copied');
  };

  const handleFavorite = (e) => {
    e.stopPropagation();
    if (favorited) { removeFavorite(item.id); toast('Removed'); }
    else { addFavorite(item); toast.success('Saved ⭐'); }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(item.id);
  };

  const time = item.timestamp
    ? new Date(item.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      onClick={() => onReplay?.(item)}
      className="card p-4 cursor-pointer hover:shadow-card-hover transition-shadow duration-200 group"
    >
      {/* Source text */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm">{flag}</span>
          <p className="text-sm text-[var(--text-muted)] truncate">{item.inputText}</p>
        </div>
        <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap shrink-0">{time}</span>
      </div>

      {/* Chinese text */}
      <p className="font-chinese text-xl text-[var(--text)] font-medium leading-snug mb-1">
        {item.chinese}
      </p>

      {/* Pinyin */}
      {!compact && (
        <p className="text-sm text-primary-500 font-medium">{item.pinyin}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <AudioButton text={item.chinese} size="sm" showLabel={false} />
        <button onClick={handleCopy} className="btn-icon w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text)]" title="Copy">
          <CopyIcon />
        </button>
        <button onClick={handleFavorite} className={`btn-icon w-8 h-8 ${favorited ? 'text-gold' : 'text-[var(--text-muted)] hover:text-gold'}`} title="Favorite">
          <StarIcon filled={favorited} />
        </button>
        {onDelete && (
          <button onClick={handleDelete} className="btn-icon w-8 h-8 text-[var(--text-muted)] hover:text-red-500 ml-auto" title="Delete">
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}
