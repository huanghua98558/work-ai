import { useState, useEffect } from 'react';
import { verifyToken } from '@/lib/jwt';

export interface UserRole {
  userId: number;
  phone: string;
  role: 'admin' | 'user';
}

export function useUserRole() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
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

// 用于在 fetch 请求中添加 token 的辅助函数
export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
