import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { verifyToken, JWTPayload } from '@/lib/jwt';

export interface AuthState {
  user: JWTPayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

/**
 * 认证 Hook
 * 提供 Token 自动刷新功能
 */
export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: typeof window === 'undefined' ? false : true, // 服务端不加载
    error: null,
  });

  const [refreshPromise, setRefreshPromise] = Promise.resolve();

  // 解析 Token 并获取过期时间
  const getTokenExpiry = useCallback((token: string): number | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      // 检查 payload 是否为有效对象
      if (!payload || typeof payload !== 'object') return null;

      // 检查 exp 是否存在
      if (typeof payload.exp !== 'number') return null;

      return payload.exp * 1000; // 转换为毫秒
    } catch (error) {
      console.error('[UseAuth] 解析 Token 失败:', error);
      return null;
    }
  }, []);

  // 检查 Token 是否即将过期（5分钟内）
  const isTokenExpiringSoon = useCallback((token: string): boolean => {
    const expiry = getTokenExpiry(token);
    if (!expiry) return false;

    const now = Date.now();
    const timeUntilExpiry = expiry - now;
    const fiveMinutes = 5 * 60 * 1000;

    return timeUntilExpiry < fiveMinutes && timeUntilExpiry > 0;
  }, [getTokenExpiry]);

  // 检查 Token 是否已过期
  const isTokenExpired = useCallback((token: string): boolean => {
    const expiry = getTokenExpiry(token);
    if (!expiry) return false;

    return Date.now() > expiry;
  }, [getTokenExpiry]);

  // 刷新 Token
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    // 只在客户端执行
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      console.log('[UseAuth] 没有 Refresh Token，无法刷新');
      return false;
    }

    try {
      console.log('[UseAuth] 开始刷新 Access Token');

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[UseAuth] 刷新 Token 失败:', data);
        throw new Error(data.error || '刷新 Token 失败');
      }

      // 保存新的 Token
      const responseData = data.data;
      if (!responseData || typeof responseData !== 'object') {
        throw new Error('刷新响应数据格式错误');
      }

      const accessToken = responseData.accessToken;
      const newRefreshToken = responseData.refreshToken;
      const user = responseData.user;

      if (!accessToken || !newRefreshToken || !user) {
        throw new Error('刷新响应数据格式错误');
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      console.log('[UseAuth] Token 刷新成功');

      // 更新状态
      const decoded = verifyToken(accessToken);
      setState({
        user: decoded,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error: any) {
      console.error('[UseAuth] 刷新 Token 异常:', error);

      // 清除本地存储
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        } catch (e) {
          console.error('[UseAuth] 清除本地存储失败:', e);
        }
      }

      // 跳转到登录页
      if (typeof window !== 'undefined') {
        router.push('/login');
      }

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message || '认证失败',
      });

      return false;
    }
  }, [router]);

  // 初始化认证状态
  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    const initAuth = async () => {
      try {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!accessToken) {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      // 检查 Access Token 是否过期
      if (isTokenExpired(accessToken)) {
        console.log('[UseAuth] Access Token 已过期，尝试刷新');

        // 使用 Refresh Token 刷新
        const success = await refreshAccessToken();
        if (!success) {
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Token 已过期',
          });
        }
        return;
      }

      // 验证 Access Token
      const decoded = verifyToken(accessToken);
      if (!decoded) {
        console.log('[UseAuth] Access Token 无效，尝试刷新');

        const success = await refreshAccessToken();
        if (!success) {
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Token 无效',
          });
        }
        return;
      }

      setState({
        user: decoded,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[UseAuth] 初始化认证状态失败:', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : '认证初始化失败',
      });
    }
    };

    initAuth();
  }, [refreshAccessToken, isTokenExpired]);

  // 定期检查 Token 是否即将过期并自动刷新
  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    if (!state.isAuthenticated || state.isLoading) return;

    const checkInterval = setInterval(async () => {
      try {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!accessToken) return;

        if (isTokenExpiringSoon(accessToken)) {
          console.log('[UseAuth] Token 即将过期，自动刷新');
          await refreshAccessToken();
        }
      } catch (error) {
        console.error('[UseAuth] 定期检查 Token 失败:', error);
      }
    }, 60 * 1000); // 每分钟检查一次

    return () => clearInterval(checkInterval);
  }, [state.isAuthenticated, state.isLoading, isTokenExpiringSoon, refreshAccessToken]);

  // 登出
  const logout = useCallback(() => {
    console.log('[UseAuth] 用户登出');

    // 只在客户端执行
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch (error) {
        console.error('[UseAuth] 清除本地存储失败:', error);
      }
    }

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    router.push('/login');
  }, [router]);

  // 手动刷新 Token
  const manualRefresh = useCallback(async (): Promise<boolean> => {
    return refreshAccessToken();
  }, [refreshAccessToken]);

  return {
    ...state,
    logout,
    refreshAccessToken: manualRefresh,
    isTokenExpiringSoon,
    isTokenExpired,
  };
}

// 辅助函数：获取认证头
export function getAuthHeaders(): HeadersInit {
  // 只在客户端执行
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {};
  }

  try {
    const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (accessToken) {
      return {
        'Authorization': `Bearer ${accessToken}`,
      };
    }
  } catch (error) {
    console.error('[getAuthHeaders] 获取 Access Token 失败:', error);
  }

  return {};
}

// 辅助函数：保存登录信息
export function saveAuthData(data: {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  user: any;
}) {
  // 只在客户端执行
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  try {
    const accessToken = data.accessToken || data.token;

    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('token', accessToken); // 兼容旧代码
    }

    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  } catch (error) {
    console.error('[saveAuthData] 保存认证信息失败:', error);
  }
}

// 辅助函数：清除认证信息
export function clearAuthData() {
  // 只在客户端执行
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch (error) {
    console.error('[clearAuthData] 清除认证信息失败:', error);
  }
}
