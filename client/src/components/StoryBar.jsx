import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchStories } from '../utils/api';

export default function StoryBar() {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    fetchStories()
      .then((r) => setStories(r.stories))
      .catch(() => setStories([]));
  }, []);

  if (!stories.length) return null;

  return (
    <div className="overflow-x-auto -mx-4 px-4 mb-4">
      <div className="flex gap-3 pb-1">
        {stories.map((s) => (
          <button
            key={s.id}
            onClick={() => toast(`${s.user?.name || 'Story'} · coming soon`)}
            className="flex flex-col items-center gap-1.5 shrink-0 w-16"
          >
            <span
              className={`relative inline-flex p-[2px] rounded-full ${
                s.seen
                  ? 'bg-[var(--border)]'
                  : 'bg-gradient-to-tr from-primary-500 via-gold to-primary-700'
              }`}
            >
              <span
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold border-2 border-[var(--bg)]"
                style={{
                  background: `linear-gradient(135deg, ${s.user?.avatarColor || '#E63946'}, rgba(0,0,0,.25))`,
                }}
              >
                {s.isOwn ? '+' : s.user?.avatarInitials}
              </span>
            </span>
            <span className="text-[11px] text-[var(--text-muted)] truncate w-full text-center font-medium">
              {s.isOwn ? 'You' : s.user?.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
