/**
 * backend/controllers/translateController.js
 * Validates incoming parameters, calls translationService, and sends responses.
 */

import {
  translateTextService,
  detectLanguageService,
  getLanguagesService,
  translationCache,
} from '../services/translationService.js';
import { AppError } from '../middleware/errorHandler.js';

const MAX_CHARS = 5000;

export async function getLanguages(req, res, next) {
  try {
    const languages = await getLanguagesService();
    res.json({
      success: true,
      languages,
    });
  } catch (error) {
    next(error);
  }
}

export async function translateText(req, res, next) {
  try {
    const { text, source = 'auto', target } = req.body;

    // Validate non-empty text
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new AppError('The "text" field is required and must not be empty.', 400);
    }

    // Validate max length 5,000 chars
    if (text.length > MAX_CHARS) {
      throw new AppError(
        `Text exceeds the 5,000 character limit (length is ${text.length}).`,
        400
      );
    }

    // Validate destination language
    if (!target || typeof target !== 'string' || target.trim() === '') {
      throw new AppError('The destination "target" language code is required.', 400);
    }

    if (target.trim().toLowerCase() === 'auto') {
      throw new AppError('Target language cannot be "auto". Please select a specific language.', 400);
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
}

export async function detectLanguage(req, res, next) {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new AppError('The "text" field is required for language detection.', 400);
    }

    if (text.length > MAX_CHARS) {
      throw new AppError(`Text exceeds maximum allowed length of ${MAX_CHARS} characters.`, 400);
    }

    const result = await detectLanguageService(text);

    res.json({
      success: true,
      language: result.language,
      confidence: result.confidence,
    });
  } catch (error) {
    next(error);
  }
}

export function getHealth(req, res) {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    provider: process.env.TRANSLATION_PROVIDER || 'google',
    cache: translationCache.stats(),
  });
}
