export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// 400
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

export class ValidationError extends AppError {
  public readonly details: any;

  constructor(message = 'Validation failed', details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

// 401
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

// 403
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

// 404
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

// 409
export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

// 422
export class InsufficientFundsError extends AppError {
  constructor(message = 'Insufficient funds') {
    super(message, 422, 'INSUFFICIENT_FUNDS');
  }
}

export class InsufficientAssetsError extends AppError {
  constructor(message = 'Insufficient assets') {
    super(message, 422, 'INSUFFICIENT_ASSETS');
  }
}

// 500
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR', false);
  }
}

// 502
export class ExternalServiceError extends AppError {
  constructor(message = 'External service error', service?: string) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}
