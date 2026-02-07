/**
 * 错误码枚举
 */
export enum ErrorCode {
  // 通用错误 1000-1999
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_PARAMS = 'INVALID_PARAMS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // 认证相关 2000-2999
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_SMS_CODE = 'INVALID_SMS_CODE',
  SMS_CODE_EXPIRED = 'SMS_CODE_EXPIRED',
  SMS_SEND_FAILED = 'SMS_SEND_FAILED',
  SMS_RATE_LIMIT = 'SMS_RATE_LIMIT',

  // 激活码相关 3000-3999
  ACTIVATION_CODE_NOT_FOUND = 'ACTIVATION_CODE_NOT_FOUND',
  ACTIVATION_CODE_EXPIRED = 'ACTIVATION_CODE_EXPIRED',
  ACTIVATION_CODE_USED = 'ACTIVATION_CODE_USED',
  INVALID_ACTIVATION_CODE = 'INVALID_ACTIVATION_CODE',

  // 设备/机器人相关 4000-4999
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  DEVICE_ALREADY_ACTIVATED = 'DEVICE_ALREADY_ACTIVATED',
  DEVICE_ACTIVATION_LIMIT = 'DEVICE_ACTIVATION_LIMIT',
  ROBOT_NOT_FOUND = 'ROBOT_NOT_FOUND',
  ROBOT_NOT_ACTIVATED = 'ROBOT_NOT_ACTIVATED',
  ROBOT_OFFLINE = 'ROBOT_OFFLINE',

  // 消息相关 5000-5999
  INVALID_MESSAGE_TYPE = 'INVALID_MESSAGE_TYPE',
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_CLOSED = 'SESSION_CLOSED',

  // AI 相关 6000-6999
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  AI_MODEL_ERROR = 'AI_MODEL_ERROR',
  AI_STREAM_ERROR = 'AI_STREAM_ERROR',
  AI_TIMEOUT = 'AI_TIMEOUT',

  // 知识库相关 7000-7999
  KNOWLEDGE_IMPORT_FAILED = 'KNOWLEDGE_IMPORT_FAILED',
  KNOWLEDGE_SEARCH_FAILED = 'KNOWLEDGE_SEARCH_FAILED',
  KNOWLEDGE_NOT_FOUND = 'KNOWLEDGE_NOT_FOUND',

  // 数据库相关 8000-8999
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_TRANSACTION_ERROR = 'DATABASE_TRANSACTION_ERROR',

  // 文件相关 9000-9999
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_SIZE_EXCEEDED = 'FILE_SIZE_EXCEEDED',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
}

/**
 * 错误等级
 */
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 应用错误基类
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly level: ErrorLevel;
  public readonly details?: any;
  public readonly requestId?: string;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    level: ErrorLevel = ErrorLevel.ERROR,
    details?: any,
    requestId?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.level = level;
    this.details = details;
    this.requestId = requestId;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      level: this.level,
      details: this.details,
      requestId: this.requestId,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      ErrorCode.INVALID_PARAMS,
      message,
      400,
      ErrorLevel.WARN,
      details,
      requestId
    );
    this.name = 'ValidationError';
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.INVALID_TOKEN, requestId?: string) {
    super(
      code,
      message,
      401,
      ErrorLevel.WARN,
      undefined,
      requestId
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * 授权错误
 */
export class AuthorizationError extends AppError {
  constructor(message: string, requestId?: string) {
    super(
      ErrorCode.FORBIDDEN,
      message,
      403,
      ErrorLevel.WARN,
      undefined,
      requestId
    );
    this.name = 'AuthorizationError';
  }
}

/**
 * 未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string, requestId?: string) {
    super(
      ErrorCode.NOT_FOUND,
      `${resource} 不存在`,
      404,
      ErrorLevel.INFO,
      undefined,
      requestId
    );
    this.name = 'NotFoundError';
  }
}

/**
 * 内部服务器错误
 */
export class InternalServerError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      ErrorCode.INTERNAL_ERROR,
      message,
      500,
      ErrorLevel.ERROR,
      details,
      requestId
    );
    this.name = 'InternalServerError';
  }
}

/**
 * 业务逻辑错误
 */
export class BusinessError extends AppError {
  constructor(code: ErrorCode, message: string, requestId?: string) {
    super(
      code,
      message,
      400,
      ErrorLevel.INFO,
      undefined,
      requestId
    );
    this.name = 'BusinessError';
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      ErrorCode.DATABASE_ERROR,
      message,
      500,
      ErrorLevel.ERROR,
      details,
      requestId
    );
    this.name = 'DatabaseError';
  }
}

/**
 * AI 服务错误
 */
export class AIServiceError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      ErrorCode.AI_SERVICE_ERROR,
      message,
      500,
      ErrorLevel.ERROR,
      details,
      requestId
    );
    this.name = 'AIServiceError';
  }
}

/**
 * 知识库错误
 */
export class KnowledgeError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.KNOWLEDGE_IMPORT_FAILED, requestId?: string) {
    super(
      code,
      message,
      500,
      ErrorLevel.ERROR,
      undefined,
      requestId
    );
    this.name = 'KnowledgeError';
  }
}
