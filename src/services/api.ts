/**
 * Frontend API Service
 * Handles communication with the backend translation endpoints.
 * Never exposes API keys; requests are routed securely to /api/*
 */

export interface Language {
  code: string;
  name: string;
  nativeName?: string;
}

export interface TranslationResponse {
  success: boolean;
  translatedText: string;
  detectedSourceLanguage?: string;
  cached?: boolean;
  provider?: string;
  error?: {
    message: string;
    statusCode: number;
    details?: any;
  };
}

export interface DetectionResponse {
  success: boolean;
  language: string;
  languageName?: string;
  confidence?: number;
  provider?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  provider: string;
  cacheStats: {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRatio: string;
  };
  nodeVersion: string;
}

const API_BASE = '/api';

/**
 * Fetch list of supported languages
 */
export async function fetchLanguages(): Promise<Language[]> {
  try {
    const res = await fetch(`${API_BASE}/languages`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to fetch languages (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.languages || [];
  } catch (error: any) {
    console.error('API Error fetchLanguages:', error);
    throw error;
  }
}

/**
 * Request translation
 */
export async function translateText(params: {
  text: string;
  source: string;
  target: string;
}): Promise<TranslationResponse> {
  const { text, source, target } = params;

  if (!text.trim()) {
    throw new Error('Please enter some text to translate.');
  }
  if (!target || target === 'auto') {
    throw new Error('Please choose a valid destination language.');
  }

  try {
    const res = await fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        source: source || 'auto',
        target,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error(
          data?.error?.message || 'Rate limit reached (max 60 requests/min). Please pause for a few seconds.'
        );
      }
      if (res.status === 400) {
        throw new Error(data?.error?.message || 'Invalid translation request.');
      }
      throw new Error(data?.error?.message || `Translation failed with status ${res.status}`);
    }

    return data;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to translation server. Please ensure the backend is running.');
    }
    throw error;
  }
}

/**
 * Detect language of text
 */
export async function detectLanguage(text: string): Promise<DetectionResponse> {
  if (!text.trim()) {
    throw new Error('Text is required for language detection.');
  }

  try {
    const res = await fetch(`${API_BASE}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `Language detection failed (${res.status})`);
    }
    return data;
  } catch (error: any) {
    console.warn('Detection failed:', error);
    throw error;
  }
}

/**
 * Health check & cache stats
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`);
  }
  return res.json();
}

/**
 * Switch provider at runtime
 */
export async function switchProvider(provider: string): Promise<void> {
  const res = await fetch(`${API_BASE}/provider`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || 'Failed to switch provider');
  }
}

/**
 * Clear in-memory cache
 */
export async function clearServerCache(): Promise<void> {
  const res = await fetch(`${API_BASE}/cache/clear`, { method: 'POST' });
  if (!res.ok) {
    throw new Error('Failed to clear cache');
  }
}
