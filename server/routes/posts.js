import { Router } from 'express';
import {
  getFeed,
  getPostById,
  createPost,
  togglePostLike,
  getCommentsForPost,
  addComment,
} from '../store.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ posts: getFeed() });
});

router.post('/', (req, res) => {
  const { text, tags, media, authorId = 'u_006' } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Post text is required.' });
  }
  const post = createPost({ authorId, text: text.trim(), tags, media });
  res.status(201).json({ post });
});

router.get('/:id', (req, res) => {
  const post = getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  res.json({ post });
});

router.post('/:id/like', (req, res) => {
  const { liked } = req.body || {};
  const post = togglePostLike(req.params.id, Boolean(liked));
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  res.json({ post });
});

router.get('/:id/comments', (req, res) => {
  res.json({ comments: getCommentsForPost(req.params.id) });
});

router.post('/:id/comments', (req, res) => {
  const { text, authorId = 'u_006' } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }
  const comment = addComment(req.params.id, { authorId, text: text.trim() });
  res.status(201).json({ comment });
});

export default router;
