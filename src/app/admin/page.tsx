'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShieldAlert,
  RefreshCw,
  Bot,
  Users,
  MessageSquare,
  Database,
  Activity,
  Key,
  FileText,
  Wifi,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserInfo {
  userId: number;
  phone: string;
  role: string;
}

interface StatCard {
  title: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: any;
  gradient: string;
  href: string;
}

const statCards: StatCard[] = [
  {
    title: '机器人总数',
    value: '12',
    change: '+2',
    changeType: 'increase',
    icon: Bot,
    gradient: 'from-blue-500 to-indigo-600',
    href: '/robots',
  },
  {
    title: '用户总数',
    value: '156',
    change: '+18',
    changeType: 'increase',
    icon: Users,
    gradient: 'from-purple-500 to-violet-600',
    href: '/users',
  },
  {
    title: '消息总数',
    value: '2,456',
    change: '+324',
    changeType: 'increase',
    icon: MessageSquare,
    gradient: 'from-cyan-500 to-blue-600',
    href: '/messages',
  },
  {
    title: '知识库条目',
    value: '89',
    change: '+12',
    changeType: 'increase',
    icon: Database,
    gradient: 'from-pink-500 to-rose-600',
    href: '/knowledge',
  },
];

const quickActions = [
  { name: '创建机器人', href: '/robots/create', icon: Bot, gradient: 'from-blue-500 to-indigo-600', description: '添加新的企业微信机器人' },
  { name: '生成激活码', href: '/activation-codes', icon: Key, gradient: 'from-green-500 to-emerald-600', description: '批量生成用户激活码' },
  { name: '查看日志', href: '/logs', icon: FileText, gradient: 'from-indigo-500 to-blue-600', description: '查看系统运行日志' },
  { name: '系统监控', href: '/monitor', icon: Activity, gradient: 'from-rose-500 to-red-600', description: '实时监控系统状态' },
];

const recentActivity = [
  { id: 1, title: '新机器人上线', description: '客服机器人 #12 已成功上线', time: '5 分钟前', type: 'success' },
  { id: 2, title: '用户注册', description: '用户 user_001 完成注册', time: '12 分钟前', type: 'info' },
  { id: 3, title: '消息高峰', description: '系统检测到消息流量激增', time: '25 分钟前', type: 'warning' },
  { id: 4, title: '激活码使用', description: '激活码 ABC123 已被使用', time: '1 小时前', type: 'success' },
  { id: 5, title: '系统更新', description: '知识库已更新至 v2.3', time: '2 小时前', type: 'info' },
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

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
            router.push('/login?redirect=/admin');
            return;
          }
          throw new Error('获取用户信息失败');
        }

        const data = await response.json();

        if (data.success && data.data) {
          const currentUser = data.data;
          setUser(currentUser);
        }
      } catch (error) {
        console.error('检查用户权限失败:', error);
        setPermissionError('无法验证您的权限');
        setTimeout(() => {
          router.push('/login?redirect=/admin');
        }, 3000);
      }
    };

    checkUserPermission();
  }, [router]);

  if (permissionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-center text-2xl">需要登录</CardTitle>
              <CardDescription className="text-center">
                {permissionError}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Button onClick={() => router.push('/login')} variant="outline">
                  前往登录
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user && !permissionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              欢迎回来，{user?.nickname || user?.phone || '管理员'}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              WorkBot 管理后台 - 全方位系统管理中心
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/help">
                <HelpCircle className="h-4 w-4 mr-2" />
                帮助文档
              </Link>
            </Button>
            <Button asChild>
              <Link href="/robots/create">
                <Zap className="h-4 w-4 mr-2" />
                快速创建
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.title} href={stat.href}>
                <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br',
                        stat.gradient
                      )}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        stat.changeType === 'increase'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {stat.change}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {stat.value}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {stat.title}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">快速操作</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.name} href={action.href}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer group">
                    <CardHeader>
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br',
                        action.gradient
                      )}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-sm font-medium">
                        {action.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {action.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" size="sm" className="w-full group-hover:bg-slate-100 dark:group-hover:bg-slate-800">
                        立即访问
                        <ArrowRight className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity & System Status */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                最近活动
              </CardTitle>
              <CardDescription>
                系统最新动态和事件
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  let Icon;
                  let iconColor;

                  switch (activity.type) {
                    case 'success':
                      Icon = CheckCircle;
                      iconColor = 'text-green-600 dark:text-green-400';
                      break;
                    case 'warning':
                      Icon = AlertCircle;
                      iconColor = 'text-amber-600 dark:text-amber-400';
                      break;
                    default:
                      Icon = Activity;
                      iconColor = 'text-blue-600 dark:text-blue-400';
                  }

                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <Icon className={cn('h-5 w-5 mt-0.5', iconColor)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {activity.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {activity.description}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-500 whitespace-nowrap">
                        {activity.time}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/logs">
                    查看全部日志
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                系统状态
              </CardTitle>
              <CardDescription>
                当前系统运行概况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-slate-900 dark:text-white">API 服务</span>
                  </div>
                  <span className="text-sm text-green-600 dark:text-green-400">运行中</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-slate-900 dark:text-white">数据库</span>
                  </div>
                  <span className="text-sm text-green-600 dark:text-green-400">运行中</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-slate-900 dark:text-white">WebSocket</span>
                  </div>
                  <span className="text-sm text-green-600 dark:text-green-400">运行中</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-sm text-slate-900 dark:text-white">缓存服务</span>
                  </div>
                  <span className="text-sm text-amber-600 dark:text-amber-400">高负载</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/monitor">
                    查看详细监控
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Access Info */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  完整功能访问权限
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  作为管理员，您可以访问系统的所有功能模块，包括机器人管理、用户管理、消息中心、知识库、系统监控等。
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  切换到用户视图
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
