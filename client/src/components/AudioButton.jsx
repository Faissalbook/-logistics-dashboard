import { useState, useCallback } from 'react';
import { speakChinese, stopSpeaking, isSupported } from '../utils/tts';

const PlayIcon = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const StopIcon = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
);

export default function AudioButton({ text, size = 'md', showLabel = true }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const supported = isSupported();

  const handleClick = useCallback(async () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    await speakChinese(text);
    setIsPlaying(false);
  }, [text, isPlaying]);

  if (!supported) return null;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center rounded-xl font-medium transition-all duration-200 active:scale-95
        ${sizeClasses[size]}
        ${isPlaying
          ? 'bg-primary-500 text-white shadow-sm glow-primary'
          : 'bg-[var(--bg)] hover:bg-primary-50 dark:hover:bg-primary-500/10 text-[var(--text)] border border-[var(--border)]'
        }
      `}
      aria-label={isPlaying ? 'Stop pronunciation' : 'Play pronunciation'}
    >
      {isPlaying ? (
        <>
          <div className="audio-wave text-white flex gap-0.5 items-center h-4">
            <span style={{ animationDelay: '0s' }} />
            <span style={{ animationDelay: '0.15s' }} />
            <span style={{ animationDelay: '0.3s' }} />
            <span style={{ animationDelay: '0.45s' }} />
          </div>
          {showLabel && <span>Stop</span>}
        </>
      ) : (
        <>
          <span className="text-primary-500">
            <PlayIcon />
          </span>
          {showLabel && <span>Play Pronunciation</span>}
        </>
      )}
    </button>
  );
}
