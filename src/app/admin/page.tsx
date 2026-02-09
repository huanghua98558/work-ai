'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Activity, Users, Database, Settings, ShieldAlert, RefreshCw } from 'lucide-react';

interface UserInfo {
  userId: number;
  phone: string;
  role: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // 检查用户角色
  useEffect(() => {
    const checkUserPermission = async () => {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/users/me', { headers });

        if (!response.ok) {
          if (response.status === 401) {
            // 未登录，跳转到登录页
            router.push('/login?redirect=/admin');
            return;
          }
          throw new Error('获取用户信息失败');
        }

        const data = await response.json();

        if (data.success && data.data) {
          const currentUser = data.data;

          // 检查是否是管理员
          if (currentUser.role !== 'admin') {
            setPermissionError('您没有管理员权限，无法访问此页面');
            setTimeout(() => {
              router.push('/');
            }, 3000);
            return;
          }

          setUser(currentUser);
        }
      } catch (error) {
        console.error('检查用户权限失败:', error);
        setPermissionError('无法验证您的权限');
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    };

    checkUserPermission();
  }, [router]);

  // 显示权限错误
  if (permissionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-center text-2xl">权限不足</CardTitle>
              <CardDescription className="text-center">
                {permissionError}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground mb-4">
                即将跳转到首页...
              </p>
              <div className="flex justify-center">
                <Button onClick={() => router.push('/')} variant="outline">
                  立即跳转
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 等待权限检查
  if (!user && !permissionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">正在验证权限...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            管理后台
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            WorkBot 系统管理和监控中心
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            管理员: {user?.phone || '未知'}
          </p>
        </div>

        {/* 快速导航 */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/errors">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  错误监控
                </CardTitle>
                <CardDescription>
                  查看和分析系统错误日志
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  查看错误
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/activation-codes">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  激活码管理
                </CardTitle>
                <CardDescription>
                  管理和生成激活码
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  管理激活码
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/robots">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  机器人管理
                </CardTitle>
                <CardDescription>
                  配置和管理机器人
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  管理机器人
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/users">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  用户管理
                </CardTitle>
                <CardDescription>
                  查看和管理用户账户
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  管理用户
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-slate-500" />
                  系统设置
                </CardTitle>
                <CardDescription>
                  配置系统参数和选项
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  配置设置
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/api/admin/set-admin">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-orange-500" />
                  设置管理员
                </CardTitle>
                <CardDescription>
                  为用户设置管理员权限
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  设置管理员
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 系统状态 */}
        <Card>
          <CardHeader>
            <CardTitle>系统状态</CardTitle>
            <CardDescription>
              当前系统运行状态和健康检查
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">API 服务</span>
                <span className="text-sm text-green-500 font-medium">正常运行</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">数据库连接</span>
                <span className="text-sm text-green-500 font-medium">已连接</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">WebSocket 服务</span>
                <span className="text-sm text-yellow-500 font-medium">开发模式不可用</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
