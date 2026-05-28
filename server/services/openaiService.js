import OpenAI from 'openai';

let openaiClient = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. Please add it to your .env file.');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are an expert Chinese language translator and linguist specializing in Simplified Chinese Mandarin. You translate Arabic, French, English, and other languages into natural, fluent Simplified Chinese suitable for business and everyday communication with Chinese-speaking partners.`;

const USER_PROMPT = (text) => `Translate the following text into Simplified Chinese (Mandarin). Return ONLY a valid JSON object with no markdown or code blocks.

Text: "${text}"

JSON format:
{
  "detectedLanguage": "english" | "french" | "arabic" | "other",
  "detectedLanguageName": "full language name in English",
  "chineseText": "accurate Simplified Chinese translation",
  "romanization": "optional transliteration hint for Arabic input",
  "formalityLevel": "formal" | "informal" | "business",
  "notes": "brief translation note if important, otherwise empty string"
}

Rules:
- Keep brand names, model numbers, acronyms (SUV, BMW, iPhone, etc.) in their original form
- Use natural, fluent Mandarin Chinese appropriate for the context
- For business/trade terms, use professional Chinese business language
- Detect the source language accurately (look for Arabic script, French diacritics, etc.)
- Return ONLY the JSON object, nothing else`;

export async function translateWithOpenAI(text) {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT(text) },
    ],
    temperature: 0.2,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  const parsed = JSON.parse(content);

  if (!parsed.chineseText) {
    throw new Error('Invalid translation response from AI');
  }

  return parsed;
}
