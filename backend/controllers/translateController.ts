/**
 * Translate Controller
 * Handles request validation, routes to translationService, and formats responses.
 */

import { AppError } from '../middleware/errorHandler.ts';
import { translationService, DEFAULT_LANGUAGES } from '../services/translationService.ts';

const MAX_TEXT_LENGTH = 5000;

export async function getLanguages(req: any, res: any, next: any) {
  try {
    const languages = await translationService.getLanguages();
    res.json({
      success: true,
      languages,
      count: languages.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function translateText(req: any, res: any, next: any) {
  try {
    const { text, source = 'auto', target } = req.body;

    // 1. Text validation
    if (typeof text !== 'string' || text.trim() === '') {
      throw new AppError('The "text" field is required and must not be empty.', 400);
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new AppError(
        `Text exceeds the maximum allowed length of ${MAX_TEXT_LENGTH} characters (received ${text.length}).`,
        400
      );
    }

    // 2. Target language validation
    if (!target || typeof target !== 'string' || target.trim() === '') {
      throw new AppError('The "target" language code is required.', 400);
    }

    if (target.trim().toLowerCase() === 'auto') {
      throw new AppError('The target language cannot be "auto". Please select a concrete destination language.', 400);
    }

    const cleanSource = (source || 'auto').trim();
    const cleanTarget = target.trim();

    // 3. Perform translation
    const result = await translationService.translate(text, cleanSource, cleanTarget);

    res.json({
      success: true,
      translatedText: result.translatedText,
      detectedSourceLanguage: result.detectedSourceLanguage,
      cached: result.cached,
      provider: result.provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function detectLanguage(req: any, res: any, next: any) {
  try {
    const { text } = req.body;

    if (typeof text !== 'string' || text.trim() === '') {
      throw new AppError('The "text" field is required for language detection.', 400);
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new AppError(`Text exceeds maximum allowed length of ${MAX_TEXT_LENGTH} characters.`, 400);
    }

    const result = await translationService.detectLanguage(text);

    const langName = DEFAULT_LANGUAGES.find((l) => l.code === result.language)?.name || result.language;

    res.json({
      success: true,
      language: result.language,
      languageName: langName,
      confidence: result.confidence,
      provider: result.provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function getHealth(req: any, res: any) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    provider: translationService.getProviderName(),
    cacheStats: translationService.getCacheStats(),
    nodeVersion: process.version,
  });
}

export async function setProvider(req: any, res: any, next: any) {
  try {
    const { provider } = req.body;
    if (!provider || typeof provider !== 'string') {
      throw new AppError('Provider name is required.', 400);
    }
    const allowed = ['google', 'libretranslate', 'microsoft', 'gemini', 'fallback'];
    if (!allowed.includes(provider.toLowerCase())) {
      throw new AppError(`Invalid provider. Allowed: ${allowed.join(', ')}`, 400);
    }
    translationService.setProvider(provider);
    res.json({
      success: true,
      provider: translationService.getProviderName(),
    });
  } catch (error) {
    next(error);
  }
}

export async function clearCache(req: any, res: any) {
  translationService.clearCache();
  res.json({
    success: true,
    message: 'Translation cache cleared successfully.',
    cacheStats: translationService.getCacheStats(),
  });
}
