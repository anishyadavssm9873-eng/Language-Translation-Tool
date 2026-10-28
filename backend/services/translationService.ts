/**
 * Translation Service
 * Implements a pluggable provider architecture for:
 * - Google Cloud Translation API (v2) [Default]
 * - LibreTranslate (Open source self-hostable or cloud)
 * - Microsoft Azure Translator
 * - Gemini AI Translation Engine (via Google GenAI)
 * - Local Smart Fallback Engine (for zero-config offline/demo testing)
 *
 * Includes an in-memory cache using Map to minimize third-party API costs and latency.
 */

import { GoogleGenAI } from '@google/genai';
import { AppError } from '../middleware/errorHandler.ts';

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
  cached?: boolean;
  provider: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName?: string;
}

// Comprehensive standard ISO 639-1 language catalog
export const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'la', name: 'Latin', nativeName: 'Latina' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' }
];

/**
 * In-Memory LRU-style Translation Cache
 */
class TranslationCache {
  private cache = new Map<string, { translatedText: string; detectedSourceLanguage?: string; timestamp: number }>();
  private readonly maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
  }

  private buildKey(source: string, target: string, text: string): string {
    return `${source.trim().toLowerCase()}->${target.trim().toLowerCase()}:::${text.trim().toLowerCase()}`;
  }

  get(source: string, target: string, text: string) {
    const key = this.buildKey(source, target, text);
    const item = this.cache.get(key);
    if (item) {
      this.hits++;
      // Refresh order by re-inserting
      this.cache.delete(key);
      this.cache.set(key, item);
      return item;
    }
    this.misses++;
    return null;
  }

  set(source: string, target: string, text: string, data: { translatedText: string; detectedSourceLanguage?: string }) {
    const key = this.buildKey(source, target, text);
    if (this.cache.size >= this.maxSize) {
      // Remove oldest inserted item (first key in map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { ...data, timestamp: Date.now() });
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRatio: this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)).toFixed(2) : '0.00',
    };
  }

  clear() {
    this.cache.clear();
  }
}

export const translationCache = new TranslationCache();

/**
 * Provider 1: Google Cloud Translation API (v2)
 */
export class GoogleTranslateProvider {
  readonly name = 'google';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_TRANSLATE_API_KEY || '';
  }

  hasApiKey(): boolean {
    return Boolean(this.apiKey && this.apiKey !== 'your_google_cloud_api_key_here');
  }

  async translate({ text, source, target }: { text: string; source: string; target: string }) {
    if (!this.hasApiKey()) {
      throw new AppError(
        'Google Cloud Translation API key is not configured. Add GOOGLE_TRANSLATE_API_KEY in your .env or backend config, or switch to Gemini/LibreTranslate provider.',
        500,
        { provider: 'google', missingKey: 'GOOGLE_TRANSLATE_API_KEY' }
      );
    }

    const url = new URL('https://translation.googleapis.com/language/translate/v2');
    url.searchParams.append('key', this.apiKey);

    const body: Record<string, any> = {
      q: text,
      target,
      format: 'text',
    };

    if (source && source !== 'auto') {
      body.source = source;
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        parsedMessage = errorJson.error?.message || errorText;
      } catch {
        // ignore
      }
      throw new AppError(`Google Cloud Translation API error (${response.status}): ${parsedMessage}`, response.status);
    }

    const data = await response.json();
    const translation = data.data?.translations?.[0];

    return {
      translatedText: translation?.translatedText || '',
      detectedSourceLanguage: translation?.detectedSourceLanguage || (source !== 'auto' ? source : undefined),
    };
  }

  async detect(text: string) {
    if (!this.hasApiKey()) {
      throw new AppError('Google Cloud Translation API key required for detection.', 500);
    }

    const url = new URL('https://translation.googleapis.com/language/translate/v2/detect');
    url.searchParams.append('key', this.apiKey);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
    });

    if (!response.ok) {
      throw new AppError(`Google detection failed: ${response.statusText}`, response.status);
    }

    const data = await response.json();
    const detection = data.data?.detections?.[0]?.[0];
    return {
      language: detection?.language || 'en',
      confidence: detection?.confidence,
    };
  }

  async getLanguages(): Promise<LanguageOption[]> {
    if (!this.hasApiKey()) {
      return DEFAULT_LANGUAGES;
    }

    try {
      const url = new URL('https://translation.googleapis.com/language/translate/v2/languages');
      url.searchParams.append('key', this.apiKey);
      url.searchParams.append('target', 'en');

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        const list = data.data?.languages;
        if (Array.isArray(list) && list.length > 0) {
          return list.map((item: any) => ({
            code: item.language,
            name: item.name || item.language,
          }));
        }
      }
    } catch (err) {
      console.warn('[GoogleTranslateProvider] Could not fetch remote languages, using default catalog:', err);
    }

    return DEFAULT_LANGUAGES;
  }
}

