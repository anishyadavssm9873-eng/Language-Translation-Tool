# Polyglot Language Translation Tool 🌐

A complete, production-grade Language Translation web application built with a decoupled React frontend and Node.js/Express backend. All translation requests and API keys are strictly kept on the server side, ensuring zero credential exposure to clients.

---

## 📸 Screenshots & Architecture

```
+-------------------------------------------------------------+
|                      Polyglot Translator                    |
| [From: Auto-detect (Spanish)]   [ <-> Swap ]   [To: English]|
+-------------------------------+-----------------------------+
| Source Panel                  | Translation Panel           |
| "¿Dónde está la estación de   | "Where is the nearest       |
| tren más cercana?"            | train station?"             |
|                               |                             |
| 🎙️ Voice Input   42 / 5000   | 🔊 Speak  📋 Copy (Copied!)|
+-------------------------------+-----------------------------+
| [Clear All]                   | [Instant Translate] [Translate]
+-------------------------------------------------------------+
```

### Architecture Overview
```
┌──────────────────────┐         JSON /api/*          ┌──────────────────────────┐
│  React (Vite) App    │ <══════════════════════════> │  Express Backend         │
│  - Dark / Light Mode │  (Rate Limit: 30-60 req/min) │  - Helmet Security       │
│  - Web Speech TTS/STT│                              │  - In-Memory LRU Cache   │
│  - Auto-detection    │                              │  - Provider Abstraction  │
└──────────────────────┘                              └─────────────┬────────────┘
                                                                    │ Secret API Key
                                                                    ▼
                                                      ┌──────────────────────────┐
                                                      │ Google Cloud Translate v2│
                                                      │ (or LibreTranslate / MS) │
                                                      └──────────────────────────┘
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Web Speech API (`SpeechSynthesis` & `webkitSpeechRecognition`)
- **Backend**: Node.js, Express, `cors`, `helmet`, `express-rate-limit`, `dotenv`
- **Translation Provider**: Google Cloud Translation API (v2) with swappable abstraction for LibreTranslate, Microsoft Azure, and Gemini
- **Caching**: Server-side in-memory `Map` caching to eliminate duplicate API costs and reduce latency to 0ms

---

## 📁 Project Structure

```
translator-app/
├── backend/
│   ├── server.js                          # Standalone Express server entry point
│   ├── routes/
│   │   └── translate.js                   # API route definitions
│   ├── controllers/
│   │   └── translateController.js         # Input validation & response formatting
│   ├── services/
│   │   └── translationService.js          # Pluggable provider & caching engine
│   ├── middleware/
│   │   └── errorHandler.js                # Centralized error middleware
│   ├── .env.example                       # Template for secrets
│   └── package.json                       # Backend dependencies
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── LanguageSelector.jsx       # Source/Target dropdowns & quick pills
    │   │   ├── TextInput.jsx              # Textarea, char counter, voice input
    │   │   ├── TranslationOutput.jsx      # Read-only output, copy, audio TTS
    │   │   └── Controls.jsx               # Translate button, spinner, clear
    │   ├── services/
    │   │   └── api.js                     # Secure client API wrapper
    │   ├── App.jsx                        # Root React layout
    │   └── main.jsx                       # React entry point
    ├── index.html
    └── package.json
```

---

## 🚀 Step-by-Step Setup Instructions

### Step 1: Obtain a Google Cloud Translation API Key

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Google Cloud project or select an existing one.
3. Enable billing for your project.
4. Navigate to **APIs & Services > Library**.
5. Search for **Cloud Translation API** and click **Enable**.
6. Go to **APIs & Services > Credentials** and click **+ Create Credentials > API Key**.
7. *(Recommended)* Under **API Restrictions**, restrict this key exclusively to the "Cloud Translation API".
8. Copy the generated key.

---

### Step 2: Configure Environment Variables

Create `.env` inside the `backend/` directory:

```bash
cd backend
cp .env.example .env
```

Open `.env` and configure:
```env
PORT=5000
NODE_ENV=development

