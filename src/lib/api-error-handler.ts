/**
 * API 错误处理工具
 *
 * 统一的错误处理和响应格式
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = '请求参数错误') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = '未授权访问') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = '权限不足') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = '资源不存在') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = '资源冲突') {
    super(message, 409, 'CONFLICT');
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message: string = '请求过于频繁') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = '服务器内部错误') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message: string = '服务暂时不可用') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string = '数据库操作失败') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class FileUploadError extends ApiError {
  constructor(message: string = '文件上传失败') {
    super(message, 500, 'FILE_UPLOAD_ERROR');
  }
}

/**
 * 错误响应格式
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  error: ApiError | Error,
  requestId?: string
): ErrorResponse {
  const isApiError = error instanceof ApiError;

  return {
    success: false,
    error: error.message,
    code: isApiError ? error.code : 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * 包装 API 处理函数，自动处理错误
 */
export function withErrorHandling(
  handler: (...args: any[]) => Promise<any>
): (...args: any[]) => Promise<any> {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error: any) {
      // 如果已经是 ApiError，直接抛出
      if (error instanceof ApiError) {
        throw error;
      }

      // 将其他错误转换为 InternalServerError
      throw new InternalServerError(error.message || '服务器内部错误');
    }
  };
}
