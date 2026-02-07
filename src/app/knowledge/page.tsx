'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Plus,
  Search,
  Upload,
  FileText,
  Database,
  BarChart,
  Link as LinkIcon,
  Trash2,
  Edit,
  Brain,
  Zap,
  Globe,
} from 'lucide-react';

interface KnowledgeBase {
  id: number;
  name: string;
  description: string;
  type: 'document' | 'url' | 'database';
  status: 'indexing' | 'ready' | 'error';
  documentCount: number;
  size: number;
  createdAt: string;
  lastUpdated: string;
}

export default function KnowledgePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟数据加载
    const mockData: KnowledgeBase[] = [
      {
        id: 1,
        name: '产品手册',
        description: 'WorkBot 系统完整的产品使用文档和功能说明',
        type: 'document',
        status: 'ready',
        documentCount: 156,
        size: 2.3,
        createdAt: '2024-01-15',
        lastUpdated: '2024-02-10',
      },
      {
        id: 2,
        name: '技术文档',
        description: 'API 接口文档、SDK 使用指南和开发规范',
        type: 'document',
        status: 'ready',
        documentCount: 89,
        size: 1.8,
        createdAt: '2024-01-20',
        lastUpdated: '2024-02-08',
      },
      {
        id: 3,
        name: '行业知识库',
        description: '收集的行业动态、竞争对手分析和市场报告',
        type: 'url',
        status: 'indexing',
        documentCount: 0,
        size: 0,
        createdAt: '2024-02-01',
        lastUpdated: '2024-02-01',
      },
    ];
    setKnowledgeBases(mockData);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">加载中...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 p-8">
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              知识库管理
            </h1>
            <p className="text-xl text-indigo-100 mb-6 max-w-2xl">
              构建企业知识库，支持文档、URL、数据库多种数据源，让 AI 更懂业务
            </p>
            <div className="flex gap-3">
              <Button className="bg-white text-indigo-600 hover:bg-indigo-50">
                <Plus className="mr-2 h-4 w-4" />
                创建知识库
              </Button>
              <Button className="bg-white/10 text-white border-white/50 hover:bg-white/20">
                <Upload className="mr-2 h-4 w-4" />
                上传文档
              </Button>
              <Button className="bg-white/10 text-white border-white/50 hover:bg-white/20">
                <Search className="mr-2 h-4 w-4" />
                全局搜索
              </Button>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-50">知识库数量</CardTitle>
              <BookOpen className="h-4 w-4 text-indigo-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{knowledgeBases.length}</div>
              <p className="text-sm text-indigo-100 mt-1">已创建</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-50">文档总数</CardTitle>
              <FileText className="h-4 w-4 text-purple-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {knowledgeBases.reduce((sum, kb) => sum + kb.documentCount, 0)}
              </div>
              <p className="text-sm text-purple-100 mt-1">已索引</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-pink-50">存储空间</CardTitle>
              <Database className="h-4 w-4 text-pink-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {knowledgeBases.reduce((sum, kb) => sum + kb.size, 0).toFixed(1)} GB
              </div>
              <p className="text-sm text-pink-100 mt-1">已使用</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-50">命中次数</CardTitle>
              <Brain className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">1,234</div>
              <p className="text-sm text-blue-100 mt-1">本月累计</p>
            </CardContent>
          </Card>
        </div>

        {/* 知识库列表 */}
        <Card className="border-2 border-indigo-100 dark:border-indigo-900">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              知识库列表
            </CardTitle>
            <CardDescription>管理您的企业知识库，支持文档上传、URL 导入和数据库连接</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {knowledgeBases.map((kb) => (
                <div
                  key={kb.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {kb.type === 'document' ? (
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      ) : kb.type === 'url' ? (
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      ) : (
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{kb.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{kb.description}</p>
                      </div>
                    </div>
                    <Badge
                      variant={kb.status === 'ready' ? 'default' : kb.status === 'indexing' ? 'secondary' : 'outline'}
                    >
                      {kb.status === 'ready' ? (
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          就绪
                        </span>
                      ) : kb.status === 'indexing' ? (
                        <span className="flex items-center gap-1">
                          <BarChart className="h-3 w-3 animate-pulse" />
                          索引中
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">错误</span>
                      )}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-sm">
                      <div className="text-gray-600 dark:text-gray-400">文档数量</div>
                      <div className="font-semibold">{kb.documentCount}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-gray-600 dark:text-gray-400">存储大小</div>
                      <div className="font-semibold">{kb.size} GB</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-gray-600 dark:text-gray-400">创建时间</div>
                      <div className="font-semibold">{kb.createdAt}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-gray-600 dark:text-gray-400">最后更新</div>
                      <div className="font-semibold">{kb.lastUpdated}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-indigo-600">
                      <Edit className="mr-2 h-4 w-4" />
                      编辑
                    </Button>
                    <Button variant="ghost" size="sm" className="text-blue-600">
                      <Upload className="mr-2 h-4 w-4" />
                      添加文档
                    </Button>
                    <Button variant="ghost" size="sm" className="text-purple-600">
                      <Brain className="mr-2 h-4 w-4" />
                      测试问答
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 ml-auto">
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
