'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Key, RefreshCw, LogOut, CheckCircle, AlertCircle, Copy } from 'lucide-react';

export default function DebugTokenPage() {
  const { toast } = useToast();
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeToken();
  }, []);

  const analyzeToken = () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setTokenInfo({ exists: false });
        setValid(false);
        return;
      }

      // 解析 Token
      const parts = token.split('.');
      if (parts.length !== 3) {
        setTokenInfo({ exists: true, valid: false, error: 'Token 格式不正确' });
        setValid(false);
        return;
      }

      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      const signature = parts[2];

      setTokenInfo({
        exists: true,
        valid: true,
        header,
        payload,
        signature: signature.substring(0, 20) + '...',
      });

      setValid(true);
    } catch (error) {
      console.error('解析 Token 失败:', error);
      setTokenInfo({ exists: true, valid: false, error: error.message });
      setValid(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  const copyToken = () => {
    const token = localStorage.getItem('token');
    if (token) {
      navigator.clipboard.writeText(token);
      toast({
        title: '复制成功',
        description: 'Token 已复制到剪贴板',
        variant: 'success',
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">分析中...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Token 调试工具
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            查看和分析当前登录的 Token 信息
          </p>
        </div>

        {/* Token 状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Token 状态
            </CardTitle>
            <CardDescription>
              当前 Token 的有效性状态
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  tokenInfo?.exists && tokenInfo?.valid
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-red-100 dark:bg-red-900'
                }`}
              >
                {tokenInfo?.exists && tokenInfo?.valid ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {tokenInfo?.exists && tokenInfo?.valid ? 'Token 有效' : 'Token 无效'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {tokenInfo?.exists ? (tokenInfo?.valid ? '可以正常使用' : '请重新登录') : '未登录'}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={analyzeToken}
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button
                onClick={copyToken}
                variant="outline"
                disabled={!tokenInfo?.exists}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制 Token
              </Button>
              <Button
                onClick={logout}
                variant="destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Token 载荷 */}
        {tokenInfo?.valid && tokenInfo?.payload && (
          <Card>
            <CardHeader>
              <CardTitle>Token 载荷（Payload）</CardTitle>
              <CardDescription>
                Token 中包含的用户信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">用户 ID</span>
                  <span className="text-sm font-medium">{tokenInfo.payload.userId}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">手机号</span>
                  <span className="text-sm font-medium">{tokenInfo.payload.phone}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">角色</span>
                  <Badge
                    variant={tokenInfo.payload.role === 'admin' ? 'default' : 'secondary'}
                    className={
                      tokenInfo.payload.role === 'admin'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
                    }
                  >
                    {tokenInfo.payload.role === 'admin' ? '管理员' : '普通用户'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">签发时间</span>
                  <span className="text-sm font-medium">
                    {new Date(tokenInfo.payload.iat * 1000).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg md:col-span-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">过期时间</span>
                  <span className="text-sm font-medium">
                    {new Date(tokenInfo.payload.exp * 1000).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>

              {tokenInfo.payload.role === 'admin' ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    ✅ 您的角色是管理员，可以访问激活码管理等功能
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg space-y-2">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    ⚠️ 您的角色是普通用户，无法访问激活码管理等功能
                  </p>
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    请退出登录后，使用管理员账号重新登录
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Token 头部 */}
        {tokenInfo?.valid && tokenInfo?.header && (
          <Card>
            <CardHeader>
              <CardTitle>Token 头部（Header）</CardTitle>
              <CardDescription>
                Token 的编码算法和类型
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(tokenInfo.header, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* 完整 Token */}
        {tokenInfo?.exists && (
          <Card>
            <CardHeader>
              <CardTitle>完整 Token</CardTitle>
              <CardDescription>
                当前使用的完整 Token 字符串
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs overflow-x-auto break-all">
                {localStorage.getItem('token')}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
