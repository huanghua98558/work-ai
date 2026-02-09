'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, CheckCircle, UserPlus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function InitAdminPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasExistingAdmin, setHasExistingAdmin] = useState<boolean | null>(null);

  const checkExistingAdmin = async () => {
    try {
      const response = await fetch('/api/admin/check-admin');
      const data = await response.json();
      if (data.success) {
        setHasExistingAdmin(data.hasAdmin);
        if (data.hasAdmin) {
          setError('系统中已有管理员。如果您需要添加新的管理员，请联系现有管理员或使用 /api/admin/set-admin 接口。');
        }
      }
    } catch (err) {
      console.error('检查管理员失败:', err);
    }
  };

  useState(() => {
    checkExistingAdmin();
  });

  const handleInitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone || !password) {
      setError('请填写完整信息');
      return;
    }

    if (phone.length !== 11) {
      setError('请输入有效的手机号（11位）');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/init/set-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // 3秒后跳转到登录页
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || '初始化管理员失败');
      }
    } catch (err: any) {
      setError(err.message || '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900 dark:to-emerald-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center text-2xl">管理员初始化成功</CardTitle>
            <CardDescription className="text-center">
              您可以登录了！3秒后跳转到登录页...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-500" />
          </div>
          <CardTitle className="text-center text-2xl">初始化管理员</CardTitle>
          <CardDescription className="text-center">
            为系统设置第一个管理员账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInitAdmin} className="space-y-6">
            {hasExistingAdmin === true && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  系统中已有管理员，无法初始化新管理员。请联系现有管理员或使用管理员设置接口。
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div>
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入11位手机号"
                maxLength={11}
                required
                disabled={hasExistingAdmin === true}
              />
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码（至少6位）"
                minLength={6}
                required
                disabled={hasExistingAdmin === true}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || hasExistingAdmin === true}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? '初始化中...' : '初始化管理员'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            <button
              onClick={() => router.push('/')}
              className="hover:underline"
            >
              返回首页
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
