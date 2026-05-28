import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { fetchPhrasebook, fetchCategories } from '../utils/api';
import AudioButton from '../components/AudioButton';
import toast from 'react-hot-toast';

const LANG_FLAGS = { english: '🇬🇧', french: '🇫🇷', arabic: '🇸🇦' };

const CATEGORY_ICONS = {
  greetings: '👋',
  pricing: '💰',
  product: '📦',
  quality: '✅',
  shipping: '🚢',
  payment: '💳',
  followup: '🤝',
  automotive: '🚗',
};

function PhraseCard({ phrase, showLang }) {
  const navigate = useNavigate();
  const { setInputText } = useAppStore();
  const [expanded, setExpanded] = useState(false);

  const handleUse = (text) => {
    setInputText(text);
    navigate('/');
    toast.success('Loaded into translator');
  };

  const sourceText =
    showLang === 'arabic'
      ? phrase.arabic
      : showLang === 'french'
      ? phrase.french
      : phrase.english;

  return (
    <div className="card p-4 space-y-2">
      {/* Context badge */}
      <span className="inline-block text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded-full border border-[var(--border)]">
        {phrase.context}
      </span>

      {/* Source */}
      <div
        className="cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        dir={showLang === 'arabic' ? 'rtl' : 'ltr'}
      >
        <p className="text-xs text-[var(--text-muted)] mb-0.5 flex items-center gap-1">
          <span>{LANG_FLAGS[showLang]}</span>
          <span className="capitalize">{showLang}</span>
        </p>
        <p className="text-sm text-[var(--text)] font-medium">{sourceText}</p>
      </div>

      {/* Chinese */}
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5 flex items-center gap-1">
          <span>🇨🇳</span>
          <span>Chinese</span>
        </p>
        <p className="font-chinese text-xl text-[var(--text)] font-medium leading-snug">
          {phrase.chinese}
        </p>
      </div>

      {/* Pinyin */}
      <p className="text-sm text-primary-500 font-medium">{phrase.pinyin}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <AudioButton text={phrase.chinese} size="sm" />
        <button
          onClick={() => handleUse(sourceText)}
          className="ml-auto text-xs font-semibold text-primary-500 hover:text-primary-600 px-3 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
        >
          Use in translator →
        </button>
      </div>
    </div>
  );
}

export default function Phrasebook() {
  const [phrases, setPhrases] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showLang, setShowLang] = useState('english');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchPhrasebook(), fetchCategories()])
      .then(([p, c]) => { setPhrases(p); setCategories(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeCategory === 'all'
      ? phrases
      : phrases.filter((p) => p.category === activeCategory);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[var(--text)]">Business Phrasebook</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Essential phrases for China trade & business
        </p>
      </div>

      {/* Language selector */}
      <div className="flex gap-2 mb-4">
        {(['english', 'french', 'arabic']).map((lang) => (
          <button
            key={lang}
            onClick={() => setShowLang(lang)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              showLang === lang
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <span>{LANG_FLAGS[lang]}</span>
            <span className="capitalize">{lang}</span>
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeCategory === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]'
          }`}
        >
          All ({phrases.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === cat.id
                ? 'bg-primary-500 text-white'
                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            <span>{CATEGORY_ICONS[cat.id] || '📝'}</span>
            <span>{cat.label}</span>
            <span className="opacity-70">({cat.count})</span>
          </button>
        ))}
      </div>

      {/* Phrases list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 space-y-2 animate-pulse">
              <div className="w-20 h-4 rounded shimmer" />
              <div className="w-full h-5 rounded shimmer" />
              <div className="w-3/4 h-8 rounded shimmer" />
              <div className="w-1/2 h-4 rounded shimmer" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((phrase) => (
            <PhraseCard key={phrase.id} phrase={phrase} showLang={showLang} />
          ))}
        </div>
      )}
    </div>
  );
}
