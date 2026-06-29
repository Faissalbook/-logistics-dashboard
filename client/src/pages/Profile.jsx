import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchProfile } from '../utils/api';
import { useAppStore } from '../store/appStore';
import Avatar from '../components/Avatar';
import VerifiedBadge from '../components/VerifiedBadge';
import MediaTile from '../components/MediaTile';
import Loader from '../components/Loader';
import { compactNumber } from '../utils/format';

const PinIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const tabs = ['Posts', 'Saved', 'Tagged'];

export default function Profile() {
  const params = useParams();
  const currentUser = useAppStore((s) => s.currentUser);
  const username = params.username || currentUser.username;
  const followingIds = useAppStore((s) => s.followingIds);
  const toggleFollow = useAppStore((s) => s.toggleFollow);

  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Posts');
  const following = data ? Boolean(followingIds[data.user.id]) : false;

  useEffect(() => {
    setData(null);
    fetchProfile(username)
      .then(setData)
      .catch((err) => toast.error(err.message));
  }, [username]);

  if (!data) return <Loader label="Loading profile" />;

  const isSelf = data.user.username === currentUser.username;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
      <header className="card p-5">
        <div className="flex items-start gap-4">
          <Avatar user={data.user} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-bold truncate">{data.user.name}</h2>
              {data.user.verified && <VerifiedBadge size={16} />}
            </div>
            <p className="text-sm text-[var(--text-muted)]">@{data.user.username}</p>
            {data.user.location && (
              <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                <PinIcon /> {data.user.location}
              </p>
            )}
          </div>
        </div>

        {data.user.bio && (
          <p className="text-sm mt-3 whitespace-pre-wrap leading-relaxed">
            {data.user.bio}
          </p>
        )}

        <div className="flex items-center gap-6 mt-4">
          <Stat label="Posts" value={data.user.posts} />
          <Stat label="Followers" value={data.user.followers} />
          <Stat label="Following" value={data.user.following} />
        </div>

        <div className="mt-4 flex gap-2">
          {isSelf ? (
            <Link
              to="/create"
              className="flex-1 btn-primary text-center py-2.5 text-sm"
            >
              Share something
            </Link>
          ) : (
            <button
              onClick={() => toggleFollow(data.user.id)}
              className={
                following
                  ? 'flex-1 border border-[var(--border)] text-[var(--text)] rounded-xl py-2.5 text-sm font-semibold'
                  : 'flex-1 btn-primary py-2.5 text-sm'
              }
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
          <button className="px-4 rounded-xl border border-[var(--border)] text-sm font-semibold">
            Message
          </button>
        </div>
      </header>

      <div className="flex border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              tab === t
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Posts' && (
        <PostGrid posts={data.posts} emptyLabel="No posts yet." />
      )}
      {tab === 'Saved' && (
        <p className="text-sm text-center text-[var(--text-muted)] py-12">
          {isSelf
            ? 'Posts you save will appear here.'
            : 'Saved posts are private.'}
        </p>
      )}
      {tab === 'Tagged' && (
        <p className="text-sm text-center text-[var(--text-muted)] py-12">
          No tagged posts yet.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold tabular-nums">{compactNumber(value)}</p>
      <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}

function PostGrid({ posts, emptyLabel }) {
  if (!posts?.length) {
    return (
      <p className="text-sm text-center text-[var(--text-muted)] py-12">
        {emptyLabel}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {posts.map((p) =>
        p.media ? (
          <MediaTile key={p.id} media={p.media} />
        ) : (
          <div
            key={p.id}
            className="aspect-square rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-3"
          >
            <p className="text-[11px] font-medium line-clamp-6 leading-tight">{p.text}</p>
          </div>
        )
      )}
    </div>
  );
}
