import { Router } from 'express';
import { getUsers, getUserByUsername, getPostsByAuthor } from '../store.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ users: getUsers() });
});

router.get('/:username', (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const posts = getPostsByAuthor(user.id);
  res.json({ user, posts });
});

export default router;
