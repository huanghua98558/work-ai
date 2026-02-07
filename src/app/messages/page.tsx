'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Search,
  Filter,
  User,
  Bot,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Star,
  Archive,
  Trash2,
  MoreVertical,
} from 'lucide-react';

interface Message {
  id: number;
  conversationId: string;
  senderType: 'user' | 'bot';
  senderName: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'failed' | 'pending';
  platform: 'wechat' | 'mp' | 'miniapp';
}

interface Conversation {
  id: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  platform: 'wechat' | 'mp' | 'miniapp';
  status: 'active' | 'archived';
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // 模拟数据加载
    const mockConversations: Conversation[] = [
      {
        id: '1',
        userName: '张三',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        lastMessage: '你好，请问如何配置机器人？',
        lastTime: '10:30',
        unreadCount: 2,
        platform: 'wechat',
        status: 'active',
      },
      {
        id: '2',
        userName: '李四',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Annie',
        lastMessage: '激活码在哪里可以获取？',
        lastTime: '09:15',
        unreadCount: 0,
        platform: 'mp',
        status: 'active',
      },
      {
        id: '3',
        userName: '王五',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
        lastMessage: '我想购买企业版',
        lastTime: '昨天',
        unreadCount: 1,
        platform: 'miniapp',
        status: 'active',
      },
    ];

    const mockMessages: Message[] = [
      {
        id: 1,
        conversationId: '1',
        senderType: 'user',
        senderName: '张三',
        content: '你好，请问如何配置机器人？',
        timestamp: '10:30',
        status: 'sent',
        platform: 'wechat',
      },
      {
        id: 2,
        conversationId: '1',
        senderType: 'bot',
        senderName: 'WorkBot',
        content: '您好！配置机器人请访问机器人管理页面，点击"新建机器人"按钮。',
        timestamp: '10:31',
        status: 'sent',
        platform: 'wechat',
      },
      {
        id: 3,
        conversationId: '1',
        senderType: 'user',
        senderName: '张三',
        content: '激活码在哪里获取？',
        timestamp: '10:32',
        status: 'sent',
        platform: 'wechat',
      },
    ];

    setConversations(mockConversations);
    setMessages(mockMessages);
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-900 dark:via-cyan-900 dark:to-teal-900 p-8">
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              消息中心
            </h1>
            <p className="text-xl text-blue-100 mb-6 max-w-2xl">
              实时查看和管理用户对话，支持多平台消息统一管理
            </p>
            <div className="flex gap-3">
              <Button className="bg-white text-blue-600 hover:bg-blue-50">
                <Search className="mr-2 h-4 w-4" />
                搜索消息
              </Button>
              <Button className="bg-white/10 text-white border-white/50 hover:bg-white/20">
                <Filter className="mr-2 h-4 w-4" />
                筛选
              </Button>
              <Button className="bg-white/10 text-white border-white/50 hover:bg-white/20">
                <Archive className="mr-2 h-4 w-4" />
                归档对话
              </Button>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-50">总对话数</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{conversations.length}</div>
              <p className="text-sm text-blue-100 mt-1">进行中</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-cyan-50">未读消息</CardTitle>
              <AlertCircle className="h-4 w-4 text-cyan-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
              </div>
              <p className="text-sm text-cyan-100 mt-1">待处理</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-50">消息总数</CardTitle>
              <Send className="h-4 w-4 text-teal-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{messages.length}</div>
              <p className="text-sm text-teal-100 mt-1">累计</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-50">响应率</CardTitle>
              <CheckCircle className="h-4 w-4 text-indigo-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">98.5%</div>
              <p className="text-sm text-indigo-100 mt-1">本月</p>
            </CardContent>
          </Card>
        </div>

        {/* 消息列表 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 会话列表 */}
          <Card className="border-2 border-blue-100 dark:border-blue-900">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  会话列表
                </CardTitle>
                <Badge variant="secondary">{conversations.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                      selectedConversation === conv.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv.id)}
                  >
                    <div className="flex items-start gap-3">
                      <img src={conv.userAvatar} alt={conv.userName} className="w-10 h-10 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold truncate">{conv.userName}</h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{conv.lastTime}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{conv.lastMessage}</p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive" className="mt-2 text-xs">
                            {conv.unreadCount} 条未读
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 消息详情 */}
          <Card className="lg:col-span-2 border-2 border-cyan-100 dark:border-cyan-900">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-cyan-600" />
                  消息详情
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {selectedConversation ? (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.senderType === 'user'
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'bg-cyan-500 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {msg.senderType === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                          <span className="text-sm font-semibold">{msg.senderName}</span>
                          <span className="text-xs opacity-70">{msg.timestamp}</span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Input
                      placeholder="输入消息..."
                      className="flex-1"
                    />
                    <Button className="bg-cyan-600 hover:bg-cyan-700">
                      <Send className="mr-2 h-4 w-4" />
                      发送
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">选择一个会话查看消息详情</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
