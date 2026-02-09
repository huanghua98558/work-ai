/**
 * API 客户端
 * 自动处理 Token 验证、刷新和错误重试
 */

// Token 管理接口
export interface TokenStorage {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// API 响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
}

// 请求配置接口
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  retry?: boolean; // 是否自动重试（Token 过期时）
  skipAuth?: boolean; // 是否跳过认证
}

// Token 刷新中标志
let isRefreshing = false;
// 等待刷新的请求队列
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Token 管理类
 */
class TokenManager {
  /**
   * 获取存储的 Token
   */
  static getTokens(): TokenStorage | null {
    try {
      const tokenStr = localStorage.getItem('tokens');
      if (!tokenStr) return null;

      const tokens = JSON.parse(tokenStr) as TokenStorage;

      // 检查是否过期
      if (Date.now() >= tokens.expiresAt) {
        console.warn('[TokenManager] Access token 已过期');
        return tokens; // 返回过期 token，让 API 层处理刷新
      }

      return tokens;
    } catch (error) {
      console.error('[TokenManager] 读取 token 失败:', error);
      return null;
    }
  }

  /**
   * 保存 Token
   */
  static saveTokens(accessToken: string, refreshToken: string): void {
    const tokens: TokenStorage = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天后过期
    };

    localStorage.setItem('tokens', JSON.stringify(tokens));
    console.log('[TokenManager] Token 已保存');
  }

  /**
   * 清除 Token
   */
  static clearTokens(): void {
    localStorage.removeItem('tokens');
    console.log('[TokenManager] Token 已清除');
  }

  /**
   * 检查 Token 是否即将过期
   * 根据不同 Token 有效期，提前刷新时间不同：
   * - 短期 Token（< 2小时）：提前 10 分钟
   * - 中期 Token（2小时 - 7天）：提前 2 小时
   * - 长期 Token（7天 - 30天）：提前 1 天
   * - 超长期 Token（> 30天）：提前 3 天
   */
  static isTokenExpiringSoon(thresholdMs?: number): boolean {
    const tokens = this.getTokens();
    if (!tokens) return false;

    const expiresIn = tokens.expiresAt - Date.now();

    // 如果用户指定了阈值，使用用户指定的值
    if (thresholdMs !== undefined) {
      return expiresIn < thresholdMs;
    }

    // 否则根据 Token 有效期自动计算
    const totalValidity = tokens.expiresAt - (Date.now() - expiresIn);

    // 短期 Token（< 2小时）：提前 10 分钟
    if (totalValidity < 2 * 60 * 60 * 1000) {
      return expiresIn < 10 * 60 * 1000;
    }

    // 中期 Token（2小时 - 7天）：提前 2 小时
    if (totalValidity < 7 * 24 * 60 * 60 * 1000) {
      return expiresIn < 2 * 60 * 60 * 1000;
    }

    // 长期 Token（7天 - 30天）：提前 1 天
    if (totalValidity < 30 * 24 * 60 * 60 * 1000) {
      return expiresIn < 24 * 60 * 60 * 1000;
    }

    // 超长期 Token（> 30天）：提前 3 天
    return expiresIn < 3 * 24 * 60 * 60 * 1000;
  }

  /**
   * 获取 Token 剩余有效时间（毫秒）
   */
  static getExpiresIn(): number {
    const tokens = this.getTokens();
    if (!tokens) return 0;

    const expiresIn = tokens.expiresAt - Date.now();
    return Math.max(0, expiresIn);
  }

  /**
   * 获取 Token 剩余有效时间（人类可读格式）
   */
  static getExpiresInHumanReadable(): string {
    const expiresIn = this.getExpiresIn();

    if (expiresIn <= 0) return '已过期';

    const days = Math.floor(expiresIn / (24 * 60 * 60 * 1000));
    const hours = Math.floor((expiresIn % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((expiresIn % (60 * 60 * 1000)) / (60 * 1000));

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}分钟`);

    return parts.join(' ');
  }

  /**
   * 获取 Access Token
   */
  static getAccessToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.accessToken || null;
  }

  /**
   * 获取 Refresh Token
   */
  static getRefreshToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.refreshToken || null;
  }
}

/**
 * API 客户端类
 */
class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * 刷新 Access Token
   */
  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      console.error('[ApiClient] 没有 Refresh Token');
      return null;
    }

    try {
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error('[ApiClient] 刷新 Token 失败:', data.error);
        TokenManager.clearTokens();
        return null;
      }

      // 保存新的 Token
      TokenManager.saveTokens(data.data.accessToken, data.data.refreshToken);

      return data.data.accessToken;
    } catch (error) {
      console.error('[ApiClient] 刷新 Token 请求失败:', error);
      TokenManager.clearTokens();
      return null;
    }
  }

  /**
   * 添加订阅者
   */
  private subscribeTokenRefresh(callback: (token: string) => void): void {
    refreshSubscribers.push(callback);
  }

  /**
   * 通知订阅者
   */
  private notifySubscribers(token: string): void {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
  }

  /**
   * 发送请求
   */
  private async request<T>(
    url: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      retry = true,
      skipAuth = false,
    } = config;

    // 合并请求头
    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers,
    };

    // 添加 Authorization 头
    if (!skipAuth) {
      const token = TokenManager.getAccessToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // 构建请求选项
    const options: RequestInit = {
      method,
      headers: requestHeaders,
    };

    // 添加请求体
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      // 发送请求
      const response = await fetch(this.baseURL + url, options);
      const data = await response.json();

      // 处理 401 未授权错误
      if (response.status === 401 && retry && !skipAuth) {
        console.warn('[ApiClient] 收到 401 响应，尝试刷新 Token');

        // 如果正在刷新，等待刷新完成
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            this.subscribeTokenRefresh((token: string) => {
              // 使用新 token 重试请求
              this.request(url, { ...config, retry: false })
                .then(resolve)
                .catch(reject);
            });
          });
        }

        // 开始刷新 Token
        isRefreshing = true;

        try {
          const newToken = await this.refreshAccessToken();

          if (!newToken) {
            // 刷新失败，跳转到登录页
            console.error('[ApiClient] Token 刷新失败，跳转到登录页');
            TokenManager.clearTokens();
            window.location.href = '/login';
            return { success: false, error: '登录已过期，请重新登录' };
          }

          // 通知所有等待的请求
          this.notifySubscribers(newToken);

          // 使用新 token 重试请求
          return await this.request(url, { ...config, retry: false });
        } finally {
          isRefreshing = false;
        }
      }

      return data;
    } catch (error: any) {
      console.error('[ApiClient] 请求失败:', error);
      return {
        success: false,
        error: error.message || '网络请求失败',
      };
    }
  }

  /**
   * GET 请求
   */
  async get<T>(url: string, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post<T>(url: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'POST', body });
  }

  /**
   * PUT 请求
   */
  async put<T>(url: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE 请求
   */
  async delete<T>(url: string, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH 请求
   */
  async patch<T>(url: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PATCH', body });
  }
}

// 导出单例
export const apiClient = new ApiClient();
export { TokenManager };

/**
 * 便捷方法：验证 Token 是否有效
 */
export function validateToken(): boolean {
  const tokens = TokenManager.getTokens();
  if (!tokens) return false;

  // 检查是否过期
  if (Date.now() >= tokens.expiresAt) {
    console.warn('[validateToken] Token 已过期');
    return false;
  }

  return true;
}

/**
 * 便捷方法：获取用户信息（从 Token 中解析）
 */
export function getUserInfoFromToken(): { userId: number; phone: string; role: string } | null {
  const tokens = TokenManager.getTokens();
  if (!tokens) return null;

  try {
    // 解析 JWT payload
    const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
    return {
      userId: payload.userId,
      phone: payload.phone,
      role: payload.role,
    };
  } catch (error) {
    console.error('[getUserInfoFromToken] 解析 Token 失败:', error);
    return null;
  }
}
