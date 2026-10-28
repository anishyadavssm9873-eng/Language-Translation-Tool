/**
 * Centralized error handling middleware.
 * Formats errors into a consistent JSON response and logs details for debugging.
 */

export class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(err: any, req: any, res: any, next: any) {
  // If headers have already been sent, delegate to standard Express handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const message = err.message || 'An unexpected internal server error occurred.';

  // Request logging for errors
  console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.originalUrl}:`, {
    status: statusCode,
    message: err.message,
    details: err.details,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      details: err.details || null,
      timestamp: new Date().toISOString(),
    },
  });
}