# Active Translation Provider: 'google' | 'libretranslate' | 'microsoft'
TRANSLATION_PROVIDER=google

# Your Google Cloud Translation API Key
GOOGLE_TRANSLATE_API_KEY="AIzaSyYourGoogleApiKeyHere"

# Frontend origins permitted by CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

---

### Step 3: Install Dependencies & Run

#### Terminal 1: Start Backend Server
```bash
cd backend
npm install
npm run dev
# Backend starts on http://localhost:5000
```

#### Terminal 2: Start Frontend Application
```bash
cd frontend
npm install
npm run dev
# Frontend starts on http://localhost:5173
```

---

## 🔌 API Documentation & cURL Examples

### 1. Translate Text
**`POST /api/translate`**

```bash
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you doing today?",
    "source": "auto",
    "target": "es"
  }'
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "translatedText": "Hola, ¿cómo estás hoy?",
  "detectedSourceLanguage": "en",
  "cached": false,
  "provider": "google"
}
```

---

### 2. Supported Languages List
**`GET /api/languages`**

```bash
curl http://localhost:3000/api/languages
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "languages": [
    { "code": "en", "name": "English" },
    { "code": "es", "name": "Spanish" },
    { "code": "fr", "name": "French" },
    { "code": "de", "name": "German" },
    { "code": "ja", "name": "Japanese" },
    { "code": "zh", "name": "Chinese" }
  ]
}
```

---

### 3. Detect Language
**`POST /api/detect`**

```bash
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bonjour tout le monde"
  }'
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "language": "fr",
  "confidence": 0.99
}
```

---

### 4. Health & Cache Stats
**`GET /api/health`**

```bash
curl http://localhost:3000/api/health
```

**Response (HTTP 200 OK):**
```json
{
  "status": "ok",
  "uptime": 124,
  "timestamp": "2026-10-28T12:00:00.000Z",
  "provider": "google",
  "cache": {
    "size": 14,
    "maxEntries": 5000,
    "hits": 32,
    "misses": 14
  }
}
```

---

## 🔄 Swapping Providers

To swap to LibreTranslate or Microsoft Azure without changing business logic:
1. Open `backend/.env`
2. Change `TRANSLATION_PROVIDER=libretranslate` or `TRANSLATION_PROVIDER=microsoft`
3. Add the corresponding credentials (e.g., `LIBRETRANSLATE_URL` or `AZURE_TRANSLATOR_KEY`)
4. The service dynamically routes requests through that provider!

---

## ⚠️ Common Errors and Troubleshooting

| Error | Root Cause | Solution |
|---|---|---|
| **403 Forbidden / API Key invalid** | Cloud Translation API is disabled or key has bad restrictions | In Google Cloud Console, enable "Cloud Translation API" and ensure billing is active on the account. |
| **429 Too Many Requests** | Exceeded rate limit (>30 req/min per IP) | Wait 60 seconds. You can tune `max` in `backend/server.js` if higher throughput is needed. |
| **CORS Blocked** | Frontend domain not in backend whitelist | Add your frontend origin (e.g. `http://localhost:5173`) to `CORS_ORIGIN` in `backend/.env`. |
| **Microphone not working** | Browser permission blocked or insecure HTTP | Web Speech API requires `localhost` or `https://`. Click the site lock in your browser address bar to allow Microphone. |
| **Empty translation** | Empty string provided in request body | Ensure `text` has at least 1 character and does not exceed 5000 characters. |

---

## 🚢 Deployment Suggestions

### 1. Backend (Render / Railway / Fly.io)
- Connect your GitHub repo.
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variables:
  - `GOOGLE_TRANSLATE_API_KEY`: Your key
  - `CORS_ORIGIN`: `https://your-frontend-domain.vercel.app`

### 2. Frontend (Vercel / Netlify)
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Proxy Configuration in `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-app.onrender.com/api/:path*"
    }
  ]
}
```
