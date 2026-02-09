'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function DebugLoginPage() {
  const [phone, setPhone] = useState('hh198752');
  const [password, setPassword] = useState('198752');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/user/login-by-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();
      setResult(data);

      if (!response.ok) {
        setError(data.error || '登录失败');
        return;
      }

      // 保存 token
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
      }

      // 检查用户信息
      const token = localStorage.getItem('token');
      const meResponse = await fetch('/api/users/me', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      const meData = await meResponse.json();
      setResult({
        login: data,
        userInfo: meData,
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAdmin = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/init/set-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();
      setResult(data);

      if (!response.ok) {
        setError(data.error || '设置管理员失败');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUser = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch(`/api/admin/check-user?phone=${phone}`);
      const data = await response.json();
      setResult(data);

      if (!response.ok) {
        setError(data.error || '检查失败');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckLocalStorage = () => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      let decoded = null;
      if (token) {
        // 简单解析 JWT token（不验证签名）
        const parts = token.split('.');
        if (parts.length === 3) {
          decoded = JSON.parse(atob(parts[1]));
        }
      }

      setResult({
        token: token ? `${token.substring(0, 50)}...` : null,
        user: user ? JSON.parse(user) : null,
        decodedToken: decoded,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>登录调试工具</CardTitle>
            <CardDescription>
              用于检查用户登录和权限信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">手机号</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">密码</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleLogin} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                登录测试
              </Button>
              <Button onClick={handleSetAdmin} disabled={loading} variant="outline">
                初始化为管理员
              </Button>
              <Button onClick={handleCheckUser} disabled={loading} variant="outline">
                检查用户信息
              </Button>
              <Button onClick={handleCheckLocalStorage} disabled={loading} variant="secondary">
                检查本地 Token
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>返回结果</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-950 text-slate-50 p-4 rounded text-xs overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
            <CardDescription>
              按以下步骤操作：
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal list-inside space-y-2">
              <li>点击"检查用户信息"查看数据库中该用户的角色</li>
              <li>如果 role 不是 'admin'，点击"初始化为管理员"</li>
              <li>点击"登录测试"测试登录流程</li>
              <li>点击"检查本地 Token"查看浏览器中存储的 token 和用户信息</li>
              <li>查看返回结果中的 decodedToken.role 字段，应该是 'admin'</li>
              <li>如果是 'admin'，访问 <a href="/admin/errors" className="text-blue-500 hover:underline">/admin/errors</a> 测试权限</li>
              <li>访问 <a href="/dashboard" className="text-blue-500 hover:underline">/dashboard</a> 查看侧边栏是否显示管理员菜单</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
