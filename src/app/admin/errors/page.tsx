'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, XCircle, CheckCircle2, Info, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ErrorLog {
  id: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, any>;
}

interface UserInfo {
  userId: number;
  phone: string;
  role: string;
}

export default function AdminErrorsPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // 检查用户角色
  useEffect(() => {
    const checkUserPermission = async () => {
      try {
        const token = localStorage.getItem('token');
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
            router.push('/login?redirect=/admin/errors');
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

  // 获取错误列表
  const fetchErrors = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/admin/errors?limit=100', { headers });
      const data = await response.json();

      if (data.success) {
        setErrors(data.data.errors);
      } else {
        console.error('Failed to fetch errors:', data.error);
        if (response.status === 403) {
          setPermissionError('您没有管理员权限，无法访问此页面');
        }
      }
    } catch (error) {
      console.error('Error fetching errors:', error);
    } finally {
      setLoading(false);
    }
  };

  // 自动刷新错误列表
  useEffect(() => {
    if (!user && !permissionError) return; // 等待权限检查完成
    fetchErrors();
    // 每 30 秒自动刷新
    const interval = setInterval(fetchErrors, 30000);
    return () => clearInterval(interval);
  }, [user, permissionError]);

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

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6">
        {/* 头部 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              系统错误监控
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              实时查看和分析系统错误日志
            </p>
          </div>
          <Button
            onClick={fetchErrors}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* 统计信息 */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总错误数</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{errors.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">错误</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {errors.filter(e => e.level === 'error').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">警告</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {errors.filter(e => e.level === 'warn').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 错误列表 */}
        <Card>
          <CardHeader>
            <CardTitle>错误日志</CardTitle>
            <CardDescription>
              最近的系统错误和警告信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && errors.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : errors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  暂无错误
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  系统运行正常，没有检测到任何错误
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {errors.map((error) => (
                  <Alert
                    key={error.id}
                    variant={error.level === 'error' ? 'destructive' : 'default'}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedError(error)}
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant={getLevelColor(error.level) as any} className="mt-0.5">
                        <div className="flex items-center gap-1">
                          {getLevelIcon(error.level)}
                          {error.level.toUpperCase()}
                        </div>
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{error.message}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(error.timestamp)}
                          </span>
                        </div>
                        {error.context && Object.keys(error.context).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {Object.entries(error.context)
                              .slice(0, 2)
                              .map(([key, value]) => (
                                <span key={key} className="mr-2">
                                  <strong>{key}:</strong> {JSON.stringify(value)}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 错误详情弹窗 */}
        {selectedError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedError(null)}>
            <Card className="max-w-4xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant={getLevelColor(selectedError.level) as any} className="mb-2">
                      {getLevelIcon(selectedError.level)}
                      {selectedError.level.toUpperCase()}
                    </Badge>
                    <CardTitle className="text-xl">{selectedError.message}</CardTitle>
                    <CardDescription>
                      {formatTimestamp(selectedError.timestamp)}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedError(null)}>
                    <XCircle className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedError.stack && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-sm">堆栈跟踪</h4>
                    <pre className="bg-slate-950 text-slate-50 p-4 rounded text-xs overflow-x-auto">
                      {selectedError.stack}
                    </pre>
                  </div>
                )}
                {selectedError.context && Object.keys(selectedError.context).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">上下文信息</h4>
                    <pre className="bg-slate-950 text-slate-50 p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedError.context, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
