/**
 * 安全中间件
 * 提供请求频率限制、Token 黑名单等安全功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';

// Token 黑名单（使用 Set 存储已失效的 Token）
// 在生产环境中，应该使用 Redis 或数据库存储
const tokenBlacklist = new Set<string>();

/**
 * Token 黑名单管理器
 */
export class TokenBlacklist {
  /**
   * 将 Token 加入黑名单
   */
  static add(token: string): void {
    try {
      // 提取 JWT ID (jti) 或使用 token 本身
      const decoded = verifyToken(token);
      if (decoded) {
        const key = `${decoded.userId}:${Date.now()}`;
        tokenBlacklist.add(key);
        console.log('[TokenBlacklist] Token 已加入黑名单:', key);
      } else {
        tokenBlacklist.add(token);
      }
    } catch (error) {
      console.error('[TokenBlacklist] 加入黑名单失败:', error);
    }
  }

  /**
   * 检查 Token 是否在黑名单中
   */
  static isBlacklisted(token: string): boolean {
    try {
      const decoded = verifyToken(token);
      if (decoded) {
        const key = `${decoded.userId}:${Date.now()}`;
        return tokenBlacklist.has(key);
      }
      return tokenBlacklist.has(token);
    } catch (error) {
      console.error('[TokenBlacklist] 检查黑名单失败:', error);
      return false;
    }
  }

  /**
   * 清理过期的黑名单项（定期调用）
   */
  static cleanup(): void {
    // 在生产环境中，应该根据时间戳清理
    // 这里只是示例
    if (tokenBlacklist.size > 1000) {
      tokenBlacklist.clear();
      console.log('[TokenBlacklist] 黑名单已清理');
    }
  }
}

/**
 * 请求频率限制器
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // 每分钟清理一次过期记录
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * 检查是否超过请求限制
   */
  check(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    // 过滤掉过期的请求记录
    const validRequests = userRequests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    // 检查是否超过限制
    if (validRequests.length >= this.maxRequests) {
      console.warn('[RateLimiter] 超过请求限制:', identifier);
      return false;
    }

    // 添加新的请求记录
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  /**
   * 获取剩余请求数
   */
  getRemainingRequests(identifier: string): number {
    const userRequests = this.requests.get(identifier) || [];
    const now = Date.now();
    const validRequests = userRequests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    for (const [identifier, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(
        (timestamp) => timestamp > cutoff
      );

      if (validTimestamps.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validTimestamps);
      }
    }

    console.log(`[RateLimiter] 清理完成，当前活跃用户数: ${this.requests.size}`);
  }
}

// 全局频率限制器实例
export const globalRateLimiter = new RateLimiter(100, 60000); // 每分钟100次
export const authRateLimiter = new RateLimiter(5, 60000); // 登录接口每分钟5次
export const apiRateLimiter = new RateLimiter(60, 60000); // API接口每分钟60次

/**
 * IP 白名单检查器
 */
export class IpWhitelist {
  private whitelist: Set<string> = new Set();

  constructor(ips: string[] = []) {
    ips.forEach(ip => this.whitelist.add(ip));
  }

  /**
   * 添加 IP 到白名单
   */
  add(ip: string): void {
    this.whitelist.add(ip);
  }

  /**
   * 移除 IP 从白名单
   */
  remove(ip: string): void {
    this.whitelist.delete(ip);
  }

  /**
   * 检查 IP 是否在白名单中
   */
  isAllowed(ip: string): boolean {
    return this.whitelist.has(ip) || this.whitelist.has('*');
  }

  /**
   * 获取所有白名单 IP
   */
  getAll(): string[] {
    return Array.from(this.whitelist);
  }
}

/**
 * 安全验证中间件
 */
export interface SecurityMiddlewareOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  skipRateLimit?: boolean;
  customRateLimiter?: RateLimiter;
  enableIpWhitelist?: boolean;
  ipWhitelist?: IpWhitelist;
}

export function createSecurityMiddleware(options: SecurityMiddlewareOptions = {}) {
  const {
    requireAuth = false,
    requireAdmin = false,
    skipRateLimit = false,
    customRateLimiter,
    enableIpWhitelist = false,
    ipWhitelist,
  } = options;

  return async function middleware(request: NextRequest) {
    // 获取客户端 IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    console.log(`[Security] 请求来源 IP: ${ip}`);

    // IP 白名单检查
    if (enableIpWhitelist && ipWhitelist && !ipWhitelist.isAllowed(ip)) {
      console.warn(`[Security] IP 不在白名单中: ${ip}`);
      return NextResponse.json(
        { success: false, error: '访问被拒绝，IP 不在白名单中' },
        { status: 403 }
      );
    }

    // 频率限制检查
    if (!skipRateLimit) {
      const rateLimiter = customRateLimiter || apiRateLimiter;
      if (!rateLimiter.check(ip)) {
        console.warn(`[Security] 超过请求频率限制: ${ip}`);
        return NextResponse.json(
          {
            success: false,
            error: '请求过于频繁，请稍后再试',
            remaining: rateLimiter.getRemainingRequests(ip),
          },
          { status: 429 }
        );
      }
    }

    // Token 验证
    if (requireAuth) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('[Security] 缺少认证信息');
        return NextResponse.json(
          { success: false, error: '需要登录' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);

      // 检查 Token 是否在黑名单中
      if (TokenBlacklist.isBlacklisted(token)) {
        console.warn('[Security] Token 在黑名单中');
        return NextResponse.json(
          { success: false, error: 'Token 已失效，请重新登录' },
          { status: 401 }
        );
      }

      // 验证 Token
      const payload = verifyToken(token);
      if (!payload) {
        console.warn('[Security] Token 无效或已过期');
        return NextResponse.json(
          { success: false, error: 'Token 无效或已过期' },
          { status: 401 }
        );
      }

      // 管理员权限检查
      if (requireAdmin && payload.role !== 'admin') {
        console.warn('[Security] 权限不足，需要管理员权限');
        return NextResponse.json(
          { success: false, error: '权限不足' },
          { status: 403 }
        );
      }

      // 将用户信息添加到请求头中，供后续使用
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', String(payload.userId));
      requestHeaders.set('x-user-role', payload.role);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  };
}

/**
 * 安全相关工具函数
 */

/**
 * 生成安全的随机字符串
 */
export function generateSecureRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint32Array(length);

  // 使用加密安全的随机数生成器
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // 回退到普通随机数生成器
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return result;
}

/**
 * 验证密码强度
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // 长度检查
  if (password.length < 8) {
    feedback.push('密码长度至少为8位');
  } else {
    score += 1;
  }

  // 包含大写字母
  if (!/[A-Z]/.test(password)) {
    feedback.push('密码应包含至少一个大写字母');
  } else {
    score += 1;
  }

  // 包含小写字母
  if (!/[a-z]/.test(password)) {
    feedback.push('密码应包含至少一个小写字母');
  } else {
    score += 1;
  }

  // 包含数字
  if (!/\d/.test(password)) {
    feedback.push('密码应包含至少一个数字');
  } else {
    score += 1;
  }

  // 包含特殊字符
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('密码应包含至少一个特殊字符');
  } else {
    score += 1;
  }

  return {
    valid: score >= 4,
    score,
    feedback,
  };
}

/**
 * 脱敏处理（隐藏敏感信息）
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars * 2) {
    return '****';
  }

  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const middle = '*'.repeat(Math.min(data.length - visibleChars * 2, 8));

  return `${start}${middle}${end}`;
}
