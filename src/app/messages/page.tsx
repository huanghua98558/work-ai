'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, User, Send, Bot as BotIcon } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Message {
  id: number;
  robotId: string;
  userId: string;
  sessionId: string;
  messageType: string;
  content: string;
  status: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
}

interface Session {
  sessionId: string;
  robotId: string;
  userId: string;
  messageCount: number;
  lastMessageAt: string;
}

export default function MessagesPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendMessage, setSendMessage] = useState('');
  const [robotId, setRobotId] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession);
    }
  }, [selectedSession]);

  const loadSessions = async () => {
    try {
      const response = await apiClient.get<{ sessions: Session[] }>('/api/sessions/list?limit=50');
      if (response.data?.sessions) {
        setSessions(response.data.sessions);
      }
    } catch (error) {
      console.error('加载会话失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await apiClient.get<{ messages: Message[] }>(`/api/messages/list?sessionId=${sessionId}`);
      if (response.data?.messages) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!sendMessage.trim() || !robotId) return;

    try {
      await apiClient.post('/api/messages/send', {
        robotId,
        messageType: 'text',
        content: sendMessage,
        sessionId: selectedSession || undefined,
      });
      setSendMessage('');
      if (selectedSession) {
        await loadMessages(selectedSession);
      }
    } catch (error: any) {
      alert(error.message || '发送失败');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">消息中心</h1>
          <p className="text-slate-500">查看和管理所有消息</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Session List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">会话列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">加载中...</div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">暂无会话</div>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.sessionId}
                      onClick={() => {
                        setSelectedSession(session.sessionId);
                        setRobotId(session.robotId);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedSession === session.sessionId
                          ? 'bg-slate-100 border-slate-300'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            会话 {session.sessionId.slice(-8)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {session.messageCount} 条消息
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(session.lastMessageAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">
                消息记录
                {selectedSession && (
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    - {selectedSession.slice(-8)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedSession ? (
                <div className="text-center py-8 text-slate-500">
                  请选择一个会话查看消息
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  暂无消息
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`flex gap-2 max-w-[70%] ${
                          message.direction === 'outgoing' ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            message.direction === 'outgoing'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {message.direction === 'outgoing' ? (
                            <BotIcon className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`rounded-lg p-3 ${
                            message.direction === 'outgoing'
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100'
                          }`}
                        >
                          <div className="text-sm">{message.content}</div>
                          <div
                            className={`text-xs mt-1 ${
                              message.direction === 'outgoing'
                                ? 'text-blue-100'
                                : 'text-slate-400'
                            }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Send Message */}
              {selectedSession && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入消息..."
                      value={sendMessage}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSendMessage(e.target.value)}
                      onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
