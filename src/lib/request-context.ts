import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { logger, LogEntry } from './error-logger';

/**
 * 请求上下文
 */
export interface RequestContext {
  requestId: string;
  userId?: number;
  robotId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  startTime: number;
}

/**
 * 异步本地存储
 */
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * 请求上下文管理器
 */
export class RequestContextManager {
  /**
   * 创建请求上下文
   */
  static createContext(
    initialContext?: Partial<RequestContext>
  ): RequestContext {
    return {
      requestId: initialContext?.requestId || uuidv4(),
      userId: initialContext?.userId,
      robotId: initialContext?.robotId,
      sessionId: initialContext?.sessionId,
      ip: initialContext?.ip,
      userAgent: initialContext?.userAgent,
      path: initialContext?.path,
      method: initialContext?.method,
      startTime: Date.now(),
    };
  }

  /**
   * 运行请求上下文
   */
  static run<T>(
    context: RequestContext,
    callback: () => Promise<T>
  ): Promise<T> {
    return asyncLocalStorage.run(context, callback);
  }

  /**
   * 获取当前请求上下文
   */
  static getContext(): RequestContext | undefined {
    return asyncLocalStorage.getStore();
  }

  /**
   * 获取请求 ID
   */
  static getRequestId(): string | undefined {
    return asyncLocalStorage.getStore()?.requestId;
  }

  /**
   * 获取用户 ID
   */
  static getUserId(): number | undefined {
    return asyncLocalStorage.getStore()?.userId;
  }

  /**
   * 获取机器人 ID
   */
  static getRobotId(): string | undefined {
    return asyncLocalStorage.getStore()?.robotId;
  }

  /**
   * 设置机器人 ID
   */
  static setRobotId(robotId: string): void {
    const context = asyncLocalStorage.getStore();
    if (context) {
      context.robotId = robotId;
    }
  }

  /**
   * 设置会话 ID
   */
  static setSessionId(sessionId: string): void {
    const context = asyncLocalStorage.getStore();
    if (context) {
      context.sessionId = sessionId;
    }
  }

  /**
   * 记录请求日志
   */
  static logRequestStart(method: string, path: string, ip?: string, userAgent?: string): void {
    const context = asyncLocalStorage.getStore();
    if (context) {
      context.method = method;
      context.path = path;
      context.ip = ip;
      context.userAgent = userAgent;
    }

    logger.info(`${method} ${path}`, {
      requestId: context?.requestId,
      method,
      path,
      ip,
      userAgent,
    });
  }

  /**
   * 记录请求完成日志
   */
  static logRequestEnd(statusCode: number, responseTime?: number): void {
    const context = asyncLocalStorage.getStore();
    if (!context) return;

    const duration = responseTime || Date.now() - context.startTime;

    logger.info(`${context.method || 'GET'} ${context.path || '/'} ${statusCode}`, {
      requestId: context.requestId,
      method: context.method,
      path: context.path,
      statusCode,
      responseTime: duration,
    });
  }

  /**
   * 记录请求错误日志
   */
  static logRequestError(error: Error, statusCode?: number): void {
    const context = asyncLocalStorage.getStore();
    if (!context) {
      logger.logError(error);
      return;
    }

    const duration = Date.now() - context.startTime;

    const logContext: Partial<LogEntry> = {
      requestId: context.requestId,
      userId: context.userId,
      robotId: context.robotId,
      sessionId: context.sessionId,
      path: context.path,
      method: context.method,
      responseTime: duration,
    };

    logger.logError(error, logContext);
  }
}

/**
 * Next.js 请求处理包装器
 */
export function withRequestContext<T>(
  handler: (context: RequestContext) => Promise<T>,
  initialContext?: Partial<RequestContext>
) {
  return async (): Promise<T> => {
    const context = RequestContextManager.createContext(initialContext);
    return RequestContextManager.run(context, async () => {
      return handler(context);
    });
  };
}
