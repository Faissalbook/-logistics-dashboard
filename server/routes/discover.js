import { Router } from 'express';
import { getTrending, getStories } from '../store.js';

const router = Router();

router.get('/trending', (_req, res) => {
  res.json({ trending: getTrending() });
});

router.get('/stories', (_req, res) => {
  res.json({ stories: getStories() });
});

export default router;
