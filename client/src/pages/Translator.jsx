import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import TranslationResult from '../components/TranslationResult';

const LANG_FLAGS = { english: '🇬🇧', french: '🇫🇷', arabic: '🇸🇦', other: '🌐' };
const MAX_CHARS = 2000;

const MicIcon = ({ active }) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
    className={active ? 'text-red-500' : ''}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

const ClearIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const PLACEHOLDER_EXAMPLES = [
  'Type or speak in Arabic, French or English…',
  'مرحباً، أريد شراء بضائع من الصين',
  'Bonjour, je cherche un fournisseur de pneus',
  'Hello, I want to buy SUV tires',
];

function LoadingSkeleton() {
  return (
    <div className="card p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full shimmer" />
        <div className="w-32 h-4 rounded shimmer" />
      </div>
      <div className="w-full h-10 rounded-lg shimmer" />
      <div className="w-3/4 h-6 rounded shimmer" />
      <div className="h-px bg-[var(--border)]" />
      <div className="flex gap-2">
        <div className="w-32 h-8 rounded-xl shimmer" />
        <div className="ml-auto flex gap-2">
          <div className="w-8 h-8 rounded-xl shimmer" />
          <div className="w-8 h-8 rounded-xl shimmer" />
        </div>
      </div>
    </div>
  );
}

export default function Translator() {
  const { inputText, setInputText, translate, isLoading, error, currentTranslation, clearInput } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  // Rotate placeholder examples
  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length), 3000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = useCallback(() => {
    if (inputText.trim() && !isLoading) {
      translate(inputText);
    }
  }, [inputText, isLoading, translate]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Try Chrome or Safari.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setInputText(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        translate(transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const charCount = inputText.length;
  const isNearLimit = charCount > MAX_CHARS * 0.8;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      {/* Input card */}
      <div className="card p-4 sm:p-5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {currentTranslation ? LANG_FLAGS[currentTranslation.detected] || '🌐' : '🌐'}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {currentTranslation
                ? `Detected: ${currentTranslation.detectedName || currentTranslation.detected}`
                : 'Auto-detect language'}
            </span>
          </div>
          {inputText && (
            <button
              onClick={clearInput}
              className="btn-icon w-7 h-7 text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <ClearIcon />
            </button>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER_EXAMPLES[placeholderIdx]}
          maxLength={MAX_CHARS}
          rows={4}
          className="input-base min-h-[100px] max-h-[200px]"
          dir={/[؀-ۿ]/.test(inputText) ? 'rtl' : 'ltr'}
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {/* Voice input */}
            <button
              onClick={handleVoice}
              className={`btn-icon ${isRecording ? 'bg-red-50 dark:bg-red-900/20 text-red-500 animate-pulse' : 'text-[var(--text-muted)] hover:text-primary-500'}`}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              <MicIcon active={isRecording} />
            </button>
            <span className={`text-xs ${isNearLimit ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
              {charCount}/{MAX_CHARS}
            </span>
          </div>

          {/* Translate button */}
          <button
            onClick={handleSubmit}
            disabled={!inputText.trim() || isLoading}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
              transition-all duration-200 active:scale-95
              ${inputText.trim() && !isLoading
                ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm'
                : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)] cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Translating…</span>
              </>
            ) : (
              <>
                <span>Translate</span>
                <ArrowIcon />
              </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-[var(--text-muted)] mt-2">
          Tip: Press <kbd className="px-1 py-0.5 bg-[var(--bg)] rounded text-[9px] border border-[var(--border)]">⌘ Enter</kbd> to translate
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          {error.includes('API key') && (
            <p className="text-xs text-red-500 mt-1">
              Add your <code className="font-mono">OPENAI_API_KEY</code> to the server <code className="font-mono">.env</code> file and restart.
            </p>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && <LoadingSkeleton />}

      {/* Result */}
      {!isLoading && currentTranslation && (
        <TranslationResult result={currentTranslation} />
      )}

      {/* Welcome state */}
      {!isLoading && !currentTranslation && !error && (
        <div className="text-center py-10 space-y-3">
          <div className="text-5xl">🐉</div>
          <h2 className="text-xl font-bold text-[var(--text)]">Ready to Translate</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">
            Type in Arabic, French, or English and get instant Chinese translation with Pinyin pronunciation.
          </p>
          <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto mt-6">
            {[
              { flag: '🇸🇦', text: 'أريد شراء إطارات SUV' },
              { flag: '🇫🇷', text: 'Je veux acheter des pneus SUV' },
              { flag: '🇬🇧', text: 'Hello my friend, I want to buy SUV tires' },
            ].map(({ flag, text }) => (
              <button
                key={text}
                onClick={() => { setInputText(text); translate(text); }}
                className="flex items-center gap-3 text-left p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-primary-300 hover:shadow-card transition-all duration-200 group"
              >
                <span className="text-xl">{flag}</span>
                <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors line-clamp-1">
                  {text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
