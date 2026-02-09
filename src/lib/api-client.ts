import { getAuthHeaders } from '@/hooks/use-user-role';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp?: string;
}

/**
 * 统一的 API 客户端
 * 自动添加 Authorization header
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    // 合并认证头
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    };

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
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
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

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
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
