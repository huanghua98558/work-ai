'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/admin-layout';
import {
  BookOpen,
  MessageSquare,
  Settings,
  Shield,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Search,
  HelpCircle,
  Video,
  FileText,
  Users,
  Code,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const helpCategories = [
  {
    id: 'getting-started',
    name: '快速入门',
    icon: BookOpen,
    color: 'from-blue-500 to-indigo-600',
    items: [
      {
        title: '系统介绍',
        description: '了解 WorkBot 的核心功能和架构',
        icon: Zap,
        content: `
          <h3 class="text-xl font-bold mb-4">WorkBot 系统介绍</h3>
          <p class="mb-4">WorkBot 是一个企业级智能机器人管理系统，支持多平台接入（企业微信、微信、小程序）。</p>
          <h4 class="font-semibold mb-2">核心功能</h4>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li>机器人管理 - 创建、配置和管理智能机器人</li>
            <li>激活码管理 - 生成和管理设备激活码</li>
            <li>消息管理 - 查看和分析用户对话记录</li>
            <li>知识库 - 管理机器人的知识库内容</li>
            <li>系统监控 - 实时监控系统运行状态</li>
          </ul>
        `,
      },
      {
        title: '首次登录',
        description: '如何登录系统并开始使用',
        icon: Shield,
        content: `
          <h3 class="text-xl font-bold mb-4">首次登录指南</h3>
          <ol class="list-decimal list-inside space-y-3">
            <li>访问系统登录页面</li>
            <li>输入管理员账号和密码</li>
            <li>登录成功后进入仪表盘</li>
            <li>开始创建和管理机器人</li>
          </ol>
        `,
      },
      {
        title: '界面导航',
        description: '熟悉系统的各个功能模块',
        icon: Settings,
        content: `
          <h3 class="text-xl font-bold mb-4">界面导航指南</h3>
          <h4 class="font-semibold mb-2">侧边栏导航</h4>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>仪表盘</strong> - 查看系统概览和统计数据</li>
            <li><strong>激活码管理</strong> - 管理设备激活码</li>
            <li><strong>机器人管理</strong> - 创建和配置机器人</li>
            <li><strong>消息中心</strong> - 查看对话记录</li>
            <li><strong>知识库</strong> - 管理知识库内容</li>
            <li><strong>WebSocket</strong> - 监控实时连接</li>
            <li><strong>日志管理</strong> - 查看系统日志</li>
            <li><strong>系统监控</strong> - 监控系统状态</li>
            <li><strong>用户管理</strong> - 管理系统用户</li>
            <li><strong>系统设置</strong> - 配置系统参数</li>
          </ul>
        `,
      },
    ],
  },
  {
    id: 'features',
    name: '功能说明',
    icon: Zap,
    color: 'from-purple-500 to-pink-600',
    items: [
      {
        title: '机器人管理',
        description: '创建、配置和管理智能机器人',
        icon: Zap,
        content: `
          <h3 class="text-xl font-bold mb-4">机器人管理功能</h3>
          <h4 class="font-semibold mb-2">创建机器人</h4>
          <ol class="list-decimal list-inside space-y-2 mb-4">
            <li>进入"机器人管理"页面</li>
            <li>点击"创建机器人"按钮</li>
            <li>填写机器人信息（名称、描述、类型等）</li>
            <li>配置机器人参数</li>
            <li>保存并激活</li>
          </ol>
          <h4 class="font-semibold mb-2">配置机器人</h4>
          <ul class="list-disc list-inside space-y-2">
            <li>基本信息配置</li>
            <li>AI 模型配置</li>
            <li>回复模板配置</li>
            <li>风控规则配置</li>
          </ul>
        `,
      },
      {
        title: '激活码管理',
        description: '生成和管理设备激活码',
        icon: Code,
        content: `
          <h3 class="text-xl font-bold mb-4">激活码管理功能</h3>
          <h4 class="font-semibold mb-2">生成激活码</h4>
          <ol class="list-decimal list-inside space-y-2 mb-4">
            <li>进入"激活码管理"页面</li>
            <li>点击"生成激活码"按钮</li>
            <li>设置激活码参数（有效期、使用次数等）</li>
            <li>选择绑定的机器人</li>
            <li>生成并保存激活码</li>
          </ol>
          <h4 class="font-semibold mb-2">激活码类型</h4>
          <ul class="list-disc list-inside space-y-2">
            <li>单次激活 - 只能使用一次</li>
            <li>多次激活 - 可以使用多次</li>
            <li>永久激活 - 无有效期限制</li>
          </ul>
        `,
      },
      {
        title: '知识库管理',
        description: '管理机器人的知识库内容',
        icon: FileText,
        content: `
          <h3 class="text-xl font-bold mb-4">知识库管理功能</h3>
          <h4 class="font-semibold mb-2">添加知识</h4>
          <ol class="list-decimal list-inside space-y-2 mb-4">
            <li>进入"知识库"页面</li>
            <li>点击"添加知识"按钮</li>
            <li>输入问题和答案</li>
            <li>选择关联的机器人</li>
            <li>保存知识条目</li>
          </ol>
          <h4 class="font-semibold mb-2">知识库导入</h4>
          <p class="mb-2">支持批量导入知识，格式为 CSV 或 Excel</p>
        `,
      },
    ],
  },
  {
    id: 'faq',
    name: '常见问题',
    icon: HelpCircle,
    color: 'from-green-500 to-teal-600',
    items: [
      {
        title: '如何重置密码？',
        description: '忘记密码时的解决方法',
        icon: Shield,
        content: `
          <h3 class="text-xl font-bold mb-4">如何重置密码</h3>
          <ol class="list-decimal list-inside space-y-3">
            <li>联系系统管理员</li>
            <li>提供您的用户名和邮箱</li>
            <li>管理员验证身份后重置密码</li>
            <li>使用新密码登录系统</li>
          </ol>
          <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p class="text-yellow-800"><strong>提示：</strong>首次登录后建议立即修改默认密码。</p>
          </div>
        `,
      },
      {
        title: '机器人没有回复怎么办？',
        description: '机器人不回复的排查步骤',
        icon: AlertCircle,
        content: `
          <h3 class="text-xl font-bold mb-4">机器人不回复的排查步骤</h3>
          <ol class="list-decimal list-inside space-y-3">
            <li>检查机器人是否已激活</li>
            <li>检查机器人是否在线</li>
            <li>检查 AI 模型配置是否正确</li>
            <li>检查知识库是否配置</li>
            <li>查看系统日志获取错误信息</li>
          </ol>
          <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-red-800"><strong>注意：</strong>如果问题持续存在，请联系技术支持。</p>
          </div>
        `,
      },
      {
        title: '如何导出数据？',
        description: '导出机器人数据的方法',
        icon: FileText,
        content: `
          <h3 class="text-xl font-bold mb-4">数据导出方法</h3>
          <h4 class="font-semibold mb-2">导出消息记录</h4>
          <ol class="list-decimal list-inside space-y-2 mb-4">
            <li>进入"消息中心"页面</li>
            <li>选择要导出的时间段</li>
            <li>点击"导出"按钮</li>
            <li>选择导出格式（Excel/CSV）</li>
            <li>下载导出文件</li>
          </ol>
          <h4 class="font-semibold mb-2">导出激活码</h4>
          <p class="mb-2">在"激活码管理"页面可以批量导出激活码。</p>
        `,
      },
    ],
  },
  {
    id: 'technical',
    name: '技术文档',
    icon: Code,
    color: 'from-orange-500 to-red-600',
    items: [
      {
        title: 'API 接口文档',
        description: 'WorkBot API 接口说明',
        icon: Code,
        content: `
          <h3 class="text-xl font-bold mb-4">API 接口文档</h3>
          <p class="mb-4">WorkBot 提供完整的 REST API 接口，支持第三方系统集成。</p>
          <h4 class="font-semibold mb-2">主要接口</h4>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li>POST /api/robot-ids/activate - 设备激活</li>
            <li>GET /api/robots - 获取机器人列表</li>
            <li>POST /api/robots - 创建机器人</li>
            <li>GET /api/messages - 获取消息记录</li>
            <li>POST /api/messages/report - 上报消息</li>
          </ul>
          <p class="text-sm text-gray-600">详细 API 文档请参考：<a href="#" class="text-blue-600 hover:underline">docs/APP_COMMUNICATION_TECHNICAL_DOC.md</a></p>
        `,
      },
      {
        title: 'WebSocket 通讯',
        description: 'WebSocket 实时通讯规范',
        icon: Zap,
        content: `
          <h3 class="text-xl font-bold mb-4">WebSocket 通讯规范</h3>
          <p class="mb-4">WorkBot 支持 WebSocket 实时通讯，用于推送指令和自动回复。</p>
          <h4 class="font-semibold mb-2">连接地址</h4>
          <pre class="bg-gray-100 p-3 rounded text-sm mb-4">wss://gbdvprr2vy.coze.site/ws</pre>
          <h4 class="font-semibold mb-2">认证方式</h4>
          <p class="mb-2">连接后发送认证消息：</p>
          <pre class="bg-gray-100 p-3 rounded text-sm">
{{
  "type": "authenticate",
  "data": {{
    "robotId": "xxx",
    "token": "xxx"
  }}
}}</pre>
        `,
      },
      {
        title: '环境变量配置',
        description: '生产环境变量配置指南',
        icon: Settings,
        content: `
          <h3 class="text-xl font-bold mb-4">环境变量配置</h3>
          <h4 class="font-semibold mb-2">必需的环境变量</h4>
          <pre class="bg-gray-100 p-3 rounded text-sm mb-4">
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-key
NODE_ENV=production</pre>
          <h4 class="font-semibold mb-2">可选的环境变量</h4>
          <pre class="bg-gray-100 p-3 rounded text-sm">
PORT=5000
LOG_LEVEL=info</pre>
          <p class="text-sm text-gray-600 mt-2">详细配置请参考 Coze 平台环境变量配置指南。</p>
        `,
      },
    ],
  },
  {
    id: 'contact',
    name: '联系支持',
    icon: Mail,
    color: 'from-indigo-500 to-blue-600',
    items: [
      {
        title: '技术支持',
        description: '获取技术帮助和支持',
        icon: HelpCircle,
        content: `
          <h3 class="text-xl font-bold mb-4">技术支持</h3>
          <h4 class="font-semibold mb-2">联系方式</h4>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>邮箱：</strong> support@workbot.com</li>
            <li><strong>电话：</strong> 400-XXX-XXXX</li>
            <li><strong>工作时间：</strong> 周一至周五 9:00-18:00</li>
          </ul>
          <h4 class="font-semibold mb-2">支持范围</h4>
          <ul class="list-disc list-inside space-y-2">
            <li>系统使用咨询</li>
            <li>技术问题排查</li>
            <li>功能需求反馈</li>
            <li>版本升级支持</li>
          </ul>
        `,
      },
      {
        title: '反馈建议',
        description: '向我们反馈问题和建议',
        icon: MessageSquare,
        content: `
          <h3 class="text-xl font-bold mb-4">反馈建议</h3>
          <p class="mb-4">我们非常重视您的反馈和建议，这将帮助我们改进产品。</p>
          <h4 class="font-semibold mb-2">反馈渠道</h4>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li>发送邮件到 feedback@workbot.com</li>
            <li>在 GitHub 提交 Issue</li>
            <li>联系客户经理</li>
          </ul>
          <h4 class="font-semibold mb-2">反馈内容</h4>
          <p class="text-sm text-gray-600">请尽可能详细地描述问题或建议，包括：</p>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>问题描述</li>
            <li>复现步骤</li>
            <li>期望结果</li>
            <li>截图或日志</li>
          </ul>
        `,
      },
    ],
  },
];

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const category = helpCategories.find((cat) => cat.id === activeCategory);
  const CategoryIcon = category?.icon || HelpCircle;

  // 过滤搜索结果
  const filteredItems = category?.items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">帮助中心</h1>
            <p className="text-gray-600">查找使用指南、功能说明和常见问题解答</p>
          </div>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="搜索帮助内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 侧边栏 - 分类列表 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  帮助分类
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {helpCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setActiveItem(null);
                          setSearchQuery('');
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          activeCategory === cat.id
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">{cat.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* 主要内容区 */}
          <div className="lg:col-span-3">
            {/* 分类标题 */}
            <div className="mb-6 flex items-center gap-3">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${category?.color} text-white`}>
                <CategoryIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{category?.name}</h2>
                <p className="text-gray-600">{filteredItems.length} 个主题</p>
              </div>
            </div>

            {/* 项目列表 */}
            <div className="space-y-3">
              {filteredItems.map((item, index) => {
                const ItemIcon = item.icon;
                return (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all duration-200 ${
                      activeItem === item.title
                        ? 'ring-2 ring-blue-500 shadow-lg'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setActiveItem(activeItem === item.title ? null : item.title)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${category?.color} text-white flex-shrink-0`}>
                          <ItemIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                          <CardDescription className="mt-1">{item.description}</CardDescription>
                        </div>
                        {activeItem === item.title ? (
                          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        ) : (
                          <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                    {activeItem === item.title && (
                      <CardContent>
                        <Separator className="my-4" />
                        <div
                          className="prose prose-sm max-w-none text-gray-700"
                          dangerouslySetInnerHTML={{ __html: item.content }}
                        />
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* 空状态 */}
            {filteredItems.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <HelpCircle className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">没有找到相关内容</p>
                  <p className="text-gray-400 text-sm mt-2">尝试搜索其他关键词</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 快速链接 */}
        <Card>
          <CardHeader>
            <CardTitle>快速链接</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/docs/APP_COMMUNICATION_TECHNICAL_DOC.md"
                target="_blank"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">API 文档</p>
                  <p className="text-xs text-gray-500">查看完整 API 接口文档</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
              </Link>

              <Link
                href="/docs/APP_COMMUNICATION_TECHNICAL_DOC.md"
                target="_blank"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">通讯规范</p>
                  <p className="text-xs text-gray-500">WebSocket 通讯技术文档</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
              </Link>

              <Link
                href="/settings"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">系统设置</p>
                  <p className="text-xs text-gray-500">配置系统参数和环境</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
