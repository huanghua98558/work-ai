import { NextRequest, NextResponse } from 'next/server';

/**
 * API 性能监控中间件
 *
 * 用法：
 * import { withPerformanceMonitoring } from '@/lib/api-middleware';
 *
 * export const GET = withPerformanceMonitoring(async (request: NextRequest) => {
 *   // 你的 API 逻辑
 * });
 */

const SLOW_API_THRESHOLD = 1000; // 1秒
const VERY_SLOW_API_THRESHOLD = 3000; // 3秒

export interface PerformanceResult {
  startTime: number;
  endTime: number;
  duration: number;
  isSlow: boolean;
  isVerySlow: boolean;
}

export function withPerformanceMonitoring(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    const url = request.url;
    const method = request.method;

    console.log(`[API] ${method} ${url} - 开始处理`);

    try {
      const response = await handler(request, ...args);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const isSlow = duration > SLOW_API_THRESHOLD;
      const isVerySlow = duration > VERY_SLOW_API_THRESHOLD;

      // 记录性能信息
      const perfResult: PerformanceResult = {
        startTime,
        endTime,
        duration,
        isSlow,
        isVerySlow,
      };

      // 根据响应时间记录不同级别的日志
      if (isVerySlow) {
        console.error(
          `[API] ${method} ${url} - 性能警告: ${duration}ms (非常慢)`,
          perfResult
        );
      } else if (isSlow) {
        console.warn(
          `[API] ${method} ${url} - 性能警告: ${duration}ms (较慢)`,
          perfResult
        );
      } else {
        console.log(
          `[API] ${method} ${url} - 完成: ${duration}ms`
        );
      }

      // 在响应头中添加性能信息
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Request-ID', generateRequestId());

      return response;
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.error(
        `[API] ${method} ${url} - 错误 (${duration}ms):`,
        error
      );

      // 返回统一的错误响应
      return NextResponse.json(
        {
          success: false,
          error: error.message || '服务器内部错误',
          timestamp: new Date().toISOString(),
        },
        { status: error.status || 500 }
      );
    }
  };
}

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 记录慢查询
 */
export function logSlowQuery(
  query: string,
  duration: number,
  threshold: number = 1000
): void {
  if (duration > threshold) {
    console.warn(
      `[数据库] 慢查询警告: ${duration}ms (阈值: ${threshold}ms)`,
      { query: query.substring(0, 200) }
    );
  }
}
