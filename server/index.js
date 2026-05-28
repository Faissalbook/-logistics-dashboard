import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import rateLimit from 'express-rate-limit';
import translateRoutes from './routes/translate.js';
import phrasebookRoutes from './routes/phrasebook.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', apiLimiter);
app.use('/api/translate', translateRoutes);
app.use('/api/phrasebook', phrasebookRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')));
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 Chinese Translator server running on http://localhost:${PORT}`);
  console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Loaded' : '❌ Missing (add to .env)'}\n`);
});
