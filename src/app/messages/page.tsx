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
  User,
  Bot,
  Clock,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: number;
  robotId: string;
  userId: string;
  sessionId: string;
  messageType: string;
  content: string;
  extraData: any;
  status: string;
  direction: 'incoming' | 'outgoing';
  replyToMessageId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Robot {
  id: number;
  robot_id: string;
  name: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingRobots, setLoadingRobots] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
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

  // 加载消息列表
  const loadMessages = async () => {
    if (!selectedRobotId) {
      setMessages([]);
      setTotal(0);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get('/api/messages/list', {
        params: {
          robotId: selectedRobotId,
          direction: directionFilter !== 'all' ? directionFilter : undefined,
          limit,
          offset: (page - 1) * limit,
        },
      });

      if (response.data.success) {
        setMessages(response.data.data.messages || []);
        setTotal(response.data.data.pagination.total);
      }
    } catch (error: any) {
      console.error('加载消息列表失败:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载消息列表失败",
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
      loadMessages();
    }
  }, [selectedRobotId, directionFilter, page]);

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-900 dark:via-cyan-900 dark:to-teal-900 p-8">
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              消息中心
            </h1>
            <p className="text-xl text-blue-100 mb-6 max-w-2xl">
              实时查看和管理用户对话，支持多平台消息统一管理
            </p>
            <Link href="/sessions">
              <Button className="bg-white text-blue-600 hover:bg-blue-50">
                <MessageSquare className="mr-2 h-4 w-4" />
                查看会话列表
              </Button>
            </Link>
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

              {/* 消息方向筛选 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">消息方向</label>
                <Select
                  value={directionFilter}
                  onValueChange={(value) => {
                    setDirectionFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择方向" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="incoming">用户消息</SelectItem>
                    <SelectItem value="outgoing">机器人消息</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 刷新按钮 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">操作</label>
                <Button
                  onClick={() => loadMessages()}
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

        {/* 消息列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>消息列表</CardTitle>
                <CardDescription>共 {total} 条消息</CardDescription>
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">加载中...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无消息</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <Card key={message.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            {message.direction === 'incoming' ? (
                              <>
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-sm">用户消息</span>
                              </>
                            ) : (
                              <>
                                <Bot className="w-4 h-4 text-purple-600" />
                                <span className="font-medium text-sm">机器人回复</span>
                              </>
                            )}
                            <Badge variant="outline">{message.messageType || 'text'}</Badge>
                            <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.sessionId && (
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-medium">会话 ID:</span> {message.sessionId}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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

