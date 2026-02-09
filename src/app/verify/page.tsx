'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, User, Key, AlertTriangle, CheckCircle, RefreshCw, LogOut, Settings } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface UserInfo {
  userId: number;
  phone: string;
  role: string;
}

interface TokenInfo {
  exp: number;
  iat: number;
  userId: number;
  phone: string;
  role: string;
  isExpired: boolean;
  isValid: boolean;
  expiryDate: string;
  issueDate: string;
}

export default function VerifyPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [apiCheckResult, setApiCheckResult] = useState<any>(null);
  const [adminCheckResult, setAdminCheckResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    setLoading(true);

    // 1. 获取用户信息
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setUserInfo(JSON.parse(userStr));
      }
    } catch (e) {
      console.error('读取用户信息失败:', e);
    }

    // 2. 获取 Token 信息
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const now = Math.floor(Date.now() / 1000);
          const isExpired = payload.exp < now;

          setTokenInfo({
            exp: payload.exp,
            iat: payload.iat,
            userId: payload.userId,
            phone: payload.phone,
            role: payload.role,
            isExpired,
            isValid: !isExpired,
            expiryDate: new Date(payload.exp * 1000).toLocaleString('zh-CN'),
            issueDate: new Date(payload.iat * 1000).toLocaleString('zh-CN'),
          });
        }
      }
    } catch (e) {
      console.error('读取 Token 信息失败:', e);
    }

    // 3. 检查 API 验证
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/users/me', { headers });
      const data = await response.json();

      setApiCheckResult({
        success: response.ok,
        status: response.status,
        data,
      });
    } catch (e: any) {
      setApiCheckResult({
        success: false,
        error: e.message,
      });
    }

    // 4. 检查管理员状态
    try {
      const response = await fetch('/api/admin/check-admin');
      const data = await response.json();

      setAdminCheckResult(data);
    } catch (e: any) {
      setAdminCheckResult({
        success: false,
        error: e.message,
      });
    }

    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const handleInitAdmin = () => {
    router.push('/init');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">正在检查用户状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">权限诊断工具</h1>
          <div className="flex gap-2">
            <button
              onClick={checkUserStatus}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              <RefreshCw className="h-4 w-4" />
              刷新状态
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </div>

        {/* Token 信息 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            Token 信息
          </h2>
          {tokenInfo ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Token 状态</span>
                <span className={`text-sm font-medium ${tokenInfo.isValid ? 'text-green-500' : 'text-red-500'}`}>
                  {tokenInfo.isValid ? '✓ 有效' : '✗ 无效'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">用户 ID</span>
                <span className="font-medium">{tokenInfo.userId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">手机号</span>
                <span className="font-medium">{tokenInfo.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">角色</span>
                <span className={`font-medium ${tokenInfo.role === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {tokenInfo.role === 'admin' ? '管理员' : '普通用户'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">签发时间</span>
                <span className="font-medium">{tokenInfo.issueDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">过期时间</span>
                <span className="font-medium">{tokenInfo.expiryDate}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              未找到 Token，请先登录
            </div>
          )}
        </div>

        {/* API 验证结果 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-green-500" />
            API 验证结果
          </h2>
          {apiCheckResult ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">API 状态</span>
                <span className={`text-sm font-medium ${apiCheckResult.success ? 'text-green-500' : 'text-red-500'}`}>
                  {apiCheckResult.success ? '✓ 成功' : '✗ 失败'}
                </span>
              </div>
              {apiCheckResult.status && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">HTTP 状态</span>
                  <span className="font-medium">{apiCheckResult.status}</span>
                </div>
              )}
              {apiCheckResult.data && apiCheckResult.data.data && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">用户 ID</span>
                    <span className="font-medium">{apiCheckResult.data.data.userId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">手机号</span>
                    <span className="font-medium">{apiCheckResult.data.data.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">角色</span>
                    <span className={`font-medium ${apiCheckResult.data.data.role === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {apiCheckResult.data.data.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  </div>
                </>
              )}
              {apiCheckResult.error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  错误: {apiCheckResult.error}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              等待 API 检查...
            </div>
          )}
        </div>

        {/* 系统管理员状态 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            系统管理员状态
          </h2>
          {adminCheckResult ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">是否有管理员</span>
                <span className={`text-sm font-medium ${adminCheckResult.hasAdmin ? 'text-green-500' : 'text-yellow-500'}`}>
                  {adminCheckResult.hasAdmin ? '✓ 是' : '✗ 否'}
                </span>
              </div>
              {adminCheckResult.admins && adminCheckResult.admins.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">管理员列表:</p>
                  <div className="space-y-2">
                    {adminCheckResult.admins.map((admin: any, index: number) => (
                      <div key={index} className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        {admin.phone} ({admin.nickname || '未设置'})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              等待检查...
            </div>
          )}
        </div>

        {/* 操作提示 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            操作提示
          </h2>
          <div className="space-y-3">
            {tokenInfo && tokenInfo.role === 'admin' && apiCheckResult?.success && (
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800 dark:text-green-200">
                  您是管理员，可以访问管理后台。
                  <button
                    onClick={() => router.push('/admin')}
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    前往管理后台
                  </button>
                </div>
              </div>
            )}

            {tokenInfo && tokenInfo.role !== 'admin' && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  您不是管理员，无法访问管理后台。
                  {adminCheckResult && !adminCheckResult.hasAdmin && (
                    <button
                      onClick={handleInitAdmin}
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      初始化管理员
                    </button>
                  )}
                </div>
              </div>
            )}

            {!tokenInfo && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  您尚未登录。
                  <button
                    onClick={() => router.push('/login')}
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    立即登录
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
              <RefreshCw className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-800 dark:text-gray-200">
                如果 Token 过期，请退出登录后重新登录。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
