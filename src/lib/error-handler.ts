import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  AppError,
  ErrorCode,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  InternalServerError,
  BusinessError,
  DatabaseError,
  AIServiceError,
  KnowledgeError,
} from './errors';
import { RequestContextManager } from './request-context';
import { logger, ErrorLevel } from './error-logger';

// 导出所有错误类型
export {
  AppError,
  ErrorCode,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  InternalServerError,
  BusinessError,
  DatabaseError,
  AIServiceError,
  KnowledgeError,
  ErrorLevel,
};

/**
 * API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: ErrorCode;
  details?: any;
  requestId?: string;
  timestamp: string;
}

/**
 * 成功响应
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  const requestId = RequestContextManager.getRequestId();

  const response: ApiResponse<T> = {
    success: true,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * 错误响应
 */
export function errorResponse(
  error: string | Error | AppError,
  statusCode: number = 500,
  code?: ErrorCode,
  details?: any
): NextResponse<ApiResponse> {
  const requestId = RequestContextManager.getRequestId();

  let message: string;
  let errorCode: ErrorCode;
  let finalDetails: any;
  let finalStatusCode: number;

  if (error instanceof AppError) {
    message = error.message;
    errorCode = error.code;
    finalDetails = error.details;
    finalStatusCode = error.statusCode;
  } else if (error instanceof Error) {
    message = error.message;
    errorCode = code || ErrorCode.INTERNAL_ERROR;
    finalDetails = details;
    finalStatusCode = statusCode;
  } else {
    message = error;
    errorCode = code || ErrorCode.INTERNAL_ERROR;
    finalDetails = details;
    finalStatusCode = statusCode;
  }

  const response: ApiResponse = {
    success: false,
    error: message,
    code: errorCode,
    details: finalDetails,
    requestId,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: finalStatusCode });
}

/**
 * 处理 API 错误
 */
export async function handleApiError(
  error: unknown,
  request?: Request
): Promise<NextResponse<ApiResponse>> {
  // 记录错误日志
  if (error instanceof Error) {
    RequestContextManager.logRequestError(error);
  }

  // Zod 验证错误
  if (error instanceof ZodError) {
    return errorResponse(
      '请求参数验证失败',
      400,
      ErrorCode.INVALID_PARAMS,
      error.errors
    );
  }

  // AppError 子类
  if (error instanceof AppError) {
    return errorResponse(error);
  }

  // 未知错误
  if (error instanceof Error) {
    return errorResponse(
      error.message || '服务器内部错误',
      500,
      ErrorCode.INTERNAL_ERROR,
      process.env.NODE_ENV === 'development' ? error.stack : undefined
    );
  }

  return errorResponse(
    '服务器内部错误',
    500,
    ErrorCode.INTERNAL_ERROR
  );
}

/**
 * API 路由包装器
 */
export function withErrorHandling<T extends Request = Request>(
  handler: (request: T, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: T, ...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return handleApiError(error, request);
    }
  };
}

/**
 * 异步操作包装器
 */
export async function asyncWrapper<T>(
  operation: () => Promise<T>,
  errorMessage: string = '操作失败'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new InternalServerError(errorMessage, error instanceof Error ? error.stack : undefined);
  }
}

/**
 * 数据库操作包装器
 */
export async function withDatabase<T>(
  operation: () => Promise<T>,
  errorMessage: string = '数据库操作失败'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new InternalServerError(errorMessage, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * AI 服务操作包装器
 */
export async function withAIService<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'AI 服务调用失败'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new InternalServerError(errorMessage, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 参数验证包装器
 */
export function validateParams<T>(
  schema: any,
  data: any
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('请求参数验证失败', error.errors);
    }
    throw new ValidationError('请求参数验证失败', error);
  }
}

/**
 * 检查资源是否存在
 */
export function ensureExists<T>(
  resource: T | null | undefined,
  resourceName: string
): T {
  if (resource === null || resource === undefined) {
    throw new NotFoundError(resourceName);
  }
  return resource;
}

/**
 * 检查权限
 */
export function ensurePermission(
  hasPermission: boolean,
  message: string = '无权执行此操作'
): void {
  if (!hasPermission) {
    throw new AuthorizationError(message);
  }
}

/**
 * 检查认证
 */
export function ensureAuthenticated(
  userId?: number
): number {
  if (!userId) {
    throw new AuthenticationError('未登录或登录已过期', ErrorCode.INVALID_TOKEN);
  }
  return userId;
}

/**
 * 重试包装器
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  errorMessage: string = '操作失败，请稍后重试'
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 如果是业务错误，不重试
      if (error instanceof AppError && error.statusCode < 500) {
        throw error;
      }

      // 最后一次重试失败，抛出错误
      if (i === maxRetries - 1) {
        break;
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }

  throw new InternalServerError(errorMessage, {
    error: lastError?.message,
    retries: maxRetries,
  });
}

/**
 * 超时包装器
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string = '操作超时，请稍后重试'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}