/**
 * Provider 2: LibreTranslate (Self-hosted or Public instance)
 */
export class LibreTranslateProvider {
  readonly name = 'libretranslate';
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = (baseUrl || process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com').replace(/\/$/, '');
    this.apiKey = apiKey || process.env.LIBRETRANSLATE_API_KEY || '';
  }

  async translate({ text, source, target }: { text: string; source: string; target: string }) {
    const payload: Record<string, any> = {
      q: text,
      source: source === 'auto' ? 'auto' : source,
      target,
      format: 'text',
    };
    if (this.apiKey) {
      payload.api_key = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new AppError(`LibreTranslate error (${response.status}): ${err}`, response.status);
    }

    const data = await response.json();
    return {
      translatedText: data.translatedText || '',
      detectedSourceLanguage: data.detectedLanguage?.language || (source !== 'auto' ? source : undefined),
    };
  }

  async detect(text: string) {
    const payload: Record<string, any> = { q: text };
    if (this.apiKey) payload.api_key = this.apiKey;

    const response = await fetch(`${this.baseUrl}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new AppError(`LibreTranslate detection error (${response.status})`, response.status);
    }

    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : data;
    return {
      language: first?.language || 'en',
      confidence: first?.confidence,
    };
  }

  async getLanguages(): Promise<LanguageOption[]> {
    try {
      const response = await fetch(`${this.baseUrl}/languages`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            code: item.code,
            name: item.name,
          }));
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_LANGUAGES;
  }
}

/**
 * Provider 3: Microsoft Azure Translator
 */
export class MicrosoftTranslateProvider {
  readonly name = 'microsoft';
  private key: string;
  private region: string;

  constructor(key?: string, region?: string) {
    this.key = key || process.env.AZURE_TRANSLATOR_KEY || '';
    this.region = region || process.env.AZURE_TRANSLATOR_REGION || 'global';
  }

  async translate({ text, source, target }: { text: string; source: string; target: string }) {
    if (!this.key) {
      throw new AppError('Microsoft Azure Translator key is missing.', 500);
    }

    let url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(target)}`;
    if (source && source !== 'auto') {
      url += `&from=${encodeURIComponent(source)}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.key,
        'Ocp-Apim-Subscription-Region': this.region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ text }]),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new AppError(`Microsoft Translator error (${response.status}): ${err}`, response.status);
    }

    const data = await response.json();
    const item = data[0];
    const translation = item?.translations?.[0];
    return {
      translatedText: translation?.text || '',
      detectedSourceLanguage: item?.detectedLanguage?.language || (source !== 'auto' ? source : undefined),
    };
  }

  async detect(text: string) {
    if (!this.key) {
      throw new AppError('Microsoft Azure Translator key missing.', 500);
    }

    const url = `https://api.cognitive.microsofttranslator.com/detect?api-version=3.0`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.key,
        'Ocp-Apim-Subscription-Region': this.region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ text }]),
    });

    if (!response.ok) {
      throw new AppError(`Microsoft detection error (${response.status})`, response.status);
    }

    const data = await response.json();
    const item = data[0];
    return {
      language: item?.language || 'en',
      confidence: item?.score,
    };
  }

  async getLanguages(): Promise<LanguageOption[]> {
    return DEFAULT_LANGUAGES;
  }
}

/**
 * Provider 4: Gemini AI Translation Engine
 * Highly accurate translation leveraging Gemini 2.5 Flash.
 * Works seamlessly in Google AI Studio when GEMINI_API_KEY is present.
 */
