import { Link } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { compactNumber } from '../utils/format';

export default function SuggestedUser({ user }) {
  const following = useAppStore((s) => s.isFollowing(user.id));
  const toggle = useAppStore((s) => s.toggleFollow);
  return (
    <div className="flex items-center gap-3">
      <Link to={`/profile/${user.username}`}>
        <Avatar user={user} size="md" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/profile/${user.username}`} className="flex items-center gap-1">
          <span className="text-sm font-semibold truncate">{user.name}</span>
          {user.verified && <VerifiedBadge size={12} />}
        </Link>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {compactNumber(user.followers)} followers
        </p>
      </div>
      <button
        onClick={() => toggle(user.id)}
        className={
          following
            ? 'text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text)]'
            : 'text-xs font-semibold px-3 py-1.5 rounded-full bg-primary-500 text-white active:scale-95 transition'
        }
      >
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}
