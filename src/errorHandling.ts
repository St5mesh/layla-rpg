/**
 * errorHandling.ts - Standardized error handling utilities for RPG API
 * 
 * This module provides consistent error response formatting, logging, and
 * middleware for handling various error scenarios across the API.
 */

import { Request, Response, NextFunction } from 'express';

// ==================== ERROR TYPES ====================

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  timestamp: string;
  endpoint: string;
  requestId?: string;
}

/**
 * Standard API success response structure
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  timestamp: string;
}

/**
 * Error severity levels for logging
 */
export enum ErrorSeverity {
  LOW = 'low',       // User input errors (400s)
  MEDIUM = 'medium', // Server errors that are recoverable (500s)
  HIGH = 'high',     // Critical system errors
  CRITICAL = 'critical' // System failure
}

/**
 * Custom error class with additional context
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.severity = severity;
    this.context = context;
  }
}

// ==================== COMMON ERROR CREATORS ====================

/**
 * Creates a validation error (400)
 */
export function createValidationError(
  message: string,
  code: string = 'VALIDATION_ERROR',
  context?: Record<string, any>
): ApiError {
  return new ApiError(message, 400, code, ErrorSeverity.LOW, context);
}

/**
 * Creates a not found error (404)
 */
export function createNotFoundError(
  resource: string,
  identifier?: string,
  context?: Record<string, any>
): ApiError {
  const message = identifier 
    ? `${resource} "${identifier}" not found`
    : `${resource} not found`;
  
  return new ApiError(message, 404, 'RESOURCE_NOT_FOUND', ErrorSeverity.LOW, {
    resource,
    identifier,
    ...context
  });
}

/**
 * Creates a conflict error (409)
 */
export function createConflictError(
  message: string,
  code: string = 'CONFLICT',
  context?: Record<string, any>
): ApiError {
  return new ApiError(message, 409, code, ErrorSeverity.LOW, context);
}

/**
 * Creates an internal server error (500)
 */
export function createInternalError(
  message: string = 'Internal server error',
  code: string = 'INTERNAL_ERROR',
  context?: Record<string, any>
): ApiError {
  return new ApiError(message, 500, code, ErrorSeverity.MEDIUM, context);
}

// ==================== RESPONSE FORMATTERS ====================

/**
 * Formats an error into a standardized API error response
 */
export function formatErrorResponse(
  error: Error | ApiError,
  req: Request
): ApiErrorResponse {
  const isApiError = error instanceof ApiError;
  
  return {
    success: false,
    error: isApiError ? error.code : 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
    code: isApiError ? error.code : undefined,
    timestamp: new Date().toISOString(),
    endpoint: `${req.method} ${req.path}`,
    requestId: req.headers['x-request-id'] as string
  };
}

/**
 * Formats a successful response
 */
export function formatSuccessResponse<T>(
  data?: T,
  message?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

// ==================== MIDDLEWARE ====================

/**
 * Enhanced request logging middleware with error context
 */
export function requestLoggingMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Add request ID to headers for tracking
  req.headers['x-request-id'] = requestId;
  
  // Log request start
  console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.path}`, {
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    bodySize: req.headers['content-length'],
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: shouldLogBody(req) ? req.body : '[BODY_LOGGED_SEPARATELY]'
  });

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    
    console.log(`[${new Date().toISOString()}] [${requestId}] ${logLevel} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseBody: shouldLogResponseBody(res.statusCode) ? body : '[RESPONSE_LOGGED_SEPARATELY]'
    });

    return originalJson.call(this, body);
  };

  next();
}

/**
 * Global error handling middleware
 */
export function errorHandlingMiddleware(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Don't handle if response already sent
  if (res.headersSent) {
    return next(error);
  }

  const isApiError = error instanceof ApiError;
  const statusCode = isApiError ? error.statusCode : 500;
  
  // Log the error with appropriate severity
  logError(error, req, isApiError ? error.severity : ErrorSeverity.HIGH);

  // Format and send error response
  const errorResponse = formatErrorResponse(error, req);
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler middleware for unknown routes
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  const error = createNotFoundError('Endpoint', req.path, {
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /describe_location',
      'GET /get_stats',
      'GET /inventory',
      'GET /enemies',
      'POST /attack',
      'POST /move',
      'POST /new_game'
    ]
  });

  const errorResponse = formatErrorResponse(error, req);
  res.status(404).json(errorResponse);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generates a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determines if request body should be logged (exclude sensitive data)
 */
function shouldLogBody(req: Request): boolean {
  // Don't log body for certain content types or large payloads
  const contentType = req.headers['content-type'] || '';
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  
  if (contentLength > 10000) return false; // Skip large payloads
  if (contentType.includes('multipart/form-data')) return false; // Skip file uploads
  if (contentType.includes('application/octet-stream')) return false; // Skip binary data
  
  return true;
}

/**
 * Determines if response body should be logged
 */
function shouldLogResponseBody(statusCode: number): boolean {
  // Log response bodies for errors and some success cases
  return statusCode >= 400 || statusCode === 201;
}

/**
 * Logs errors with appropriate detail level based on severity
 */
function logError(
  error: Error | ApiError,
  req: Request,
  severity: ErrorSeverity
): void {
  const timestamp = new Date().toISOString();
  const requestId = req.headers['x-request-id'] as string;
  const isApiError = error instanceof ApiError;

  const logContext = {
    timestamp,
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    error: {
      name: error.name,
      message: error.message,
      code: isApiError ? error.code : 'UNKNOWN_ERROR',
      statusCode: isApiError ? error.statusCode : 500,
      severity,
      stack: severity >= ErrorSeverity.MEDIUM ? error.stack : undefined,
      context: isApiError ? error.context : undefined
    }
  };

  // Use different console methods based on severity
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      console.error(`[${timestamp}] [${requestId}] CRITICAL ERROR:`, logContext);
      break;
    case ErrorSeverity.HIGH:
      console.error(`[${timestamp}] [${requestId}] HIGH SEVERITY ERROR:`, logContext);
      break;
    case ErrorSeverity.MEDIUM:
      console.error(`[${timestamp}] [${requestId}] ERROR:`, logContext);
      break;
    case ErrorSeverity.LOW:
      console.warn(`[${timestamp}] [${requestId}] WARNING:`, logContext);
      break;
    default:
      console.error(`[${timestamp}] [${requestId}] ERROR:`, logContext);
  }
}

/**
 * Wraps async route handlers to catch errors automatically
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Creates a timeout middleware for slow operations
 */
export function timeoutMiddleware(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = createInternalError(
          `Request timeout after ${timeoutMs}ms`,
          'REQUEST_TIMEOUT',
          { timeoutMs, path: req.path, method: req.method }
        );
        next(error);
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    const originalSend = res.send;
    res.send = function(body: any) {
      clearTimeout(timeout);
      return originalSend.call(this, body);
    };

    next();
  };
}