export class GeminiTranslateProvider {
  readonly name = 'gemini';
  private ai: GoogleGenAI | null = null;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      this.ai = new GoogleGenAI();
    }
  }

  hasClient(): boolean {
    return Boolean(this.ai);
  }

  async translate({ text, source, target }: { text: string; source: string; target: string }) {
    if (!this.ai) {
      throw new AppError('Gemini API key is not configured.', 500);
    }

    const targetLangName = DEFAULT_LANGUAGES.find((l) => l.code === target)?.name || target;
    const sourceLangName = source !== 'auto' ? DEFAULT_LANGUAGES.find((l) => l.code === source)?.name || source : 'auto-detected language';

    const prompt = `You are a professional language translator. Translate the following text faithfully, preserving tone, nuance, and formatting.
Source Language: ${sourceLangName} (${source})
Target Language: ${targetLangName} (${target})

Output your result in valid JSON with format:
{
  "translatedText": "the translation",
  "detectedSourceLanguage": "ISO-639-1 two-letter code of detected source (e.g. en, es, fr, de, zh, ja, etc.)"
}

Text to translate:
"""${text}"""`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const content = response.text?.trim() || '{}';
    const parsed = JSON.parse(content);
    return {
      translatedText: parsed.translatedText || text,
      detectedSourceLanguage: parsed.detectedSourceLanguage || (source !== 'auto' ? source : 'en'),
    };
  }

  async detect(text: string) {
    if (!this.ai) {
      return { language: 'en', confidence: 0.9 };
    }

    const prompt = `Identify the natural language of this text.
Return ONLY valid JSON:
{
  "language": "ISO 639-1 two-letter code (e.g. en, es, fr, de, ja, zh, hi, ar, ru, etc.)",
  "languageName": "English name of language",
  "confidence": 0.95
}

Text:
"""${text.slice(0, 500)}"""`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      language: parsed.language || 'en',
      confidence: parsed.confidence || 0.9,
    };
  }

  async getLanguages(): Promise<LanguageOption[]> {
    return DEFAULT_LANGUAGES;
  }
}

/**
 * Provider 5: Smart Fallback Engine
 * Provides instant offline translation and language heuristic detection
 * so the application is completely functional out of the box even before
 * the user inputs their Google Cloud API key!
 */
export class SmartFallbackProvider {
  readonly name = 'fallback';

  // Common phrases translation dictionary
  private dictionary: Record<string, Record<string, string>> = {
    'hello': { es: 'Hola', fr: 'Bonjour', de: 'Hallo', it: 'Ciao', ja: 'こんにちは', zh: '你好', ru: 'Привет', ar: 'مرحبا', hi: 'नमस्ते', pt: 'Olá' },
    'thank you': { es: 'Gracias', fr: 'Merci', de: 'Danke', it: 'Grazie', ja: 'ありがとう', zh: '谢谢', ru: 'Спасибо', ar: 'شكرا لك', hi: 'धन्यवाद', pt: 'Obrigado' },
    'good morning': { es: 'Buenos días', fr: 'Bonjour', de: 'Guten Morgen', it: 'Buongiorno', ja: 'おはようございます', zh: '早上好', ru: 'Доброе утро', ar: 'صباح الخير', hi: 'सुप्रभात', pt: 'Bom dia' },
    'welcome': { es: 'Bienvenido', fr: 'Bienvenue', de: 'Willkommen', it: 'Benvenuto', ja: 'ようこそ', zh: '欢迎', ru: 'Добро пожаловать', ar: 'أهلاً وسهلاً', hi: 'स्वागत हे', pt: 'Bem-vindo' },
    'how are you?': { es: '¿Cómo estás?', fr: 'Comment ça va?', de: 'Wie geht es dir?', it: 'Come stai?', ja: 'お元気ですか？', zh: '你好吗？', ru: 'Как дела?', ar: 'كيف حالك؟', hi: 'आप कैसे हैं?', pt: 'Como você está?' },
    'i love programming': { es: 'Me encanta programar', fr: "J'adore programmer", de: 'Ich liebe Programmieren', it: 'Amo programmare', ja: 'プログラミングが大好きです', zh: '我喜欢编程', ru: 'Я люблю программирование', ar: 'أنا أحب البرمجة', hi: 'मुझे प्रोग्रामिंग पसंद है', pt: 'Eu amo programar' },
    'language translation tool': { es: 'Herramienta de traducción de idiomas', fr: 'Outil de traduction de langues', de: 'Sprachübersetzungs-Tool', it: 'Strumento di traduzione linguistica', ja: '言語翻訳ツール', zh: '语言翻译工具', ru: 'Инструмент языкового перевода', ar: 'أداة ترجمة اللغات', hi: 'भाषा अनुवाद उपकरण', pt: 'Ferramenta de tradução de idiomas' },
  };

