'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Loader2, Database, User, Key } from 'lucide-react';

interface DatabaseStatus {
  status: string;
  latency: string;
  connectedAt: string | null;
}

interface AdminUser {
  id: number;
  username: string;
  nickname: string;
  phone: string;
  role: string;
  status: string;
  hasPassword: boolean;
  createdAt: string;
}

interface LoginTestResult {
  account: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export default function SystemHealthCheckPage() {
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loginTestResults, setLoginTestResults] = useState<LoginTestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 获取系统健康状态
  const fetchSystemHealth = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. 检查数据库连接
      const healthRes = await fetch('/api/health');
      if (!healthRes.ok) throw new Error('健康检查失败');
      const healthData = await healthRes.json();
      setDbStatus({
        status: healthData.database?.status || 'unknown',
        latency: healthData.database?.latency || 'unknown',
        connectedAt: new Date().toISOString(),
      });

      // 2. 获取管理员账号列表
      const usersRes = await fetch('/api/users/admins');
      if (!usersRes.ok) throw new Error('获取管理员账号失败');
      const usersData = await usersRes.json();
      setAdminUsers(usersData.admins || []);

      // 3. 测试所有管理员账号的登录
      const loginTests: LoginTestResult[] = [];
      for (const user of usersData.admins) {
        try {
          // 优先使用 username，如果没有则使用 phone
          const account = user.username || user.phone;
          const password = account === 'hh198752' ? 'hh198752' : 'admin123';

          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: account, password }),
          });
          const loginData = await loginRes.json();

          loginTests.push({
            account,
            success: loginData.success,
            message: loginData.success ? '登录成功' : loginData.error || '未知错误',
            data: loginData.success ? loginData : undefined,
            error: !loginData.success ? loginData.error : undefined,
          });
        } catch (e: any) {
          loginTests.push({
            account: user.username || user.phone,
            success: false,
            message: '网络错误',
            error: e.message,
          });
        }
      }
      setLoginTestResults(loginTests);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                正在检查系统状态...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            系统健康检查
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            检查数据库连接、管理员账号和登录功能
          </p>
        </div>

        {/* 刷新按钮 */}
        <div className="flex justify-center">
          <Button onClick={fetchSystemHealth} disabled={loading}>
            <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : 'hidden'}`} />
            重新检查
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900 dark:text-red-200">
                    检查失败
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 数据库状态 */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-blue-600" />
              <CardTitle>数据库连接状态</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  状态
                </p>
                <Badge
                  variant={dbStatus?.status === 'connected' ? 'default' : 'destructive'}
                  className="text-sm"
                >
                  {dbStatus?.status === 'connected' ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      已连接
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 mr-1" />
                      未连接
                    </>
                  )}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  延迟
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dbStatus?.latency || '未知'}
                </p>
              </div>
            </div>
            {dbStatus?.connectedAt && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  连接时间
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatTime(dbStatus.connectedAt)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 管理员账号列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-purple-600" />
              <CardTitle>管理员账号列表</CardTitle>
            </div>
            <CardDescription>
              数据库中所有角色为 admin 的账号
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adminUsers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                未找到管理员账号
              </p>
            ) : (
              <div className="space-y-3">
                {adminUsers.map((user) => (
                  <div
                    key={user.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-semibold">
                            {user.username || user.phone}
                          </span>
                          <Badge variant="outline">
                            ID: {user.id}
                          </Badge>
                          <Badge
                            variant={user.status === 'active' ? 'default' : 'secondary'}
                          >
                            {user.status === 'active' ? '活跃' : '未激活'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            <span className="font-medium">昵称：</span>
                            {user.nickname || '未设置'}
                          </div>
                          <div>
                            <span className="font-medium">角色：</span>
                            {user.role}
                          </div>
                          <div>
                            <span className="font-medium">手机号：</span>
                            {user.phone || '未设置'}
                          </div>
                          <div>
                            <span className="font-medium">密码：</span>
                            {user.hasPassword ? (
                              <Badge variant="outline" className="ml-1">
                                <Key className="w-3 h-3 mr-1" />
                                已设置
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="ml-1">
                                未设置
                              </Badge>
                            )}
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">创建时间：</span>
                            {formatTime(user.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 登录测试结果 */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-green-600" />
              <CardTitle>登录功能测试</CardTitle>
            </div>
            <CardDescription>
              测试所有管理员账号的登录功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginTestResults.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                暂无测试结果
              </p>
            ) : (
              <div className="space-y-3">
                {loginTestResults.map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      result.success
                        ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                        : 'border-red-200 bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-semibold">
                            {result.account}
                          </span>
                          <Badge
                            variant={result.success ? 'default' : 'destructive'}
                          >
                            {result.success ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                成功
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                失败
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">消息：</p>
                          <p className="text-gray-600 dark:text-gray-400">
                            {result.message}
                          </p>
                        </div>
                        {result.error && (
                          <div className="text-sm">
                            <p className="font-medium text-red-600">错误：</p>
                            <p className="text-red-600">
                              {result.error}
                            </p>
                          </div>
                        )}
                        {result.data && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                              查看响应数据
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-xs">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 总结 */}
        <Card>
          <CardHeader>
            <CardTitle>检查总结</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-gray-900 dark:text-white">
                数据库状态：<strong>{dbStatus?.status === 'connected' ? '正常' : '异常'}</strong>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-purple-600" />
              <p className="text-gray-900 dark:text-white">
                管理员账号：<strong>{adminUsers.length} 个</strong>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-blue-600" />
              <p className="text-gray-900 dark:text-white">
                登录测试：<strong>{loginTestResults.filter(r => r.success).length}/{loginTestResults.length}</strong> 成功
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
