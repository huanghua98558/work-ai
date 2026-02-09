'use client';

import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

export default function VerifyPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    // 获取用户信息
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setUserInfo(JSON.parse(userStr));
      }
    } catch (e) {
      console.error('读取用户信息失败:', e);
    }

    // 获取 Token 信息
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          setTokenInfo({
            exp: payload.exp,
            iat: payload.iat,
            userId: payload.userId,
            role: payload.role,
            isExpired: payload.exp * 1000 < Date.now(),
          });
        }
      }
    } catch (e) {
      console.error('读取 Token 信息失败:', e);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">权限管理系统验证页面</h1>

        {/* 认证状态 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">认证状态</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">用户 ID</p>
              <p className="font-medium mt-1">{userInfo?.userId || '未登录'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">手机号</p>
              <p className="font-medium mt-1">{userInfo?.phone || '未登录'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">角色</p>
              <p className="font-medium mt-1">{userInfo?.role || '未登录'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Token 状态</p>
              <p className="font-medium mt-1">
                {tokenInfo?.isExpired ? '已过期' : '有效'}
              </p>
            </div>
          </div>
        </div>

        {/* Token 信息 */}
        {tokenInfo && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Token 信息</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>过期时间: {tokenInfo.exp ? new Date(tokenInfo.exp * 1000).toLocaleString() : 'N/A'}</div>
              <div>签发时间: {tokenInfo.iat ? new Date(tokenInfo.iat * 1000).toLocaleString() : 'N/A'}</div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">操作</h2>
          <div className="space-y-2">
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              前往 Dashboard
            </button>
            <button
              onClick={() => (window.location.href = '/admin/errors')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
            >
              前往管理员页面
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
