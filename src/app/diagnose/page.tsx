'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Diagnostics {
  timestamp: string;
  environment: {
    nodeEnv: string;
    port: string | undefined;
    hasDatabaseUrl: boolean;
    hasPgDatabaseUrl: boolean;
    hasJwtSecret: boolean;
  };
  database: {
    status: string;
    error: string | null;
    serverTime?: string;
  };
}

export default function DiagnosePage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/diagnose')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDiagnostics(data.data);
        }
      })
      .catch(error => {
        console.error('获取诊断信息失败:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">正在检查系统状态...</p>
        </div>
      </div>
    );
  }

  if (!diagnostics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-red-600">获取诊断信息失败</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">系统诊断</h1>

        {/* 环境变量 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">环境变量</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-gray-700 dark:text-gray-300">NODE_ENV</span>
              <span className={`font-mono ${diagnostics.environment.nodeEnv === 'production' ? 'text-green-600' : 'text-blue-600'}`}>
                {diagnostics.environment.nodeEnv || '未设置'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-gray-700 dark:text-gray-300">DATABASE_URL</span>
              <span className={`font-mono ${diagnostics.environment.hasDatabaseUrl ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostics.environment.hasDatabaseUrl ? '已设置' : '未设置'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-gray-700 dark:text-gray-300">PGDATABASE_URL</span>
              <span className={`font-mono ${diagnostics.environment.hasPgDatabaseUrl ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostics.environment.hasPgDatabaseUrl ? '已设置' : '未设置'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-gray-700 dark:text-gray-300">JWT_SECRET</span>
              <span className={`font-mono ${diagnostics.environment.hasJwtSecret ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostics.environment.hasJwtSecret ? '已设置' : '未设置'}
              </span>
            </div>
          </div>
        </div>

        {/* 数据库状态 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">数据库状态</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-gray-700 dark:text-gray-300">连接状态</span>
              <span className={`font-mono ${diagnostics.database.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostics.database.status === 'connected' ? '已连接' : '连接失败'}
              </span>
            </div>
            {diagnostics.database.error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                <span className="text-red-700 dark:text-red-300">错误: {diagnostics.database.error}</span>
              </div>
            )}
            {diagnostics.database.serverTime && (
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-700 dark:text-gray-300">服务器时间</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {new Date(diagnostics.database.serverTime).toLocaleString('zh-CN')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 解决方案 */}
        {diagnostics.environment.hasDatabaseUrl === false && diagnostics.environment.hasPgDatabaseUrl === false && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-4">问题诊断</h2>
            <div className="text-yellow-800 dark:text-yellow-200 space-y-2">
              <p>❌ 数据库连接字符串环境变量未设置</p>
              <p className="mt-4"><strong>解决方案：</strong></p>
              <ol className="list-decimal list-inside space-y-2 mt-2">
                <li>在部署平台的环境变量配置中添加以下变量：</li>
                <li className="font-mono bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded text-sm">
                  PGDATABASE_URL=postgresql://user:password@host:port/database?sslmode=disable
                </li>
                <li>重新部署应用</li>
              </ol>
            </div>
          </div>
        )}

        {/* 返回链接 */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
