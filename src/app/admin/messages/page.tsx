'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
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
  Filter,
  Download,
} from 'lucide-react';

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

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingRobots, setLoadingRobots] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // 加载机器人列表
  const loadRobots = async () => {
    try {
      setLoadingRobots(true);
      const response = await apiClient.get('/api/robots');

      if (response.success) {
        setRobots(response.data);

        // 如果有机器人，自动选择第一个
        if (response.data.length > 0 && !selectedRobotId) {
          setSelectedRobotId(response.data[0].robot_id);
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

      if (response.success) {
        setMessages(response.data.messages || []);
        setTotal(response.data.pagination.total);
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

  const handleExport = async () => {
    try {
      const response = await apiClient.get('/api/messages/list', {
        params: {
          robotId: selectedRobotId,
          direction: directionFilter !== 'all' ? directionFilter : undefined,
          limit: 1000,
          offset: 0,
        },
      });

      if (response.success) {
        const data = response.data.messages;
        const csv = [
          ['时间', '方向', '用户ID', '消息内容', '状态'].join(','),
          ...data.map((msg: Message) => [
            msg.createdAt,
            msg.direction === 'incoming' ? '接收' : '发送',
            msg.userId,
            msg.content.replace(/,/g, '；'),
            msg.status,
          ].join(',')),
        ].join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `messages-${selectedRobotId}-${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);

        toast({
          title: "导出成功",
          description: "消息已成功导出为CSV文件",
        });
      }
    } catch (error: any) {
      console.error('导出消息失败:', error);
      toast({
        title: "导出失败",
        description: error.message || "导出消息失败",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">消息管理</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              查看和管理所有机器人的消息记录
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadMessages}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!selectedRobotId || loading}
            >
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>总消息数</CardDescription>
              <CardTitle className="text-3xl">{total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
                所有消息
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>接收消息</CardDescription>
              <CardTitle className="text-3xl">
                {messages.filter(m => m.direction === 'incoming').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <User className="h-4 w-4 mr-2 text-green-500" />
                用户发送
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>发送消息</CardDescription>
              <CardTitle className="text-3xl">
                {messages.filter(m => m.direction === 'outgoing').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <Bot className="h-4 w-4 mr-2 text-purple-500" />
                机器人回复
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>活跃机器人</CardDescription>
              <CardTitle className="text-3xl">{robots.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <Bot className="h-4 w-4 mr-2 text-cyan-500" />
                在线服务中
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选条件 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              筛选条件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <SelectValue placeholder="全部方向" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="incoming">接收</SelectItem>
                    <SelectItem value="outgoing">发送</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">搜索</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="搜索消息内容..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 消息列表 */}
        <Card>
          <CardHeader>
            <CardTitle>消息列表</CardTitle>
            <CardDescription>共 {total} 条消息</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  暂无消息
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  选择一个机器人开始查看消息记录
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages
                  .filter(m => !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((message) => (
                    <Card key={message.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.direction === 'incoming'
                              ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                              : 'bg-gradient-to-br from-purple-500 to-pink-500'
                          }`}>
                            {message.direction === 'incoming' ? (
                              <User className="h-5 w-5 text-white" />
                            ) : (
                              <Bot className="h-5 w-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={message.direction === 'incoming' ? 'default' : 'secondary'}>
                                {message.direction === 'incoming' ? '接收' : '发送'}
                              </Badge>
                              <span className="text-sm text-slate-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {formatTime(message.createdAt)}
                              </span>
                            </div>
                            <p className="text-slate-900 dark:text-white break-words mb-2">
                              {message.content}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>用户ID: {message.userId}</span>
                              <span>会话ID: {message.sessionId}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            {/* 分页 */}
            {total > limit && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  第 {page} 页 / 共 {Math.ceil(total / limit)} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                  disabled={page >= Math.ceil(total / limit)}
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
