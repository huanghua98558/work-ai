/**
 * API 响应缓存模块
 *
 * 提供内存缓存功能，用于缓存 API 响应，减少数据库查询
 * 注意：在多实例部署时，每个实例都有独立的缓存
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live (毫秒)
  maxSize?: number; // 最大缓存条目数
}

export class ApiCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private defaultTTL: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 默认 5 分钟
    this.maxSize = options.maxSize || 100; // 默认最多 100 个条目

    // 定期清理过期缓存（每 5 分钟）
    this.startCleanup();
  }

  /**
   * 设置缓存
   */
  set(key: string, data: T, ttl?: number): boolean {
    // 检查缓存大小
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // 缓存已满，删除最旧的条目
      this.evictOldest();
    }

    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      hits: 0,
    });

    return true;
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // 增加命中计数
    entry.hits++;

    return entry.data;
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    entries: Array<{
      key: string;
      timestamp: number;
      expiresAt: number;
      hits: number;
      age: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      hits: entry.hits,
      age: now - entry.timestamp,
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries,
    };
  }

  /**
   * 删除最旧的缓存条目（LRU）
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[ApiCache] 清理了 ${cleaned} 个过期缓存条目`);
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    const cleanupInterval = 5 * 60 * 1000; // 5 分钟

    setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }
}

// 创建全局缓存实例
export const apiCache = new ApiCache();

/**
 * 带缓存的 API 响应辅助函数
 *
 * 使用示例:
 * ```typescript
 * import { withCache } from '@/lib/cache';
 *
 * export async function GET() {
 *   return withCache(
 *     'dashboard-stats',
 *     async () => {
 *       // ... 获取数据
 *       return { data: ... };
 *     },
 *     { ttl: 5 * 60 * 1000 } // 5 分钟
 *   );
 * }
 * ```
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options?: CacheOptions
): Promise<{ data: T; fromCache: boolean }> {
  // 尝试从缓存获取
  const cached = apiCache.get(key);

  if (cached !== null) {
    console.log(`[Cache] 命中缓存: ${key}`);
    return { data: cached, fromCache: true };
  }

  // 缓存未命中，执行函数
  console.log(`[Cache] 缓存未命中，执行函数: ${key}`);
  const data = await fn();

  // 存入缓存
  apiCache.set(key, data, options?.ttl);

  return { data, fromCache: false };
}

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
  /**
   * 生成缓存键
   */
  static generate(prefix: string, params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    const paramStr = sortedKeys
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    return `${prefix}:${paramStr}`;
  }

  /**
   * 生成用户相关的缓存键
   */
  static userKey(userId: number, resource: string, params?: Record<string, any>): string {
    const base = `user:${userId}:${resource}`;
    return params ? this.generate(base, params) : base;
  }

  /**
   * 生成机器人相关的缓存键
   */
  static robotKey(robotId: string, resource: string, params?: Record<string, any>): string {
    const base = `robot:${robotId}:${resource}`;
    return params ? this.generate(base, params) : base;
  }
}

/**
 * 缓存装饰器
 *
 * 使用示例:
 * ```typescript
 * class MyService {
 *   @Cacheable('user-stats', 60 * 1000)
 *   async getUserStats(userId: number) {
 *     // ... 获取数据
 *   }
 * }
 * ```
 */
export function Cacheable(prefix: string, ttl: number = 5 * 60 * 1000) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 生成缓存键
      const key = CacheKeyGenerator.generate(prefix, {
        method: propertyKey,
        args: args,
      });

      // 尝试从缓存获取
      const cached = apiCache.get(key);
      if (cached !== null) {
        return cached;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 存入缓存
      apiCache.set(key, result, ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * 清除缓存辅助函数
 */
export function clearCache(pattern?: string): number {
  if (!pattern) {
    const size = apiCache.size();
    apiCache.clear();
    console.log(`[Cache] 清空所有缓存: ${size} 个条目`);
    return size;
  }

  // 清除匹配模式的缓存
  const stats = apiCache.getStats();
  let cleared = 0;

  stats.entries.forEach(({ key }) => {
    if (key.startsWith(pattern)) {
      apiCache.delete(key);
      cleared++;
    }
  });

  console.log(`[Cache] 清除匹配 "${pattern}" 的缓存: ${cleared} 个条目`);
  return cleared;
}
