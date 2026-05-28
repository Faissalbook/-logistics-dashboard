import { Router } from 'express';
import { translateWithOpenAI } from '../services/openaiService.js';
import { generatePinyinData } from '../services/pinyinService.js';

const router = Router();

router.post('/', async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (text.trim().length > 2000) {
    return res.status(400).json({ error: 'Text too long (max 2000 characters)' });
  }

  try {
    const aiResult = await translateWithOpenAI(text.trim());
    const pinyinData = generatePinyinData(aiResult.chineseText);

    res.json({
      original: text.trim(),
      detected: aiResult.detectedLanguage,
      detectedName: aiResult.detectedLanguageName,
      chinese: aiResult.chineseText,
      pinyin: pinyinData.full,
      pinyinParts: pinyinData.parts,
      formalityLevel: aiResult.formalityLevel,
      notes: aiResult.notes || '',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Translation error:', err.message);
    const isConfigError = err.message.includes('OPENAI_API_KEY');
    res.status(isConfigError ? 503 : 500).json({
      error: isConfigError
        ? 'API key not configured. Please add OPENAI_API_KEY to your .env file.'
        : 'Translation failed. Please try again.',
    });
  }
});

export default router;
