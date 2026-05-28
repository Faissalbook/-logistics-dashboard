import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

let phraseCache = null;

function getPhrases() {
  if (!phraseCache) {
    const filePath = join(__dirname, '../data/phrasebook.json');
    phraseCache = JSON.parse(readFileSync(filePath, 'utf-8'));
  }
  return phraseCache;
}

router.get('/', (req, res) => {
  const { category } = req.query;
  const phrases = getPhrases();
  const filtered = category
    ? phrases.filter((p) => p.category === category)
    : phrases;
  res.json(filtered);
});

router.get('/categories', (req, res) => {
  const phrases = getPhrases();
  const categories = [...new Set(phrases.map((p) => p.category))].map((cat) => ({
    id: cat,
    label: phrases.find((p) => p.category === cat)?.categoryLabel ?? cat,
    count: phrases.filter((p) => p.category === cat).length,
  }));
  res.json(categories);
});

export default router;
