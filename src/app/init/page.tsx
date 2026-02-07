// 强制动态渲染，避免构建时执行
'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';

export default function InitPage() {
  const [hasAdmin, setHasAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    phone: 'admin',
    password: 'admin123',
    nickname: '超级管理员',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 检查是否已有管理员
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const res = await fetch('/api/init/admin');
      const data = await res.json();
      if (data.success) {
        setHasAdmin(data.data.hasAdmin);
      }
    } catch (error) {
      console.error('检查管理员状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      setIsCreating(true);
      setMessage(null);

      const res = await fetch('/api/init/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: '管理员账户创建成功！现在可以使用该账户登录。' });
        setHasAdmin(true);
      } else {
        setMessage({ type: 'error', text: `创建失败：${data.error}` });
      }
    } catch (error) {
      console.error('创建管理员失败:', error);
      setMessage({ type: 'error', text: '创建失败，请稍后重试' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">正在检查系统状态...</p>
        </div>
      </div>
    );
  }

  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">系统已初始化</CardTitle>
            <CardDescription>
              系统已经配置了管理员账户，可以直接登录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLogin}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">初始化管理员账户</CardTitle>
          <CardDescription>
            首次使用需要创建管理员账户
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">登录账号（手机号）</Label>
            <Input
              id="phone"
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="请输入登录账号"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">登录密码</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="请输入登录密码"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">管理员昵称</Label>
            <Input
              id="nickname"
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="请输入管理员昵称"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>提示：</strong>默认账号为 <code>admin</code>，密码为 <code>admin123</code>。
              您可以修改为您自己的账号和密码。请妥善保管管理员账号信息。
            </p>
          </div>

          <Button
            onClick={handleCreateAdmin}
            disabled={isCreating}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? '创建中...' : '创建管理员账户'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
