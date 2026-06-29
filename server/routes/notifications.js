import { Router } from 'express';
import { getNotifications, markAllNotificationsRead } from '../store.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ notifications: getNotifications() });
});

router.post('/read', (_req, res) => {
  res.json({ notifications: markAllNotificationsRead() });
});

export default router;
