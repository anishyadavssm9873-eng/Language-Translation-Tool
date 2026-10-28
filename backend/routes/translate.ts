/**
 * Translate API Routes
 * Mounts endpoints for translation, language detection, supported languages, health, and cache.
 */

import { Router } from 'express';
import {
  getLanguages,
  translateText,
  detectLanguage,
  getHealth,
  setProvider,
  clearCache,
} from '../controllers/translateController.ts';

const router = Router();

// Languages catalog
router.get('/languages', getLanguages);

// Translation execution
router.post('/translate', translateText);

// Language detection
router.post('/detect', detectLanguage);

// System health check
router.get('/health', getHealth);

// Provider toggle & cache management
router.post('/provider', setProvider);
router.post('/cache/clear', clearCache);

export default router;
