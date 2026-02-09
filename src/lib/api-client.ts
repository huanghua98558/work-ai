export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp?: string;
}

// 客户端检查
const isClient = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

/**
 * 统一的 API 客户端
 * 自动添加 Authorization header
 */
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    // 只在客户端初始化 Token
    if (isClient) {
      try {
        this.token = localStorage.getItem('accessToken') || localStorage.getItem('token') || null;
      } catch (error) {
        console.error('[ApiClient] 初始化 Token 失败:', error);
      }
    }
  }

  setToken(token: string) {
    this.token = token;
    if (isClient) {
      try {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('token', token);
      } catch (error) {
        console.error('[ApiClient] 保存 Token 失败:', error);
      }
    }
  }

  getToken(): string | null {
    // 每次都重新从 localStorage 读取，确保获取最新的 token
    if (!isClient) {
      return this.token;
    }

    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        this.token = token;
      }
      return this.token;
    } catch (error) {
      console.error('[ApiClient] 获取 Token 失败:', error);
      return null;
    }
  }

  removeToken() {
    this.token = null;
    if (isClient) {
      try {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
      } catch (error) {
        console.error('[ApiClient] 清除 Token 失败:', error);
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    // 合并认证头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 只在客户端添加认证头
    if (isClient) {
      try {
        // 每次都重新获取最新的 token
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('[ApiClient] 获取认证头失败:', error);
      }
    }

    Object.assign(headers, options.headers);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // 处理特定的错误状态码
        if (response.status === 401) {
          // 未授权，清除本地存储并跳转到登录页
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            } catch (error) {
              console.error('[ApiClient] 清除本地存储失败:', error);
            }
          }
          return {
            success: false,
            error: '未授权访问，请重新登录',
            code: 'UNAUTHORIZED',
          };
        }

        if (response.status === 403) {
          return {
            success: false,
            error: '权限不足',
            code: 'FORBIDDEN',
          };
        }

        if (response.status === 429) {
          return {
            success: false,
            error: '请求过于频繁，请稍后再试',
            code: 'RATE_LIMIT_EXCEEDED',
          };
        }

        return {
          success: false,
          error: data.error || '请求失败',
          code: data.code || 'UNKNOWN_ERROR',
        };
      }

      return data;
    } catch (error: any) {
      console.error('[ApiClient] 请求失败:', error);
      return {
        success: false,
        error: error.message || '网络错误，请稍后重试',
        code: 'NETWORK_ERROR',
      };
    }
  }

  async get<T>(endpoint: string, options?: { params?: Record<string, any> }): Promise<ApiResponse<T>> {
    let url = endpoint;
    // 如果有 params 参数，构建查询字符串
    if (options?.params) {
      const queryParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += (endpoint.includes('?') ? '&' : '?') + queryString;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// 创建默认实例
export const apiClient = new ApiClient();
