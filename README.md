# 中文 AI Translator

AI-powered multilingual translator from Arabic, French & English into Simplified Chinese Mandarin with Pinyin pronunciation.

## Features

- 🌐 Auto-detect Arabic, French, English
- 🇨🇳 Accurate Simplified Chinese translation via OpenAI GPT-4o
- 🔤 Full Pinyin with tone marks (pinyin-pro)
- 🔊 Native Chinese audio (Web Speech API)
- 📱 Mobile-first responsive design
- 🌙 Dark / Light mode
- 📚 Translation history (up to 100)
- ⭐ Favorites / bookmarks
- 📖 Business Chinese phrasebook (26 phrases, 8 categories)
- 🎤 Voice input (browser SpeechRecognition API)
- 📋 Copy, Share, Export

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Configure API key
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Start development servers
npm run dev
```

- Client: http://localhost:5173
- Server API: http://localhost:3001

## Production Build

```bash
npm run build   # builds client into client/dist
npm start       # serves everything from Express on port 3001
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| State | Zustand (persisted to localStorage) |
| Routing | React Router v6 |
| Backend | Node.js, Express |
| AI | OpenAI GPT-4o-mini |
| Pinyin | pinyin-pro |
| TTS | Web Speech API (browser-native) |
| Voice Input | Web SpeechRecognition API |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/translate` | Translate text to Chinese + Pinyin |
| GET | `/api/phrasebook` | Get business phrases |
| GET | `/api/phrasebook/categories` | Get phrase categories |
| GET | `/api/health` | Server health & API key status |

## Environment Variables

```env
OPENAI_API_KEY=sk-...      # Required for translation
PORT=3001                  # Server port (default: 3001)
CLIENT_URL=http://localhost:5173  # For CORS
NODE_ENV=development
```
