import { useState, useEffect } from 'react';
import { verifyToken } from '@/lib/jwt';
import { getAuthHeaders as getAuthHeadersFromAuth } from './use-auth';

export interface UserRole {
  userId: number;
  phone: string;
  role: 'admin' | 'user';
}

export function useUserRole() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    console.log('[useUserRole] 开始获取用户角色:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 30) + '...',
    });

    if (!token) {
      console.log('[useUserRole] 未找到 token');
      setLoading(false);
      return;
    }

    const decoded = verifyToken(token);

    console.log('[useUserRole] Token 解析结果:', {
      hasDecoded: !!decoded,
      userId: decoded?.userId,
      phone: decoded?.phone,
      role: decoded?.role,
    });

    if (decoded) {
      setUserRole({
        userId: decoded.userId,
        phone: decoded.phone,
        role: decoded.role as 'admin' | 'user',
      });
      console.log('[useUserRole] 用户角色已设置:', decoded.role);
    } else {
      console.log('[useUserRole] Token 解析失败');
    }

    setLoading(false);
  }, []);

  const isAdmin = userRole?.role === 'admin';
  const isUser = userRole?.role === 'user';

  console.log('[useUserRole] 当前状态:', {
    userRole,
    isAdmin,
    isUser,
    loading,
  });

  return {
    userRole,
    isAdmin,
    isUser,
    loading,
  };
}

// 重新导出，保持向后兼容
export const getAuthHeaders = getAuthHeadersFromAuth;
