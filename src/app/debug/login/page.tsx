'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, Activity } from 'lucide-react';
import Link from 'next/link';

export default function LoginDebugPage() {
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('测试登录:', { phone, password });

      const response = await fetch('/api/user/login-by-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      console.log('登录响应:', data);

      setResult(data);

      if (data.success) {
        toast({
          title: '登录成功',
          description: '账号密码正确',
          variant: 'success',
        });

        // 自动保存 token
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      } else {
        toast({
          title: '登录失败',
          description: data.error || '账号或密码错误',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('登录错误:', error);
      setResult({ success: false, error: '网络错误' });
      toast({
        title: '网络错误',
        description: '请检查网络连接',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (phone: string, password: string) => {
    setPhone(phone);
    setPassword(password);
  };

  const quickTest = async (phone: string, password: string) => {
    setPhone(phone);
    setPassword(password);
    await testLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            调试工具中心
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            用于测试和排查系统问题
          </p>
        </div>

        {/* 部署检查卡片 */}
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              部署检查
            </CardTitle>
            <CardDescription>
              检查部署环境和调试页面是否正常
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/api/debug/check-deploy" target="_blank">
              <Button className="w-full" variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                检查部署状态（在新窗口打开）
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 系统健康检查卡片 */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              系统健康检查
            </CardTitle>
            <CardDescription>
              检查数据库连接、管理员账号和登录功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/debug/health">
              <Button className="w-full" variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                打开系统健康检查
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 快速测试卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>快速测试</CardTitle>
            <CardDescription>
              点击下方按钮快速测试常用账号
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => quickFill('hh198752', 'hh198752')}
                variant="outline"
              >
                填充: hh198752
              </Button>
              <Button
                onClick={() => quickFill('admin', 'admin123')}
                variant="outline"
              >
                填充: admin
              </Button>
              <Button
                onClick={() => quickFill('admin', 'admin')}
                variant="outline"
              >
                填充: admin/admin
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => quickTest('hh198752', 'hh198752')}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                测试 hh198752
              </Button>
              <Button
                onClick={() => quickTest('admin', 'admin123')}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                测试 admin
              </Button>
              <Button
                onClick={() => quickTest('admin', 'admin')}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                测试 admin/admin
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 手动测试卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>手动测试</CardTitle>
            <CardDescription>
              输入账号和密码进行测试
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">账号（手机号）</Label>
              <Input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
              />
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
              />
            </div>

            <Button
              onClick={testLogin}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              测试登录
            </Button>
          </CardContent>
        </Card>

        {/* 结果显示卡片 */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                测试结果
              </CardTitle>
              <CardDescription>
                {result.success ? '登录成功' : '登录失败'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* LocalStorage 检查 */}
        <Card>
          <CardHeader>
            <CardTitle>LocalStorage 检查</CardTitle>
            <CardDescription>
              查看浏览器中存储的信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Token</span>
              <span className="text-sm font-medium">
                {localStorage.getItem('token') ? '已保存' : '未保存'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">用户信息</span>
              <span className="text-sm font-medium">
                {localStorage.getItem('user') ? '已保存' : '未保存'}
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  const user = localStorage.getItem('user');
                  if (user) {
                    alert(JSON.stringify(JSON.parse(user), null, 2));
                  } else {
                    alert('没有用户信息');
                  }
                }}
                variant="outline"
                size="sm"
              >
                查看用户信息
              </Button>
              <Button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  setResult(null);
                  toast({
                    title: '已清除',
                    description: 'LocalStorage 已清空',
                  });
                }}
                variant="destructive"
                size="sm"
              >
                清除 LocalStorage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
