import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createPost } from '../utils/api';
import { useAppStore } from '../store/appStore';
import Avatar from '../components/Avatar';
import MediaTile from '../components/MediaTile';

const PALETTES = [
  { kind: 'gradient', from: '#E63946', to: '#7C2D12', label: 'Sunset · Roma' },
  { kind: 'gradient', from: '#0EA5E9', to: '#1E293B', label: 'Twilight' },
  { kind: 'gradient', from: '#C9A227', to: '#F5E6A3', label: 'Golden' },
  { kind: 'gradient', from: '#8B5CF6', to: '#EC4899', label: 'Aperitivo' },
  { kind: 'gradient', from: '#10B981', to: '#064E3B', label: 'Garden' },
  { kind: 'gradient', from: '#F59E0B', to: '#7C2D12', label: 'Espresso' },
];

export default function Create() {
  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [media, setMedia] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const parsedTags = tags
        .split(/[,\s#]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6);
      await createPost({
        authorId: currentUser.id,
        text: text.trim(),
        tags: parsedTags,
        media,
      });
      toast.success('Posted to Triboo');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <Avatar user={currentUser} size="md" />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's happening in Italia?"
            className="input-base min-h-[120px]"
            maxLength={500}
          />
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags · design milano coffee"
            className="input-base text-sm"
          />
          <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
            {text.length}/500
          </span>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">Cover</h2>
          {media && (
            <button
              type="button"
              onClick={() => setMedia(null)}
              className="text-xs font-semibold text-primary-500"
            >
              Remove
            </button>
          )}
        </div>
        {media ? (
          <MediaTile media={media} aspect="video" />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setMedia(p)}
                className="aspect-square rounded-xl relative overflow-hidden active:scale-95 transition"
                style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                aria-label={`Pick ${p.label} cover`}
              >
                <span className="absolute bottom-1.5 left-2 right-2 text-[10px] uppercase tracking-wide font-semibold text-white/90 text-left">
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!text.trim() || busy}
        className="btn-primary w-full py-3 text-base disabled:opacity-40"
      >
        {busy ? 'Posting…' : 'Share post'}
      </button>
    </form>
  );
}
