'use client';

import { useState, useRef, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  Download,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function AdminAIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '你好！我是管理后台 AI 助手，我可以帮助你进行系统配置、数据分析、问题排查等工作。有什么我可以帮助你的吗？',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('doubao-seed-1-8-251228');
  const [temperature, setTemperature] = useState(0.7);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [cachingEnabled, setCachingEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // 创建一个临时的AI消息用于显示正在输入
    const tempMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      // 准备发送的消息（排除系统提示）
      const messagesToSend = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      // 添加当前用户消息
      messagesToSend.push({
        role: 'user',
        content: userMessage.content,
      });

      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend,
          model: thinkingEnabled ? 'doubao-seed-1-6-thinking-250715' : model,
          temperature,
          thinking: thinkingEnabled ? 'enabled' : 'disabled',
          caching: cachingEnabled ? 'enabled' : 'disabled',
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '发送失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.content) {
                  aiResponse += parsed.content;
                  // 更新最后一条AI消息的内容
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    if (newMessages[lastIndex].role === 'assistant') {
                      newMessages[lastIndex] = {
                        ...newMessages[lastIndex],
                        content: aiResponse,
                      };
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                // 忽略 JSON 解析错误
              }
            }
          }
        }
      }

      if (aiResponse === '') {
        throw new Error('AI响应为空');
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      
      // 移除临时消息
      setMessages((prev) => prev.slice(0, -1));

      // 显示错误消息
      const errorMessage: Message = {
        role: 'assistant',
        content: `抱歉，出现错误：${error.message || '未知错误'}。请稍后重试。`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      toast({
        title: '发送失败',
        description: error.message || '未知错误',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: '对话已清除。有什么我可以帮助你的吗？',
        timestamp: Date.now(),
      },
    ]);
  };

  const handleExport = () => {
    const text = messages
      .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-chat-export-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const models = [
    { id: 'doubao-seed-1-8-251228', name: '豆包通用版' },
    { id: 'doubao-seed-1-6-251015', name: '豆包平衡版' },
    { id: 'doubao-seed-1-6-flash-250615', name: '豆包极速版' },
    { id: 'doubao-seed-1-6-thinking-250715', name: '豆包思考版' },
    { id: 'deepseek-v3-2-251201', name: 'DeepSeek V3.2' },
    { id: 'glm-4-7-251222', name: 'GLM-4-7' },
    { id: 'kimi-k2-250905', name: 'Kimi K2' },
  ];

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* 头部 */}
        <Card className="border-0 shadow-none bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-white">AI 助手</CardTitle>
                  <p className="text-emerald-100 text-sm">管理后台智能助手</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="text-white hover:bg-white/20"
                  disabled={messages.length <= 1}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExport}
                  className="text-white hover:bg-white/20"
                  disabled={messages.length <= 1}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 设置面板 */}
        {showSettings && (
          <Card className="border-0 shadow-none bg-white dark:bg-slate-900">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium">模型选择</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    温度: {temperature.toFixed(1)}
                  </Label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full mt-1"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={thinkingEnabled}
                      onCheckedChange={setThinkingEnabled}
                    />
                    <Label className="text-sm font-medium">思考模式</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cachingEnabled}
                      onCheckedChange={setCachingEnabled}
                    />
                    <Label className="text-sm font-medium">缓存</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 消息列表 */}
        <Card className="flex-1 border-0 shadow-none overflow-hidden">
          <ScrollArea className="h-full px-6 py-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="h-5 w-5 text-white" />
                    ) : (
                      <Bot className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 max-w-[80%]',
                      message.role === 'user'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-2 opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-slate-100 dark:bg-slate-800">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </Card>

        {/* 输入区域 */}
        <Card className="border-0 shadow-none">
          <CardContent className="pt-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入你的消息... (Enter 发送，Shift+Enter 换行)"
                  className="min-h-[80px] max-h-[200px] resize-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  size="icon"
                  className="h-[80px] w-[80px] bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                  {isLoading ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-6 w-6" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                Enter 发送消息 • Shift+Enter 换行 • 支持流式输出
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
