import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchNotifications, markNotificationsRead } from '../utils/api';
import Avatar from '../components/Avatar';
import Loader from '../components/Loader';
import { timeAgo } from '../utils/format';

const verbs = {
  like: 'liked your post',
  follow: 'started following you',
  comment: 'commented:',
  mention: 'mentioned you:',
};

export default function Notifications() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetchNotifications()
      .then((r) => setItems(r.notifications))
      .catch((err) => {
        toast.error(err.message);
        setItems([]);
      });
  }, []);

  const handleClearAll = async () => {
    try {
      const { notifications } = await markNotificationsRead();
      setItems(notifications);
      toast.success('Caught up');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (items == null) return <Loader label="Loading activity" />;

  const unread = items.filter((n) => !n.read);
  const read = items.filter((n) => n.read);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {unread.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            New · {unread.length}
          </p>
          <button
            onClick={handleClearAll}
            className="text-xs font-semibold text-primary-500"
          >
            Mark all read
          </button>
        </div>
      )}

      <div className="card divide-y divide-[var(--border)]">
        {unread.concat(read).map((n) => (
          <Link
            key={n.id}
            to={n.post ? '/' : `/profile/${n.actor?.username || ''}`}
            className={`flex items-start gap-3 p-3 ${
              !n.read ? 'bg-primary-500/[0.04]' : ''
            }`}
          >
            <Avatar user={n.actor} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">
                <span className="font-semibold">{n.actor?.name}</span>{' '}
                <span className="text-[var(--text-muted)]">{verbs[n.type]}</span>{' '}
                {n.preview && <span className="text-[var(--text)]">"{n.preview}"</span>}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {timeAgo(n.createdAt)}
              </p>
            </div>
            {!n.read && (
              <span className="w-2 h-2 mt-2 rounded-full bg-primary-500 shrink-0" />
            )}
          </Link>
        ))}
        {items.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--text-muted)]">
            No activity yet.
          </p>
        )}
      </div>
    </div>
  );
}
