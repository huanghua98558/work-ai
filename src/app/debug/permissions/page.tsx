'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, AlertCircle, CheckCircle, User } from 'lucide-react';

export default function DebugPermissionsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: '未登录',
          description: '请先登录',
          variant: 'destructive',
        });
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      // 获取当前用户信息
      const response = await fetch('/api/users/me', { headers });
      const data = await response.json();

      console.log('当前用户信息:', data);
      setUserInfo(data.data || data);

      // 检查 token 内容
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token 内容:', tokenPayload);
        setUserInfo(prev => ({ ...prev, tokenPayload }));
      } catch (error) {
        console.error('解析 token 失败:', error);
      }
    } catch (error) {
      console.error('检查权限失败:', error);
      toast({
        title: '检查失败',
        description: '无法获取用户信息',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateToAdmin = async () => {
    if (!confirm('确定要将当前用户提升为管理员吗？')) {
      return;
    }

    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      // 更新用户为管理员
      const response = await fetch('/api/users/promote-admin', {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '成功',
          description: '已提升为管理员',
          variant: 'default',
        });

        // 重新登录以获取新的 token
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        toast({
          title: '失败',
          description: data.error || '提升管理员失败',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('提升管理员失败:', error);
      toast({
        title: '失败',
        description: '操作失败，请重试',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">加载中...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isAdmin = userInfo?.tokenPayload?.role === 'admin';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            权限检查工具
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            检查当前用户的权限状态
          </p>
        </div>

        {/* 权限状态卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              权限状态
            </CardTitle>
            <CardDescription>
              当前用户的权限信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isAdmin
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-yellow-100 dark:bg-yellow-900'
                }`}
              >
                {isAdmin ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {isAdmin ? '管理员权限' : '普通用户权限'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {isAdmin
                    ? '可以访问所有功能，包括激活码管理'
                    : '无法访问激活码管理等管理员功能'}
                </div>
              </div>
            </div>

            {isAdmin ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-800 dark:text-green-200 text-sm">
                  ✅ 您的管理员权限正常，可以访问所有功能
                </p>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg space-y-2">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  ⚠️ 您当前是普通用户，无法访问激活码管理等功能
                </p>
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  点击下方按钮将您的账户提升为管理员
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 用户信息卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              用户信息
            </CardTitle>
            <CardDescription>
              当前用户的详细信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">用户 ID</span>
                <span className="text-sm font-medium">{userInfo?.tokenPayload?.userId || userInfo?.id || '-'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">手机号</span>
                <span className="text-sm font-medium">{userInfo?.tokenPayload?.phone || userInfo?.phone || '-'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">角色</span>
                <span className="text-sm font-medium">{userInfo?.tokenPayload?.role || userInfo?.role || '-'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">昵称</span>
                <span className="text-sm font-medium">{userInfo?.nickname || '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        {!isAdmin && (
          <div className="flex gap-4">
            <Button
              onClick={updateToAdmin}
              disabled={updating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            >
              {updating ? '处理中...' : '提升为管理员'}
            </Button>
            <Button
              onClick={checkPermissions}
              variant="outline"
            >
              刷新
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
