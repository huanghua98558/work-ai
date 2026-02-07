'use client';

import { useState } from 'react';

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState('method1');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          扣子平台环境变量配置指南
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          解决生产环境数据库连接失败问题
        </p>

        {/* 选项卡 */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('method1')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'method1'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            方法 1: 应用设置
          </button>
          <button
            onClick={() => setActiveTab('method2')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'method2'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            方法 2: 工作流设置
          </button>
          <button
            onClick={() => setActiveTab('method3')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'method3'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            方法 3: 变量管理
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'verify'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            验证配置
          </button>
        </div>

        {/* 内容区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          {activeTab === 'method1' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                方法 1: 在应用/智能体设置中配置
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    配置步骤
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200">
                    <li>打开扣子平台（https://coze.cn）</li>
                    <li>进入你的应用/智能体</li>
                    <li>点击右上角的"设置"或"应用设置"按钮</li>
                    <li>找到"环境变量"或"Secrets"选项卡</li>
                    <li>添加以下环境变量</li>
                  </ol>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    必需的环境变量
                  </h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`PGDATABASE_URL=postgresql://workbot:YourSecurePassword123@pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com:5432/workbot_db?sslmode=disable
DATABASE_URL=postgresql://workbot:YourSecurePassword123@pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com:5432/workbot_db?sslmode=disable
JWT_SECRET=your-production-secret-key-change-this-to-a-secure-random-string-min-32-chars
NODE_ENV=production`}
                  </pre>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    ⚠️ 重要提示
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-200">
                    <li>将 <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">YourSecurePassword123</code> 替换为真实的数据库密码</li>
                    <li>将 <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">your-production-secret-key</code> 替换为至少 32 位的随机字符串</li>
                    <li>确认数据库主机地址、端口、数据库名正确</li>
                    <li>保存环境变量后重新部署应用</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'method2' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                方法 2: 在工作流设置中配置
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    配置步骤
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-green-800 dark:text-green-200">
                    <li>打开工作流编辑器</li>
                    <li>点击顶部菜单的"设置"或"全局变量"</li>
                    <li>添加环境变量</li>
                    <li>保存并部署工作流</li>
                  </ol>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    变量示例
                  </h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`# 数据库连接
DB_HOST=pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com
DB_PORT=5432
DB_NAME=workbot_db
DB_USER=workbot
DB_PASSWORD=YourSecurePassword123

# JWT 密钥
JWT_SECRET=your-production-secret-key

# 环境标识
NODE_ENV=production`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'method3' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                方法 3: 使用变量管理功能
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    配置步骤
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-purple-800 dark:text-purple-200">
                    <li>访问扣子平台</li>
                    <li>进入项目配置管理</li>
                    <li>查找"变量管理"或"环境变量管理"</li>
                    <li>创建新变量，设置变量名和值</li>
                  </ol>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    代码中读取变量
                  </h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`// TypeScript 示例
const databaseUrl = process.env.PGDATABASE_URL || process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;

if (!databaseUrl) {
  throw new Error('PGDATABASE_URL 环境变量未设置');
}

if (!jwtSecret) {
  throw new Error('JWT_SECRET 环境变量未设置');
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verify' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                验证环境变量配置
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    访问诊断页面
                  </h3>
                  <p className="text-green-800 dark:text-green-200 mb-2">
                    部署后访问诊断页面：
                  </p>
                  <code className="bg-white dark:bg-gray-900 px-3 py-2 rounded-lg block text-sm">
                    https://your-domain/diagnose
                  </code>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    检查项目
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✅</span>
                      <span className="text-blue-800 dark:text-blue-200">hasDatabaseUrl 显示 <code>true</code></span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✅</span>
                      <span className="text-blue-800 dark:text-blue-200">hasPgDatabaseUrl 显示 <code>true</code></span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✅</span>
                      <span className="text-blue-800 dark:text-blue-200">hasJwtSecret 显示 <code>true</code></span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✅</span>
                      <span className="text-blue-800 dark:text-blue-200">database.status 显示 <code>已连接</code></span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    初始化管理员
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    验证通过后，访问初始化页面：
                  </p>
                  <code className="bg-white dark:bg-gray-900 px-3 py-2 rounded-lg block text-sm mb-2">
                    https://your-domain/init
                  </code>
                  <p className="text-gray-700 dark:text-gray-300">
                    创建管理员账户（默认：admin/admin123）
                  </p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    如果仍然失败
                  </h3>
                  <p className="text-red-800 dark:text-red-200">
                    请确认：
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-red-800 dark:text-red-200 mt-2">
                    <li>环境变量已正确配置（无拼写错误）</li>
                    <li>数据库密码正确</li>
                    <li>数据库白名单已设置为 0.0.0.0/0</li>
                    <li>应用已重新部署</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 常见问题 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            常见问题
          </h2>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Q: 找不到"环境变量"配置项怎么办？
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                A: 查找"Secrets"、"变量管理"、"配置管理"或"应用设置"等类似选项卡。
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Q: 为什么 .env 文件在生产环境不生效？
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                A: .env 文件仅用于开发环境。生产环境需要通过部署平台配置环境变量。
              </p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Q: 如何确认扣子平台类型？
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                A: 如果是通过网页（coze.cn）创建和部署应用，则是扣子云端平台；如果是自建服务器部署，则是扣子开源版。
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Q: 数据库连接失败怎么办？
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                A: 访问 /diagnose 页面查看详细错误信息。通常是环境变量未配置或数据库白名单未设置。
              </p>
            </div>
          </div>
        </div>

        {/* 返回链接 */}
        <div className="text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
