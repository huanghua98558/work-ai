'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Bot,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [closing, setClosing] = useState(false);

  // 加载会话详情
  const loadSession = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/sessions/${sessionId}`);

      if (response.data.success) {
        setSession(response.data.data);
        // 加载完会话后，自动加载消息
        loadMessages(response.data.data.robotId);
      } else {
        toast({
          title: "加载失败",
          description: response.data.error || "加载会话详情失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('加载会话详情失败:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载会话详情失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 加载消息列表
  const loadMessages = async (robotId: string) => {
    try {
      setLoadingMessages(true);
      const response = await apiClient.get('/api/messages/list', {
        params: {
          robotId,
          sessionId,
          limit: 100,
        },
      });

      if (response.data.success) {
        setMessages(response.data.data.messages || []);
      }
    } catch (error: any) {
      console.error('加载消息列表失败:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载消息列表失败",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  // 关闭会话
  const closeSession = async () => {
    if (!session) return;

    if (!confirm('确定要关闭此会话吗？')) {
      return;
    }

    try {
      setClosing(true);
      const response = await apiClient.patch(`/api/sessions/${sessionId}`, {
        status: 'closed',
      });

      if (response.data.success) {
        toast({
          title: "成功",
          description: "会话已关闭",
        });
        // 重新加载会话详情
        loadSession();
      }
    } catch (error: any) {
      console.error('关闭会话失败:', error);
      toast({
        title: "操作失败",
        description: error.message || "关闭会话失败",
        variant: "destructive",
      });
    } finally {
      setClosing(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [sessionId]);

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
        {/* 返回按钮 */}
        <Link href="/sessions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回会话列表
          </Button>
        </Link>

        {/* 页面标题 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 dark:from-purple-900 dark:via-pink-900 dark:to-rose-900 p-8">
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              会话详情
            </h1>
            <p className="text-xl text-purple-100 mb-6 max-w-2xl">
              查看会话详细信息和所有对话消息
            </p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            </CardContent>
          </Card>
        ) : !session ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>会话不存在</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 会话信息 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>会话信息</CardTitle>
                    <CardDescription>会话 ID: {session.sessionId}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(session.status)}
                    {session.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={closeSession}
                        disabled={closing}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        关闭会话
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-600">用户:</span>
                    <span className="font-medium">{session.userId}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Bot className="w-4 h-4 text-purple-600" />
                    <span className="text-gray-600">机器人:</span>
                    <span className="font-medium">{session.robotId}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span className="text-gray-600">消息数:</span>
                    <span className="font-medium">{session.messageCount}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-600">最后更新:</span>
                    <span className="font-medium">{formatTime(session.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 消息列表 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>对话消息</CardTitle>
                    <CardDescription>共 {messages.length} 条消息</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadMessages(session.robotId)}
                    disabled={loadingMessages}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingMessages ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingMessages ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
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
                      <div
                        key={message.id}
                        className={`flex ${message.direction === 'incoming' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-4 ${
                            message.direction === 'incoming'
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : 'bg-purple-50 dark:bg-purple-900/20'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            {message.direction === 'incoming' ? (
                              <>
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-600">用户</span>
                              </>
                            ) : (
                              <>
                                <Bot className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium text-purple-600">机器人</span>
                              </>
                            )}
                            <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.messageType && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {message.messageType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
