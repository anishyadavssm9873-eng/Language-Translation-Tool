/**
 * backend/routes/translate.js
 * Express router mounting the translation endpoints.
 */

import { Router } from 'express';
import {
  getLanguages,
  translateText,
  detectLanguage,
  getHealth,
} from '../controllers/translateController.js';

const router = Router();

// GET /api/languages
router.get('/languages', getLanguages);

// POST /api/translate
router.post('/translate', translateText);

// POST /api/detect
router.post('/detect', detectLanguage);

// GET /api/health
router.get('/health', getHealth);

export default router;
