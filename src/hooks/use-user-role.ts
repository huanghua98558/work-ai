import { useState, useEffect } from 'react';
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
    const fetchUserRole = async () => {
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

      try {
        // 从 localStorage 读取用户角色（优先）
        const storedRole = localStorage.getItem('userRole');
        const storedUserId = localStorage.getItem('userId');
        const storedPhone = localStorage.getItem('userPhone');

        if (storedRole && storedUserId && storedPhone) {
          const role = {
            userId: parseInt(storedUserId),
            phone: storedPhone,
            role: storedRole as 'admin' | 'user',
          };
          setUserRole(role);
          console.log('[useUserRole] 从 localStorage 读取用户角色成功:', role);
          setLoading(false);
          return;
        }

        // 如果 localStorage 没有，则调用 API 验证
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.log('[useUserRole] API 调用失败:', response.status);
          setLoading(false);
          return;
        }

        const data = await response.json();

        setUserRole({
          userId: data.userId,
          phone: data.phone,
          role: data.role as 'admin' | 'user',
        });

        console.log('[useUserRole] 用户角色已设置:', data.role);
      } catch (error) {
        console.error('[useUserRole] 获取用户角色失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
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