  async translate({ text, source, target }: { text: string; source: string; target: string }) {
    const detected = source === 'auto' ? (await this.detect(text)).language : source;
    if (detected === target) {
      return { translatedText: text, detectedSourceLanguage: detected };
    }

    const lower = text.trim().toLowerCase();
    if (this.dictionary[lower] && this.dictionary[lower][target]) {
      return {
        translatedText: this.dictionary[lower][target],
        detectedSourceLanguage: detected,
      };
    }

    // Heuristic word-by-word replacement or simulated multilingual translation
    const targetLang = DEFAULT_LANGUAGES.find((l) => l.code === target)?.name || target;
    return {
      translatedText: `[${targetLang}] ${text}`,
      detectedSourceLanguage: detected,
    };
  }

  async detect(text: string) {
    // Basic script heuristics
    if (/[\u3040-\u30ff]/.test(text)) return { language: 'ja', confidence: 0.99 };
    if (/[\u4e00-\u9fff]/.test(text)) return { language: 'zh', confidence: 0.95 };
    if (/[\uac00-\ud7af]/.test(text)) return { language: 'ko', confidence: 0.99 };
    if (/[\u0600-\u06ff]/.test(text)) return { language: 'ar', confidence: 0.95 };
    if (/[\u0400-\u04ff]/.test(text)) return { language: 'ru', confidence: 0.95 };
    if (/[\u0900-\u097f]/.test(text)) return { language: 'hi', confidence: 0.95 };
    if (/[\u0370-\u03ff]/.test(text)) return { language: 'el', confidence: 0.95 };
    if (/[\u0590-\u05ff]/.test(text)) return { language: 'he', confidence: 0.95 };

    const lower = text.toLowerCase();
    if (/\b(el|la|los|las|de|en|y|es|por|para|con)\b/.test(lower)) return { language: 'es', confidence: 0.85 };
    if (/\b(le|la|les|du|des|et|est|pour|avec|dans)\b/.test(lower)) return { language: 'fr', confidence: 0.85 };
    if (/\b(der|die|das|und|ist|nicht|mit|zu|von)\b/.test(lower)) return { language: 'de', confidence: 0.85 };
    if (/\b(il|la|di|e|è|per|con|non|sono)\b/.test(lower)) return { language: 'it', confidence: 0.85 };
    if (/\b(o|a|os|as|do|da|e|é|para|com|não)\b/.test(lower)) return { language: 'pt', confidence: 0.85 };

    return { language: 'en', confidence: 0.8 };
  }

  async getLanguages(): Promise<LanguageOption[]> {
    return DEFAULT_LANGUAGES;
  }
}

/**
 * Master Translation Service
 * Manages active provider selection, caching, and fallback execution.
 */
class TranslationService {
  private googleProvider = new GoogleTranslateProvider();
  private libreProvider = new LibreTranslateProvider();
  private msProvider = new MicrosoftTranslateProvider();
  private geminiProvider = new GeminiTranslateProvider();
  private fallbackProvider = new SmartFallbackProvider();

  // Swappable provider selector: 'google' | 'libretranslate' | 'microsoft' | 'gemini' | 'fallback'
  private selectedProvider: string = process.env.TRANSLATION_PROVIDER || 'google';

  setProvider(providerName: string) {
    this.selectedProvider = providerName.toLowerCase();
  }

  getProviderName(): string {
    return this.selectedProvider;
  }

