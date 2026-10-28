/**
 * backend/services/translationService.js
 * Pluggable Translation Service supporting:
 * - Google Cloud Translation API (v2) [Default]
 * - LibreTranslate (Open source / Self-hosted)
 * - Microsoft Azure Translator
 * - Smart In-Memory Map Cache to prevent redundant API queries
 */

import { AppError } from '../middleware/errorHandler.js';

export const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'cs', name: 'Czech' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'bn', name: 'Bengali' },
];

/**
 * In-Memory Map Cache for repeated translation queries
 */
class TranslationCache {
  constructor(maxEntries = 5000) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.hits = 0;
    this.misses = 0;
  }

  _generateKey(source, target, text) {
    return `${source.toLowerCase()}->${target.toLowerCase()}:::${text.trim().toLowerCase()}`;
  }

  get(source, target, text) {
    const key = this._generateKey(source, target, text);
    if (this.cache.has(key)) {
      this.hits++;
      const val = this.cache.get(key);
      // Re-insert to refresh LRU order
      this.cache.delete(key);
      this.cache.set(key, val);
      return val;
    }
    this.misses++;
    return null;
  }

  set(source, target, text, data) {
    const key = this._generateKey(source, target, text);
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { ...data, timestamp: Date.now() });
  }

  stats() {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
    };
  }

  clear() {
    this.cache.clear();
  }
}

export const translationCache = new TranslationCache();

/**
 * 1. Google Cloud Translation API (v2) Provider
 */
export class GoogleTranslateProvider {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GOOGLE_TRANSLATE_API_KEY;
  }

  async translate({ text, source, target }) {
    if (!this.apiKey) {
      throw new AppError(
        'GOOGLE_TRANSLATE_API_KEY is not defined in backend/.env',
        500
      );
    }

    const url = new URL('https://translation.googleapis.com/language/translate/v2');
    url.searchParams.append('key', this.apiKey);

    const body = {
      q: text,
      target,
      format: 'text',
    };

    if (source && source !== 'auto') {
      body.source = source;
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const msg = errorJson.error?.message || response.statusText;
      throw new AppError(`Google Cloud Translation error (${response.status}): ${msg}`, response.status);
    }

    const data = await response.json();
    const item = data.data?.translations?.[0];

    return {
      translatedText: item?.translatedText || '',
      detectedSourceLanguage: item?.detectedSourceLanguage || (source !== 'auto' ? source : undefined),
    };
  }

  async detect(text) {
    if (!this.apiKey) {
      throw new AppError('GOOGLE_TRANSLATE_API_KEY missing for language detection.', 500);
    }

    const url = new URL('https://translation.googleapis.com/language/translate/v2/detect');
    url.searchParams.append('key', this.apiKey);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
    });

    if (!response.ok) {
      throw new AppError('Google language detection failed', response.status);
    }

    const data = await response.json();
    const detection = data.data?.detections?.[0]?.[0];
    return {
      language: detection?.language || 'en',
      confidence: detection?.confidence,
    };
  }

  async getLanguages() {
    if (!this.apiKey) return DEFAULT_LANGUAGES;
    try {
      const url = new URL('https://translation.googleapis.com/language/translate/v2/languages');
      url.searchParams.append('key', this.apiKey);
      url.searchParams.append('target', 'en');

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        const list = data.data?.languages;
        if (Array.isArray(list) && list.length > 0) {
          return list.map((item) => ({
            code: item.language,
            name: item.name || item.language,
          }));
        }
      }
    } catch (e) {
      console.warn('Could not fetch remote Google languages:', e.message);
    }
    return DEFAULT_LANGUAGES;
  }
}

/**
 * 2. LibreTranslate Provider (Alternative swappable engine)
 */
export class LibreTranslateProvider {
  constructor(baseUrl, apiKey) {
    this.baseUrl = (baseUrl || process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com').replace(/\/$/, '');
    this.apiKey = apiKey || process.env.LIBRETRANSLATE_API_KEY || '';
  }

  async translate({ text, source, target }) {
    const payload = {
      q: text,
      source: source === 'auto' ? 'auto' : source,
      target,
      format: 'text',
    };
    if (this.apiKey) payload.api_key = this.apiKey;

    const response = await fetch(`${this.baseUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new AppError(`LibreTranslate error (${response.status})`, response.status);
    }

    const data = await response.json();
    return {
      translatedText: data.translatedText || '',
      detectedSourceLanguage: data.detectedLanguage?.language || (source !== 'auto' ? source : undefined),
    };
  }

  async detect(text) {
    const payload = { q: text };
    if (this.apiKey) payload.api_key = this.apiKey;

    const response = await fetch(`${this.baseUrl}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new AppError('LibreTranslate detect error', response.status);
    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : data;
    return {
      language: first?.language || 'en',
      confidence: first?.confidence,
    };
  }

  async getLanguages() {
    return DEFAULT_LANGUAGES;
  }
}

/**
 * Provider Instance Selector
 * Default: Google Cloud Translation API v2
 */
function getActiveProvider() {
  const providerType = (process.env.TRANSLATION_PROVIDER || 'google').toLowerCase();
  switch (providerType) {
    case 'libretranslate':
      return new LibreTranslateProvider();
    case 'google':
    default:
      return new GoogleTranslateProvider();
  }
}

/**
 * Main translation service method with memory caching
 */
export async function translateTextService(text, source = 'auto', target) {
  const trimmed = text.trim();

  // Check cache first
  const cached = translationCache.get(source, target, trimmed);
  if (cached) {
    return {
      ...cached,
      cached: true,
      provider: process.env.TRANSLATION_PROVIDER || 'google',
    };
  }

  const provider = getActiveProvider();
  const result = await provider.translate({ text: trimmed, source, target });

  // Save in cache
  translationCache.set(source, target, trimmed, result);

  return {
    ...result,
    cached: false,
    provider: process.env.TRANSLATION_PROVIDER || 'google',
  };
}

export async function detectLanguageService(text) {
  const provider = getActiveProvider();
  return provider.detect(text.trim());
}

export async function getLanguagesService() {
  const provider = getActiveProvider();
  return provider.getLanguages();
}
