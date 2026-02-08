/**
 * API 请求限流模块
 *
 * 实现基于滑动窗口的请求限流算法，防止 API 滥用和 DDoS 攻击
 */

import { getEnv } from './env-validation';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * 内存存储的限流记录
 *
 * 注意：在多实例部署时，每个实例都有独立的限流记录
 * 如需全局限流，建议使用 Redis 等外部存储
 */
class InMemoryRateLimitStore {
  private store: Map<string, RateLimitRecord>;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.store = new Map();
    // 定期清理过期的限流记录（每 5 分钟）
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  get(key: string): RateLimitRecord | undefined {
    return this.store.get(key);
  }

  set(key: string, record: RateLimitRecord): void {
    this.store.set(key, record);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

const rateLimitStore = new InMemoryRateLimitStore();

/**
 * 检查请求是否超出限流
 *
 * @param identifier - 限流标识符（如 IP 地址、用户 ID）
 * @param limit - 最大请求数
 * @param windowMs - 时间窗口（毫秒）
 * @returns 限流结果
 */
export function checkRateLimit(
  identifier: string,
  limit?: number,
  windowMs?: number
): RateLimitResult {
  const env = getEnv();

  // 如果限流未启用，直接通过
  if (!env.RATE_LIMIT_ENABLED) {
    return {
      success: true,
      remaining: Infinity,
      resetTime: Date.now() + (windowMs || env.RATE_LIMIT_WINDOW_MS),
    };
  }

  const maxRequests = limit ?? env.RATE_LIMIT_MAX_REQUESTS;
  const window = windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // 如果没有记录，创建新记录
  if (!record) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + window,
    };
    rateLimitStore.set(identifier, newRecord);

    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: newRecord.resetTime,
    };
  }

  // 如果窗口已过期，重置计数
  if (now >= record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + window,
    };
    rateLimitStore.set(identifier, newRecord);

    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: newRecord.resetTime,
    };
  }

  // 检查是否超出限制
  if (record.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  // 增加计数
  record.count++;
  rateLimitStore.set(identifier, record);

  return {
    success: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * 重置限流记录
 *
 * @param identifier - 限流标识符
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * 清空所有限流记录
 */
export function clearRateLimit(): void {
  rateLimitStore.clear();
}

/**
 * 获取当前限流记录数量
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size();
}

/**
 * 从请求中提取限流标识符
 *
 * 优先级: 用户 ID > IP 地址
 */
export function extractRateLimitIdentifier(request: Request): string {
  // 1. 尝试从 header 获取用户 ID
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // 2. 尝试从 header 获取 IP 地址
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim();
  if (ip) {
    return `ip:${ip}`;
  }

  // 3. 尝试从 header 获取真实 IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }

  // 4. 使用默认标识符
  return 'anonymous';
}

/**
 * 为 API 路由添加限流的辅助函数
 *
 * 使用示例:
 * ```typescript
 * import { rateLimiter } from '@/lib/rate-limit';
 *
 * export async function GET(request: Request) {
 *   const result = await rateLimiter(request);
 *
 *   if (!result.success) {
 *     return NextResponse.json(
 *       { success: false, error: '请求过于频繁，请稍后再试' },
 *       { status: 429, headers: {
 *         'X-RateLimit-Limit': '100',
 *         'X-RateLimit-Remaining': result.remaining.toString(),
 *         'X-RateLimit-Reset': result.resetTime.toString(),
 *         'Retry-After': result.retryAfter?.toString(),
 *       }}
 *     );
 *   }
 *
 *   // ... 继续处理请求
 * }
 * ```
 */
export async function rateLimiter(
  request: Request,
  options?: {
    limit?: number;
    windowMs?: number;
  }
): Promise<RateLimitResult> {
  const identifier = extractRateLimitIdentifier(request);
  const result = checkRateLimit(identifier, options?.limit, options?.windowMs);

  return result;
}

/**
 * 添加限流响应头
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
  limit: number = getEnv().RATE_LIMIT_MAX_REQUESTS
): Headers {
  headers.set('X-RateLimit-Limit', limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetTime.toString());

  if (!result.success && result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }

  return headers;
}

/**
 * 限流装饰器（用于类方法）
 *
 * 使用示例:
 * ```typescript
 * class MyService {
 *   @rateLimit({ limit: 10, windowMs: 60000 })
 *   async getData() {
 *     // ...
 *   }
 * }
 * ```
 */
export function rateLimit(options?: { limit?: number; windowMs?: number }) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const identifier = `${target.constructor.name}:${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const result = checkRateLimit(
        identifier,
        options?.limit,
        options?.windowMs
      );

      if (!result.success) {
        throw new Error(
          `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`
        );
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
