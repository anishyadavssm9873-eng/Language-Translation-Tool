import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Terminal,
  Key,
  FolderGit2,
  AlertTriangle,
  CloudUpload,
  FileCode2,
  ExternalLink,
} from 'lucide-react';

interface CodeDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeDocsModal: React.FC<CodeDocsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'curl' | 'files' | 'troubleshooting' | 'deploy'>('setup');
  const [selectedFile, setSelectedFile] = useState<string>('backend/server.js');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const fileContents: Record<string, string> = {
    'backend/server.js': `// backend/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import translateRoutes from './routes/translate.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers
app.use(helmet());

// CORS Whitelist
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

// Rate Limit: 30 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: {
      message: 'Too many requests. Please wait a minute before translating again.',
      statusCode: 429,
    },
  },
});

app.use('/api', apiLimiter, translateRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Translation Backend' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(\`Backend running on port \${PORT}\`);
});`,

    'backend/services/translationService.js': `// backend/services/translationService.js
// Swappable provider architecture:
// Default: Google Cloud Translation API (v2)
// Easily change to LibreTranslate or Microsoft Azure by changing ACTIVE_PROVIDER

import { AppError } from '../middleware/errorHandler.js';

export class GoogleTranslateProvider {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GOOGLE_TRANSLATE_API_KEY;
  }

  async translate({ text, source, target }) {
    if (!this.apiKey) {
      throw new AppError('GOOGLE_TRANSLATE_API_KEY is not configured in .env', 500);
    }

    const url = new URL('https://translation.googleapis.com/language/translate/v2');
    url.searchParams.append('key', this.apiKey);

    const body = { q: text, target, format: 'text' };
    if (source && source !== 'auto') {
      body.source = source;
    }

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new AppError(err.error?.message || 'Google Translate API error', res.status);
    }

    const data = await res.json();
    const item = data.data?.translations?.[0];
    return {
      translatedText: item?.translatedText || '',
      detectedSourceLanguage: item?.detectedSourceLanguage || (source !== 'auto' ? source : undefined),
    };
  }
}

// In-Memory Map Cache
const cache = new Map();

export async function translateTextService(text, source, target) {
  const cacheKey = \`\${source}->\${target}:\${text.trim().toLowerCase()}\`;
  if (cache.has(cacheKey)) {
    return { ...cache.get(cacheKey), cached: true };
  }

  const provider = new GoogleTranslateProvider();
  const result = await provider.translate({ text, source, target });

  cache.set(cacheKey, result);
  return { ...result, cached: false };
}`,

    'backend/controllers/translateController.js': `// backend/controllers/translateController.js
import { translateTextService } from '../services/translationService.js';
import { AppError } from '../middleware/errorHandler.js';

export async function translateText(req, res, next) {
  try {
    const { text, source = 'auto', target } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new AppError('The "text" field is required and must not be empty.', 400);
    }

    if (text.length > 5000) {
      throw new AppError('Text length exceeds 5,000 character limit.', 400);
    }

    if (!target || typeof target !== 'string') {
      throw new AppError('A valid destination "target" language code is required.', 400);
    }

    const result = await translateTextService(text, source, target);

    res.json({
      success: true,
      translatedText: result.translatedText,
      detectedSourceLanguage: result.detectedSourceLanguage,
      cached: result.cached,
    });
  } catch (error) {
    next(error);
  }
}`,

    'backend/routes/translate.js': `// backend/routes/translate.js
import { Router } from 'express';
import {
  translateText,
  getLanguages,
  detectLanguage,
  getHealth,
} from '../controllers/translateController.js';

const router = Router();

router.get('/languages', getLanguages);
router.post('/translate', translateText);
router.post('/detect', detectLanguage);
router.get('/health', getHealth);

export default router;`,

    'backend/middleware/errorHandler.js': `// backend/middleware/errorHandler.js
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(\`[\${new Date().toISOString()}] Error \${statusCode}: \${message}\`);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      details: err.details || null,
    },
  });
}`,

    'backend/.env.example': `PORT=5000
NODE_ENV=development
TRANSLATION_PROVIDER=google
GOOGLE_TRANSLATE_API_KEY=your_google_cloud_api_key_here
CORS_ORIGIN=http://localhost:3000,http://localhost:5173`,

    'frontend/src/services/api.js': `// frontend/src/services/api.js
const API_BASE = '/api';

export async function fetchLanguages() {
  const res = await fetch(\`\${API_BASE}/languages\`);
  if (!res.ok) throw new Error('Failed to load languages');
  const data = await res.json();
  return data.languages;
}

export async function translateText({ text, source, target }) {
  const res = await fetch(\`\${API_BASE}/translate\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source, target }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Translation failed');
  }
  return data;
}`,
  };

  const curlTranslate = `curl -X POST http://localhost:3000/api/translate \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hello, how are you today?",
    "source": "auto",
    "target": "es"
  }'`;

  const curlTranslateResponse = `{
  "success": true,
  "translatedText": "Hola, ¿cómo estás hoy?",
  "detectedSourceLanguage": "en",
  "cached": false,
  "provider": "google"
}`;

  const curlLanguages = `curl http://localhost:3000/api/languages`;

  const curlHealth = `curl http://localhost:3000/api/health`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Project Documentation & Setup Guide
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Full-stack architecture, API keys, curl examples, and code files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('setup')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'setup'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Key className="w-4 h-4" />
            Setup & API Key
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'curl'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Terminal className="w-4 h-4" />
            cURL & API Examples
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'files'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            Code Browser (File-by-File)
          </button>
          <button
            onClick={() => setActiveTab('troubleshooting')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'troubleshooting'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Common Errors & Fixes
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'deploy'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            Deployment
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* TAB 1: SETUP */}
          {activeTab === 'setup' && (
            <div className="space-y-6 text-slate-700 dark:text-slate-300">
              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                <h3 className="font-semibold text-indigo-950 dark:text-indigo-200 text-sm mb-1 flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  How to Get a Google Cloud Translation API (v2) Key
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-xs text-indigo-900/80 dark:text-indigo-300 mt-2">
                  <li>Visit the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="underline font-medium hover:text-indigo-500">Google Cloud Console</a> and create or select a project.</li>
                  <li>Enable billing for your Google Cloud project.</li>
                  <li>Go to <strong>APIs & Services &gt; Library</strong>, search for <strong>Cloud Translation API</strong>, and click <strong>Enable</strong>.</li>
                  <li>Go to <strong>APIs & Services &gt; Credentials</strong>, click <strong>+ Create Credentials &gt; API Key</strong>.</li>
                  <li>(Recommended) Click <strong>Restrict Key</strong> and restrict it to the Cloud Translation API.</li>
                  <li>Copy your API key and paste it into your backend <code>.env</code> file under <code>GOOGLE_TRANSLATE_API_KEY</code>.</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-2">
                  Step-by-Step Local Installation & Running
                </h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      1. Backend Setup:
                    </p>
                    <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto">
{`cd backend
cp .env.example .env
# Edit .env and paste your GOOGLE_TRANSLATE_API_KEY
npm install
npm run dev`}
                    </pre>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      2. Frontend Setup (in a separate terminal):
                    </p>
                    <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto">
{`cd frontend
npm install
npm run dev`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Swappable Provider Architecture:
                </span>{' '}
                <span className="text-emerald-900/80 dark:text-emerald-400">
                  To switch providers, update <code>TRANSLATION_PROVIDER</code> in your <code>.env</code> file to <code>libretranslate</code>, <code>microsoft</code>, <code>gemini</code>, or <code>google</code>.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: CURL & API EXAMPLES */}
          {activeTab === 'curl' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-xs">
                    1. POST /api/translate (Translate Text)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(curlTranslate, 'curl-translate')}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500 font-medium cursor-pointer"
                  >
                    {copiedSection === 'curl-translate' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSection === 'curl-translate' ? 'Copied' : 'Copy cURL'}
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto">
                  {curlTranslate}
                </pre>

                <p className="text-xs text-slate-500 mt-2 mb-1">Expected Response:</p>
                <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto">
                  {curlTranslateResponse}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-xs">
                    2. GET /api/languages (Supported Languages List)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(curlLanguages, 'curl-lang')}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500 font-medium cursor-pointer"
                  >
                    {copiedSection === 'curl-lang' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSection === 'curl-lang' ? 'Copied' : 'Copy cURL'}
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto">
                  {curlLanguages}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-xs">
                    3. GET /api/health (Service Health & In-Memory Cache Stats)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(curlHealth, 'curl-health')}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500 font-medium cursor-pointer"
                  >
                    {copiedSection === 'curl-health' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSection === 'curl-health' ? 'Copied' : 'Copy cURL'}
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto">
                  {curlHealth}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: FILE-BY-FILE CODE */}
          {activeTab === 'files' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* File list */}
              <div className="space-y-1 md:col-span-1 border-r border-slate-200 dark:border-slate-800 pr-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block px-2 py-1">
                  Files
                </span>
                {Object.keys(fileContents).map((fileName) => (
                  <button
                    key={fileName}
                    onClick={() => setSelectedFile(fileName)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors truncate block cursor-pointer ${
                      selectedFile === fileName
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {fileName}
                  </button>
                ))}
              </div>

              {/* Code viewer */}
              <div className="md:col-span-3 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    {selectedFile}
                  </span>
                  <button
                    onClick={() => copyToClipboard(fileContents[selectedFile] || '', 'file-code')}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500 font-medium cursor-pointer"
                  >
                    {copiedSection === 'file-code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSection === 'file-code' ? 'Copied' : 'Copy File Content'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed">
                  {fileContents[selectedFile] || '// Select a file'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: COMMON ERRORS & FIXES */}
          {activeTab === 'troubleshooting' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20">
                <h4 className="font-bold text-rose-700 dark:text-rose-400 text-xs mb-1">
                  Error 403: Cloud Translation API has not been used in project... or API key is invalid
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Cause:</strong> The Cloud Translation API is disabled in your Google Cloud project or the key restrictions prevent calling it.
                  <br />
                  <strong>Fix:</strong> Go to Google Cloud Console &gt; APIs & Services &gt; Library, search for "Cloud Translation API" and ensure it is <em>Enabled</em>. Also ensure billing is active on the Cloud project.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
                <h4 className="font-bold text-amber-700 dark:text-amber-400 text-xs mb-1">
                  Error 429: Too many requests (Rate limit reached)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Cause:</strong> More than 30-60 requests were made within 1 minute from the same IP address.
                  <br />
                  <strong>Fix:</strong> The client will automatically wait for the rate limit window to expire. You can also adjust <code>windowMs</code> and <code>max</code> in <code>backend/server.js</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20">
                <h4 className="font-bold text-sky-700 dark:text-sky-400 text-xs mb-1">
                  CORS Error: Blocked by CORS policy
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Cause:</strong> Frontend port (e.g., 5173 or custom domain) is not listed in <code>CORS_ORIGIN</code>.
                  <br />
                  <strong>Fix:</strong> Add your frontend origin into <code>.env</code> under <code>CORS_ORIGIN=http://localhost:5173,http://localhost:3000</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-1">
                  Web Speech API Microphone Permission Denied
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Cause:</strong> Browser blocked mic permissions or accessed over insecure HTTP.
                  <br />
                  <strong>Fix:</strong> Web Speech API requires HTTPS or localhost. Click the site settings lock icon in your URL bar and toggle Microphone to "Allow".
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: DEPLOYMENT */}
          {activeTab === 'deploy' && (
            <div className="space-y-5 text-slate-700 dark:text-slate-300">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Deploying Backend to Render / Railway / Fly.io
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  1. Push the <code>backend/</code> folder to GitHub.
                  <br />
                  2. Create a new Web Service on <strong>Render.com</strong>.
                  <br />
                  3. Set Build Command: <code>npm install</code> and Start Command: <code>npm start</code>.
                  <br />
                  4. Add Environment Variables in the Render dashboard:
                  <br />
                  &nbsp;&nbsp;&bull; <code>GOOGLE_TRANSLATE_API_KEY</code> = [Your key]
                  <br />
                  &nbsp;&nbsp;&bull; <code>CORS_ORIGIN</code> = https://your-frontend.vercel.app
                </p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Deploying Frontend to Vercel / Netlify
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  1. Link your frontend repository to <strong>Vercel</strong>.
                  <br />
                  2. Build Command: <code>npm run build</code>, Output Directory: <code>dist</code>.
                  <br />
                  3. Configure a rewrite in <code>vercel.json</code> to proxy <code>/api/*</code> to your deployed Render backend URL.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Polyglot Language Translation Engine v2.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
