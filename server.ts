/**
 * Main Full-Stack Server Entry Point
 * Runs Express backend with API routes on /api and integrates Vite middleware in dev.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import translateRoutes from './backend/routes/translate.ts';
import { errorHandler } from './backend/middleware/errorHandler.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Security Headers via Helmet (with permissive CSP to allow inline assets, fonts & audio)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
  );

  // Request Body Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Rate Limiting (60 requests per minute per IP for translation API)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        message: 'Rate limit reached: Maximum 60 requests per minute exceeded. Please wait a moment before sending another translation.',
        statusCode: 429,
      },
    },
  });

  // Request logging middleware for API endpoints
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      const start = Date.now();
      res.on('finish', () => {
        console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - start}ms)`);
      });
    }
    next();
  });

  // Health check route on root
  app.get('/api/health-check', (req, res) => {
    res.json({ status: 'ok', service: 'Polyglot Translator' });
  });

  // Mount Translate API Routes
  app.use('/api', apiLimiter, translateRoutes);

  // Frontend Serving: Vite middleware in Dev, Static in Prod
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Centralized Error Handling
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🌟 Polyglot Language Translation Server Active`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🚀 API Endpoints: http://localhost:${PORT}/api/translate`);
    console.log(`🛡️ Rate Limiting: 60 req/min`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
