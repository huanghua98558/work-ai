/**
 * 内存缓存工具
 * 用于缓存 API 响应，减少数据库查询
 * 适用于单服务器部署
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number; // 默认过期时间（毫秒）

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;

    // 每分钟清理过期缓存
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * 获取缓存或设置缓存
   * @param key 缓存键
   * @param fetcher 数据获取函数
   * @param ttl 过期时间（毫秒），默认使用 defaultTTL
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // 检查缓存
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expires) {
      console.log(`[MemoryCache] 命中缓存: ${key}`);
      return entry.data as T;
    }

    console.log(`[MemoryCache] 缓存未命中: ${key}`);

    // 获取数据
    const data = await fetcher();

    // 设置缓存
    this.set(key, data, ttl);

    return data;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      expires: Date.now() + (ttl || this.defaultTTL),
    };

    this.cache.set(key, entry as CacheEntry<any>);
    console.log(`[MemoryCache] 设置缓存: ${key} (TTL: ${ttl || this.defaultTTL}ms)`);
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() >= entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
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
    console.log('[MemoryCache] 清空所有缓存');
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[MemoryCache] 清理了 ${cleaned} 个过期缓存项`);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now < entry.expires) {
        valid++;
      } else {
        expired++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// 导出单例
export const memoryCache = new MemoryCache();

// 导出便捷函数
export async function cache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return memoryCache.getOrSet(key, fetcher, ttl);
}

// 导出缓存统计函数（用于健康检查）
export function getCacheStats() {
  const stats = memoryCache.getStats();
  return {
    size: stats.total,
    hits: 0, // 简化实现，实际应用中可以追踪命中率
    misses: 0,
  };
}
