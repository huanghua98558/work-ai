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
    if (!token) {
      setLoading(false);
      return;
    }

    const decoded = verifyToken(token);
    if (decoded) {
      setUserRole({
        userId: decoded.userId,
        phone: decoded.phone,
        role: decoded.role as 'admin' | 'user',
      });
    }
    setLoading(false);
  }, []);

  const isAdmin = userRole?.role === 'admin';
  const isUser = userRole?.role === 'user';

  return {
    userRole,
    isAdmin,
    isUser,
    loading,
  };
}

// 重新导出，保持向后兼容
export const getAuthHeaders = getAuthHeadersFromAuth;
