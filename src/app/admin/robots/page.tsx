'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Power,
  Settings,
  Activity,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  MessageSquare,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

interface Robot {
  id: number;
  bot_id: string;
  name: string;
  user_nickname: string;
  status: 'online' | 'offline';
  ai_mode: 'builtin' | 'third_party';
  ai_provider: string;
  ai_model: string;
  total_messages: number;
  last_active_at: string;
  created_at: string;
  bound_at: string;
}

export default function AdminRobotsPage() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 加载机器人列表
  const loadRobots = async () => {
    try {
      setRefreshing(true);
      const response = await apiClient.get('/api/robots');

      if (response.data.success && response.data.data) {
        setRobots(response.data.data);
      } else {
        toast({
          title: "加载失败",
          description: response.data.error || "加载机器人列表失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('加载机器人列表失败:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载机器人列表失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRobots();
  }, []);

  // 格式化时间
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '从未';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    if (status === 'online') {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          在线
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
        <XCircle className="h-3 w-3 mr-1" />
        离线
      </Badge>
    );
  };

  // 获取 AI 模式徽章
  const getAiModeBadge = (mode: string) => {
    if (mode === 'builtin') {
      return <Badge variant="secondary">内置 AI</Badge>;
    }
    return <Badge variant="outline">第三方</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">机器人管理</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              管理所有企业微信机器人和 AI 配置
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadRobots}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Link href="/robots/create">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Plus className="h-4 w-4 mr-2" />
                创建机器人
              </Button>
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>总机器人数</CardDescription>
              <CardTitle className="text-3xl">{robots.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <Bot className="h-4 w-4 mr-2 text-blue-500" />
                所有机器人
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>在线机器人</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {robots.filter(r => r.status === 'online').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <Activity className="h-4 w-4 mr-2 text-green-500" />
                正在运行
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>内置 AI</CardDescription>
              <CardTitle className="text-3xl">
                {robots.filter(r => r.ai_mode === 'builtin').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <Zap className="h-4 w-4 mr-2 text-purple-500" />
                使用内置 AI
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>总消息数</CardDescription>
              <CardTitle className="text-3xl">
                {robots.reduce((sum, r) => sum + (r.total_messages || 0), 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <MessageSquare className="h-4 w-4 mr-2 text-cyan-500" />
                累计处理
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 机器人列表 */}
        <Card>
          <CardHeader>
            <CardTitle>机器人列表</CardTitle>
            <CardDescription>管理所有已配置的企业微信机器人</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : robots.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  暂无机器人
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  创建第一个企业微信机器人开始使用
                </p>
                <Link href="/robots/create">
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    <Plus className="h-4 w-4 mr-2" />
                    创建机器人
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>机器人名称</TableHead>
                      <TableHead>Bot ID</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>AI 模式</TableHead>
                      <TableHead>AI 提供商</TableHead>
                      <TableHead>消息数</TableHead>
                      <TableHead>最后活跃</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {robots.map((robot) => (
                      <TableRow key={robot.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-slate-400" />
                            <span>{robot.user_nickname || robot.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {robot.bot_id}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(robot.status)}
                        </TableCell>
                        <TableCell>
                          {getAiModeBadge(robot.ai_mode)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{robot.ai_provider || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 text-slate-400" />
                            <span>{robot.total_messages || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                          {formatTime(robot.last_active_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link href={`/robots/${robot.bot_id}/config`}>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
