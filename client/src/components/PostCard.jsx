import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { likePost, addComment, fetchComments } from '../utils/api';
import { compactNumber, timeAgo } from '../utils/format';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MediaTile from './MediaTile';

const HeartIcon = ({ filled }) => (
  <svg width="22" height="22" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} viewBox="0 0 24 24">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CommentIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const BookmarkIcon = ({ filled }) => (
  <svg width="22" height="22" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} viewBox="0 0 24 24">
    <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const MoreIcon = () => (
  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);

export default function PostCard({ post, onChange }) {
  const liked = useAppStore((s) => s.isLiked(post.id));
  const saved = useAppStore((s) => s.isSaved(post.id));
  const toggleLike = useAppStore((s) => s.toggleLike);
  const toggleSave = useAppStore((s) => s.toggleSave);

  const [likes, setLikes] = useState(post.likes);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [comments, setComments] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLike = async () => {
    const next = !liked;
    toggleLike(post.id);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      await likePost(post.id, next);
      onChange?.();
    } catch (err) {
      setLikes((n) => n + (next ? -1 : 1));
      toggleLike(post.id);
      toast.error(err.message);
    }
  };

  const handleSave = () => {
    toggleSave(post.id);
    toast.success(saved ? 'Removed from saved' : 'Saved');
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/p/${post.id}` : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: post.author?.name || 'Triboo', text: post.text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch {
      /* user cancelled */
    }
  };

  const openComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments == null) {
      try {
        const { comments: list } = await fetchComments(post.id);
        setComments(list);
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      const { comment } = await addComment(post.id, draft.trim());
      setComments((list) => [comment, ...(list || [])]);
      setCommentCount((c) => c + 1);
      setDraft('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card overflow-hidden mb-4">
      <header className="flex items-center justify-between px-4 pt-4">
        <Link
          to={`/profile/${post.author?.username || ''}`}
          className="flex items-center gap-3 min-w-0"
        >
          <Avatar user={post.author} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm truncate">{post.author?.name}</span>
              {post.author?.verified && <VerifiedBadge size={13} />}
            </div>
            <p className="text-xs text-[var(--text-muted)] truncate">
              @{post.author?.username} · {timeAgo(post.createdAt)}
            </p>
          </div>
        </Link>
        <button className="btn-icon text-[var(--text-muted)]" aria-label="More">
          <MoreIcon />
        </button>
      </header>

      {post.text && (
        <p className="px-4 mt-3 text-[15px] leading-relaxed whitespace-pre-wrap text-balance">
          {post.text}
        </p>
      )}

      {post.tags?.length > 0 && (
        <div className="px-4 mt-2 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <span
              key={t}
              className="text-xs font-medium text-primary-500 hover:underline cursor-pointer"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {post.media && (
        <div className="px-4 mt-3">
          <MediaTile media={post.media} aspect="square" />
        </div>
      )}

      <div className="flex items-center justify-between px-2 pt-2">
        <div className="flex items-center">
          <button
            onClick={handleLike}
            className={`btn-icon ${liked ? 'text-primary-500' : 'text-[var(--text-muted)]'}`}
            aria-label="Like"
          >
            <motion.span
              whileTap={{ scale: 0.8 }}
              animate={liked ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <HeartIcon filled={liked} />
            </motion.span>
          </button>
          <button
            onClick={openComments}
            className="btn-icon text-[var(--text-muted)]"
            aria-label="Comments"
          >
            <CommentIcon />
          </button>
          <button
            onClick={handleShare}
            className="btn-icon text-[var(--text-muted)]"
            aria-label="Share"
          >
            <ShareIcon />
          </button>
        </div>
        <button
          onClick={handleSave}
          className={`btn-icon ${saved ? 'text-gold' : 'text-[var(--text-muted)]'}`}
          aria-label="Save"
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>

      <div className="px-4 pb-3 text-sm">
        <span className="font-semibold">{compactNumber(likes)} likes</span>
        {commentCount > 0 && (
          <button
            onClick={openComments}
            className="ml-3 text-[var(--text-muted)] hover:underline"
          >
            View {compactNumber(commentCount)} comments
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="border-t border-[var(--border)] overflow-hidden"
          >
            <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto">
              {comments == null && (
                <p className="text-xs text-[var(--text-muted)]">Loading comments…</p>
              )}
              {comments?.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">Be the first to comment.</p>
              )}
              {comments?.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar user={c.author} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      <span className="font-semibold">{c.author?.name}</span>{' '}
                      <span className="text-[var(--text)]">{c.text}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {timeAgo(c.createdAt)} · {c.likes || 0} likes
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <form
              onSubmit={submitComment}
              className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)]/40"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a comment…"
                className="input-base flex-1 text-sm"
              />
              <button
                type="submit"
                disabled={!draft.trim() || busy}
                className="text-sm font-semibold text-primary-500 disabled:opacity-40"
              >
                Post
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
