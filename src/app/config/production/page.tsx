'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Key, Shield, Settings } from 'lucide-react';

export default function ProductionConfigPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            生产环境配置指南
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            配置 JWT_SECRET 确保系统安全性
          </p>
        </div>

        {/* 当前状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              当前状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span className="text-sm font-medium text-red-900 dark:text-red-200">
                JWT_SECRET 配置
              </span>
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                未配置
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-sm font-medium text-green-900 dark:text-green-200">
                数据库连接
              </span>
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                已连接
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-sm font-medium text-green-900 dark:text-green-200">
                调试页面
              </span>
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                可访问
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 为什么需要 JWT_SECRET */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-600" />
              为什么需要 JWT_SECRET？
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>签名 JWT Token，防止被篡改</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>验证 Token 有效性</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>提高系统安全性</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 配置方法 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              配置方法
            </CardTitle>
            <CardDescription>
              在扣子平台配置 JWT_SECRET 环境变量
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 步骤 1 */}
            <div className="space-y-2">
              <h3 className="font-semibold">步骤 1：生成随机密钥</h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-mono mb-2 text-gray-900 dark:text-gray-200">
                  # 使用 OpenSSL
                </p>
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  openssl rand -base64 32
                </p>
                <p className="text-sm font-mono mt-3 mb-2 text-gray-900 dark:text-gray-200">
                  # 使用 Node.js
                </p>
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
                </p>
                <p className="text-sm font-mono mt-3 mb-2 text-gray-900 dark:text-gray-200">
                  # 使用 Python
                </p>
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  python3 -c "import secrets; print(secrets.token_urlsafe(32))"
                </p>
              </div>
            </div>

            {/* 步骤 2 */}
            <div className="space-y-2">
              <h3 className="font-semibold">步骤 2：在扣子平台配置</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>登录扣子平台</li>
                <li>进入项目设置</li>
                <li>找到环境变量配置</li>
                <li>添加以下环境变量：</li>
              </ol>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mt-2">
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  JWT_SECRET=your-very-secure-random-string-here
                </p>
              </div>
            </div>

            {/* 步骤 3 */}
            <div className="space-y-2">
              <h3 className="font-semibold">步骤 3：重新部署</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                配置完成后，重新部署应用即可。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 安全建议 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              安全建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-red-600 flex-shrink-0" />
                <span>不要使用简单的密码（如 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">123456</code>）</span>
              </li>
              <li className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-red-600 flex-shrink-0" />
                <span>建议使用至少 32 个字符的随机字符串</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>定期更换密钥（建议每 3-6 个月）</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>不同环境使用不同的密钥</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 验证配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              验证配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              配置完成后，访问以下地址验证：
            </p>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                /api/debug/check-deploy
              </p>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              检查 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">hasJwtSecret</code> 是否为 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">true</code>。
            </p>
          </CardContent>
        </Card>

        {/* 常见问题 */}
        <Card>
          <CardHeader>
            <CardTitle>常见问题</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Q1: 不配置 JWT_SECRET 会怎样？</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Token 可能不安全，攻击者可能伪造 Token。
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Q2: 配置 JWT_SECRET 后需要重启服务吗？</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                是的，需要重新部署应用才能生效。
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Q3: 更换 JWT_SECRET 会影响已登录的用户吗？</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                是的，所有用户需要重新登录。建议在低峰期更换密钥。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
