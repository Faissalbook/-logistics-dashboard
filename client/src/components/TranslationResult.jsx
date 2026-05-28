import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import CharacterPinyin from './CharacterPinyin';
import AudioButton from './AudioButton';

const LANG_FLAGS = {
  english: '🇬🇧',
  french: '🇫🇷',
  arabic: '🇸🇦',
  other: '🌐',
};

const CopyIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const ShareIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg width="16" height="16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
    className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export default function TranslationResult({ result }) {
  const [showParts, setShowParts] = useState(false);
  const { addFavorite, removeFavorite, isFavorited } = useAppStore();
  const favorited = isFavorited(result.id);

  const handleCopy = () => {
    const text = `${result.chinese}\n${result.pinyin}\n\n(${result.inputText})`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    });
  };

  const handleShare = async () => {
    const text = `Chinese: ${result.chinese}\nPinyin: ${result.pinyin}\n\nTranslated from: ${result.inputText}`;
    if (navigator.share) {
      await navigator.share({ title: 'Chinese Translation', text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
  };

  const handleFavorite = () => {
    if (favorited) {
      removeFavorite(result.id);
      toast('Removed from favorites');
    } else {
      addFavorite(result);
      toast.success('Saved to favorites ⭐');
    }
  };

  const flag = LANG_FLAGS[result.detected] || '🌐';

  return (
    <div className="card p-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🇨🇳</span>
          <span className="text-sm font-semibold text-[var(--text)]">Chinese Mandarin</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg)] rounded-full px-2.5 py-1 border border-[var(--border)]">
          <span>{flag}</span>
          <span className="capitalize">{result.detectedName || result.detected}</span>
          <span>→</span>
          <span>🇨🇳 Chinese</span>
        </div>
      </div>

      {/* Chinese text */}
      <div className="mb-3">
        <p className="font-chinese text-3xl sm:text-4xl leading-relaxed text-[var(--text)] font-medium">
          {result.chinese}
        </p>
      </div>

      {/* Pinyin */}
      <div className="mb-4">
        <p className="text-base sm:text-lg text-primary-500 font-medium leading-relaxed tracking-wide">
          {result.pinyin}
        </p>
      </div>

      {/* Character breakdown toggle */}
      {result.pinyinParts?.length > 0 && (
        <button
          onClick={() => setShowParts((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-2"
        >
          <ChevronIcon open={showParts} />
          {showParts ? 'Hide' : 'Show'} character breakdown
        </button>
      )}

      {showParts && <CharacterPinyin parts={result.pinyinParts} />}

      {/* Notes */}
      {result.notes && (
        <p className="text-xs text-[var(--text-muted)] italic mt-3 pl-3 border-l-2 border-[var(--border)]">
          {result.notes}
        </p>
      )}

      {/* Divider */}
      <div className="h-px bg-[var(--border)] my-4" />

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <AudioButton text={result.chinese} />
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleCopy}
            className="btn-icon text-[var(--text-muted)] hover:text-[var(--text)]"
            title="Copy"
          >
            <CopyIcon />
          </button>
          <button
            onClick={handleShare}
            className="btn-icon text-[var(--text-muted)] hover:text-[var(--text)]"
            title="Share"
          >
            <ShareIcon />
          </button>
          <button
            onClick={handleFavorite}
            className={`btn-icon transition-colors ${
              favorited ? 'text-gold' : 'text-[var(--text-muted)] hover:text-gold'
            }`}
            title={favorited ? 'Remove from favorites' : 'Save to favorites'}
          >
            <StarIcon filled={favorited} />
          </button>
        </div>
      </div>
    </div>
  );
}
