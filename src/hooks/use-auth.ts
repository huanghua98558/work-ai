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
    isLoading: true,
    error: null,
  });

  const [refreshPromise, setRefreshPromise] = Promise.resolve();

  // 解析 Token 并获取过期时间
  const getTokenExpiry = useCallback((token: string): number | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload.exp ? payload.exp * 1000 : null; // 转换为毫秒
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
      localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));

      console.log('[UseAuth] Token 刷新成功');

      // 更新状态
      const decoded = verifyToken(data.data.accessToken);
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
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);

      // 跳转到登录页
      router.push('/login');

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
    const initAuth = async () => {
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
    };

    initAuth();
  }, [refreshAccessToken, isTokenExpired]);

  // 定期检查 Token 是否即将过期并自动刷新
  useEffect(() => {
    if (!state.isAuthenticated || state.isLoading) return;

    const checkInterval = setInterval(async () => {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!accessToken) return;

      if (isTokenExpiringSoon(accessToken)) {
        console.log('[UseAuth] Token 即将过期，自动刷新');
        await refreshAccessToken();
      }
    }, 60 * 1000); // 每分钟检查一次

    return () => clearInterval(checkInterval);
  }, [state.isAuthenticated, state.isLoading, isTokenExpiringSoon, refreshAccessToken]);

  // 登出
  const logout = useCallback(() => {
    console.log('[UseAuth] 用户登出');

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

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
  const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (accessToken) {
    return {
      'Authorization': `Bearer ${accessToken}`,
    };
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
}

// 辅助函数：清除认证信息
export function clearAuthData() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
