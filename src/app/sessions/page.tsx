'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Search,
  Filter,
  Clock,
  User,
  Bot,
  CheckCircle,
  XCircle,
  Archive,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface Session {
  id: number;
  sessionId: string;
  robotId: string;
  userId: string;
  status: 'active' | 'closed';
  metadata: any;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Robot {
  id: number;
  robot_id: string;
  name: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingRobots, setLoadingRobots] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // 加载机器人列表
  const loadRobots = async () => {
    try {
      setLoadingRobots(true);
      const response = await apiClient.get('/api/robots');

      if (response.data.success) {
        setRobots(response.data.data);

        // 如果有机器人，自动选择第一个
        if (response.data.data.length > 0 && !selectedRobotId) {
          setSelectedRobotId(response.data.data[0].robot_id);
        }
      }
    } catch (error: any) {
      console.error('加载机器人列表失败:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载机器人列表失败",
        variant: "destructive",
      });
    } finally {
      setLoadingRobots(false);
    }
  };

  // 加载会话列表
  const loadSessions = async () => {
    if (!selectedRobotId) {
      setSessions([]);
      setTotal(0);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get('/api/sessions/list', {
        params: {
          robotId: selectedRobotId,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit,
          offset: (page - 1) * limit,
        },
      });

      if (response.data.success) {
        setSessions(response.data.data.sessions);
        setTotal(response.data.data.pagination.total);
      }
    } catch (error: any) {
      console.error('加载会话列表失败:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载会话列表失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRobots();
  }, []);

  useEffect(() => {
    if (selectedRobotId) {
      loadSessions();
    }
  }, [selectedRobotId, statusFilter, page]);

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  };

  // 获取状态颜色
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />活跃</Badge>;
      case 'closed':
        return <Badge variant="secondary" className="bg-gray-500"><Archive className="w-3 h-3 mr-1" />已关闭</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 dark:from-purple-900 dark:via-pink-900 dark:to-rose-900 p-8">
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              对话管理
            </h1>
            <p className="text-xl text-purple-100 mb-6 max-w-2xl">
              查看和管理所有对话会话，支持实时查看、搜索和筛选
            </p>
          </div>
        </div>

        {/* 筛选和搜索 */}
        <Card>
          <CardHeader>
            <CardTitle>筛选条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 机器人选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">机器人</label>
                <Select
                  value={selectedRobotId}
                  onValueChange={(value) => {
                    setSelectedRobotId(value);
                    setPage(1);
                  }}
                  disabled={loadingRobots}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRobots ? "加载中..." : "选择机器人"} />
                  </SelectTrigger>
                  <SelectContent>
                    {robots.map((robot) => (
                      <SelectItem key={robot.id} value={robot.robot_id}>
                        <Bot className="w-4 h-4 mr-2" />
                        {robot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 状态筛选 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">状态</label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="closed">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 刷新按钮 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">操作</label>
                <Button
                  onClick={() => loadSessions()}
                  disabled={loading || !selectedRobotId}
                  className="w-full"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 会话列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>会话列表</CardTitle>
                <CardDescription>共 {total} 个会话</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedRobotId ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>请先选择一个机器人</p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">加载中...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无会话</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.sessionId}`}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-purple-600" />
                              <span className="font-medium text-sm">会话 ID: {session.sessionId}</span>
                              {getStatusBadge(session.status)}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                <span>用户: {session.userId}</span>
                              </div>
                              <div className="flex items-center">
                                <Bot className="w-3 h-3 mr-1" />
                                <span>机器人: {session.robotId}</span>
                              </div>
                              <div className="flex items-center">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                <span>{session.messageCount} 条消息</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                <span>{formatTime(session.lastMessageAt)}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* 分页 */}
            {total > limit && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="text-sm text-gray-600">
                  显示 {(page - 1) * limit + 1} - {Math.min(page * limit, total)} 条，共 {total} 条
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    上一页
                  </Button>
                  <div className="text-sm">
                    第 {page} / {Math.ceil(total / limit)} 页
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
                    disabled={page >= Math.ceil(total / limit)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
