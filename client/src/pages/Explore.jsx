import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFeed, fetchTrending, fetchUsers } from '../utils/api';
import TrendingList from '../components/TrendingList';
import SuggestedUser from '../components/SuggestedUser';
import MediaTile from '../components/MediaTile';
import Loader from '../components/Loader';

const SearchIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export default function Explore() {
  const [posts, setPosts] = useState(null);
  const [trending, setTrending] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([fetchFeed(), fetchTrending(), fetchUsers()])
      .then(([f, t, u]) => {
        setPosts(f.posts);
        setTrending(t.trending);
        setUsers(u.users.filter((x) => x.username !== 'you'));
      })
      .catch(() => setPosts([]));
  }, []);

  const filtered = useMemo(() => {
    if (!posts) return null;
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.text?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q)) ||
        p.author?.name.toLowerCase().includes(q) ||
        p.author?.username.toLowerCase().includes(q)
    );
  }, [posts, query]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
      <div className="card flex items-center gap-2 px-4 py-3">
        <span className="text-[var(--text-muted)]">
          <SearchIcon />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, posts, tags…"
          className="input-base text-sm"
        />
      </div>

      <TrendingList items={trending.slice(0, 5)} />

      {users.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-bold mb-3">Suggested for you</h2>
          <div className="space-y-3">
            {users.slice(0, 4).map((u) => (
              <SuggestedUser key={u.id} user={u} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold mb-3 px-1">Discover</h2>
        {filtered == null ? (
          <Loader label="Loading posts" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            No posts match “{query}”.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to={`/profile/${p.author?.username || ''}`}
                className="relative group"
              >
                {p.media ? (
                  <MediaTile media={p.media} />
                ) : (
                  <div className="aspect-square rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-3 flex">
                    <p className="text-[11px] font-medium text-[var(--text)] line-clamp-6 leading-tight">
                      {p.text}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
