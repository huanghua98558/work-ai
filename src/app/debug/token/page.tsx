'use client';

import { useEffect, useState } from 'react';

export default function TokenDebugPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 读取 token 和 user
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    setToken(savedToken);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  const testToken = async () => {
    if (!token) {
      alert('没有找到 token，请先登录');
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/robots', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      setTestResult({
        success: response.ok,
        status: response.status,
        data: data,
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const clearToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setTestResult(null);
    alert('已清除 token，请重新登录');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Token 调试工具
        </h1>

        {/* Token 状态 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Token 状态
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-gray-700 dark:text-gray-300">Token 是否存在</span>
              <span className={`font-mono ${token ? 'text-green-600' : 'text-red-600'}`}>
                {token ? '是' : '否'}
              </span>
            </div>
            {token && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-700 dark:text-gray-300 block mb-2">Token 内容：</span>
                <code className="text-xs text-gray-900 dark:text-white break-all block">
                  {token}
                </code>
              </div>
            )}
            {user && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-700 dark:text-gray-300 block mb-2">用户信息：</span>
                <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* 测试 Token */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            测试 Token
          </h2>
          <div className="flex gap-4">
            <button
              onClick={testToken}
              disabled={!token || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '测试中...' : '测试 Token'}
            </button>
            <button
              onClick={clearToken}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              清除 Token
            </button>
          </div>

          {testResult && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                测试结果
              </h3>
              <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* 解决方案 */}
        {!token && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
              问题诊断
            </h2>
            <div className="text-yellow-800 dark:text-yellow-200 space-y-2">
              <p>❌ 没有找到 token</p>
              <p className="mt-4"><strong>可能原因：</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>localStorage 被禁用或清除</li>
                <li>跨域问题导致 localStorage 无法访问</li>
                <li>浏览器隐私模式</li>
                <li>未登录或登录失败</li>
              </ul>
              <p className="mt-4"><strong>解决方案：</strong></p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>访问 <a href="/login" className="underline">登录页面</a> 重新登录</li>
                <li>确保浏览器允许使用 localStorage</li>
                <li>检查浏览器控制台是否有错误</li>
              </ol>
            </div>
          </div>
        )}

        {testResult && !testResult.success && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-4">
              测试失败
            </h2>
            <div className="text-red-800 dark:text-red-200 space-y-2">
              <p>Token 验证失败</p>
              <p className="mt-4"><strong>可能原因：</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Token 已过期</li>
                <li>Token 格式不正确</li>
                <li>Token 对应的用户不存在或已被禁用</li>
              </ul>
              <p className="mt-4"><strong>解决方案：</strong></p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>访问 <a href="/login" className="underline">登录页面</a> 重新登录</li>
                <li>检查用户状态是否正常</li>
              </ol>
            </div>
          </div>
        )}

        {/* 返回链接 */}
        <div className="text-center">
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            返回仪表盘
          </a>
        </div>
      </div>
    </div>
  );
}
