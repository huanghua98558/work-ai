'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function VerifyPage() {
  const auth = useAuth();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  useEffect(() => {
    console.log('[VerifyPage] Auth 状态:', {
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      user: auth.user,
    });
  }, [auth]);

  const handleManualRefresh = async () => {
    setRefreshResult(null);
    const success = await auth.refreshAccessToken();
    setRefreshResult(success ? '刷新成功' : '刷新失败');
    setLastRefresh(new Date());
  };

  const checkTokenExpiry = () => {
    const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!accessToken) return null;

    try {
      const parts = accessToken.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - now;
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);

      return {
        exp: payload.exp,
        iat: payload.iat,
        now,
        timeUntilExpiry,
        minutesUntilExpiry,
        isExpired: timeUntilExpiry <= 0,
        isExpiringSoon: timeUntilExpiry <= 300, // 5 分钟内
      };
    } catch (error) {
      console.error('解析 Token 失败:', error);
      return null;
    }
  };

  const tokenInfo = checkTokenExpiry();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">权限管理系统验证页面</h1>

        {/* 认证状态 */}
        <Card>
          <CardHeader>
            <CardTitle>认证状态</CardTitle>
            <CardDescription>当前用户的登录和认证状态</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">是否已登录</p>
                <div className="flex items-center gap-2 mt-1">
                  {auth.isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : auth.isAuthenticated ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {auth.isLoading ? '加载中...' : auth.isAuthenticated ? '是' : '否'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">加载状态</p>
                <p className="font-medium mt-1">{auth.isLoading ? '加载中' : '已完成'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">用户 ID</p>
                <p className="font-medium mt-1">{auth.user?.userId || '未登录'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">手机号</p>
                <p className="font-medium mt-1">{auth.user?.phone || '未登录'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">角色</p>
                <Badge variant={auth.user?.role === 'admin' ? 'default' : 'secondary'} className="mt-1">
                  {auth.user?.role || '未登录'}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">错误信息</p>
                <p className="text-sm font-medium mt-1 text-red-500">{auth.error || '无'}</p>
              </div>
            </div>

            {tokenInfo && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <h4 className="font-medium mb-2">Token 信息</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>过期时间: {new Date(tokenInfo.exp * 1000).toLocaleString()}</div>
                  <div>签发时间: {new Date(tokenInfo.iat * 1000).toLocaleString()}</div>
                  <div>剩余时间: {Math.abs(tokenInfo.minutesUntilExpiry)} 分钟</div>
                  <div>是否过期: {tokenInfo.isExpired ? '是' : '否'}</div>
                  <div>即将过期: {tokenInfo.isExpiringSoon ? '是' : '否'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Token 刷新 */}
        <Card>
          <CardHeader>
            <CardTitle>Token 自动刷新</CardTitle>
            <CardDescription>手动测试 Token 刷新功能</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button onClick={handleManualRefresh} disabled={auth.isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${auth.isLoading ? 'animate-spin' : ''}`} />
                手动刷新 Token
              </Button>

              {refreshResult && (
                <Badge variant={refreshResult === '刷新成功' ? 'default' : 'destructive'}>
                  {refreshResult}
                </Badge>
              )}

              {lastRefresh && (
                <span className="text-sm text-muted-foreground">
                  上次刷新: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <p>• 系统每分钟自动检查 Token 是否即将过期</p>
              <p>• 如果 Token 在 5 分钟内过期，会自动刷新</p>
              <p>• 刷新失败会自动登出并跳转到登录页</p>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <Card>
          <CardHeader>
            <CardTitle>操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => window.location.href = '/dashboard'} className="w-full">
              前往 Dashboard
            </Button>
            <Button onClick={() => window.location.href = '/admin/errors'} variant="outline" className="w-full">
              前往管理员页面
            </Button>
            <Button onClick={auth.logout} variant="destructive" className="w-full">
              退出登录
            </Button>
          </CardContent>
        </Card>

        {/* 测试 API 调用 */}
        <Card>
          <CardHeader>
            <CardTitle>测试 API 调用</CardTitle>
            <CardDescription>测试认证是否正常工作</CardDescription>
          </CardHeader>
          <CardContent>
            <TestApiCall />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TestApiCall() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch('/api/users/me', {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json();
      setResult({
        success: response.ok,
        status: response.status,
        data,
      });
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={testApi} disabled={loading}>
        {loading ? '测试中...' : '测试 /api/users/me'}
      </Button>

      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