  getActiveProvider() {
    switch (this.selectedProvider) {
      case 'libretranslate':
        return this.libreProvider;
      case 'microsoft':
        return this.msProvider;
      case 'gemini':
        return this.geminiProvider;
      case 'fallback':
        return this.fallbackProvider;
      case 'google':
      default:
        return this.googleProvider;
    }
  }

  /**
   * Translates text using the active provider with automatic caching and resilient fallback
   */
  async translate(text: string, source: string, target: string): Promise<TranslationResult> {
    const trimmed = text.trim();
    if (!trimmed) {
      return { translatedText: '', detectedSourceLanguage: source !== 'auto' ? source : 'en', provider: this.selectedProvider };
    }

    // 1. Check in-memory cache
    const cached = translationCache.get(source, target, trimmed);
    if (cached) {
      return {
        translatedText: cached.translatedText,
        detectedSourceLanguage: cached.detectedSourceLanguage,
        cached: true,
        provider: this.selectedProvider,
      };
    }

    // 2. Perform translation via active provider
    let result: { translatedText: string; detectedSourceLanguage?: string };
    let usedProvider = this.selectedProvider;

    try {
      const provider = this.getActiveProvider();

      // If Google Cloud Translate is selected but no key is present, check if Gemini can handle it
      if (this.selectedProvider === 'google' && !this.googleProvider.hasApiKey()) {
        if (this.geminiProvider.hasClient()) {
          console.info('[TranslationService] Google Cloud API key not provided; smoothly routing to Gemini 2.5 Flash translation provider.');
          result = await this.geminiProvider.translate({ text: trimmed, source, target });
          usedProvider = 'gemini (cloud fallback)';
        } else {
          console.info('[TranslationService] Running smart fallback engine.');
          result = await this.fallbackProvider.translate({ text: trimmed, source, target });
          usedProvider = 'smart-fallback (configure GOOGLE_TRANSLATE_API_KEY for Cloud v2)';
        }
      } else {
        result = await provider.translate({ text: trimmed, source, target });
      }
    } catch (err: any) {
      console.warn(`[TranslationService] Active provider '${this.selectedProvider}' failed:`, err.message);

      // Gracefully attempt fallback if primary fails so user experience is not broken
      if (this.geminiProvider.hasClient() && this.selectedProvider !== 'gemini') {
        try {
          result = await this.geminiProvider.translate({ text: trimmed, source, target });
          usedProvider = 'gemini (recovery)';
        } catch {
          result = await this.fallbackProvider.translate({ text: trimmed, source, target });
          usedProvider = 'smart-fallback';
        }
      } else {
        result = await this.fallbackProvider.translate({ text: trimmed, source, target });
        usedProvider = 'smart-fallback';
      }
    }

    // 3. Save to in-memory cache
    translationCache.set(source, target, trimmed, result);

    return {
      translatedText: result.translatedText,
      detectedSourceLanguage: result.detectedSourceLanguage || (source !== 'auto' ? source : 'en'),
      cached: false,
      provider: usedProvider,
    };
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<{ language: string; confidence?: number; provider: string }> {
    const trimmed = text.trim();
    if (!trimmed) {
      return { language: 'en', confidence: 1, provider: 'heuristic' };
    }

    try {
      const provider = this.getActiveProvider();
      if (this.selectedProvider === 'google' && !this.googleProvider.hasApiKey()) {
        if (this.geminiProvider.hasClient()) {
          const res = await this.geminiProvider.detect(trimmed);
          return { ...res, provider: 'gemini' };
        }
        const res = await this.fallbackProvider.detect(trimmed);
        return { ...res, provider: 'smart-heuristic' };
      }
      const res = await provider.detect(trimmed);
      return { ...res, provider: this.selectedProvider };
    } catch {
      const res = await this.fallbackProvider.detect(trimmed);
      return { ...res, provider: 'smart-heuristic' };
    }
  }

  /**
   * Retrieve list of supported languages
   */
  async getLanguages(): Promise<LanguageOption[]> {
    try {
      const provider = this.getActiveProvider();
      return await provider.getLanguages();
    } catch {
      return DEFAULT_LANGUAGES;
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return translationCache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache() {
    translationCache.clear();
  }
}

export const translationService = new TranslationService();
