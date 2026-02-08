'use client';

import { useEffect, useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Activity,
  Play,
  Pause,
  Trash2,
  Download,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle,
  Zap,
  Search,
  Wifi,
  WifiOff,
} from 'lucide-react';

// 日志级别
export enum LogLevel {
  VERBOSE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

interface LogEntry {
  id: string;
  robotId: string;
  timestamp: number;
  level: LogLevel;
  tag: string;
  message: string;
  extra: Record<string, any> | null;
  stackTrace: string | null;
  deviceId: string;
}

interface WebSocketMessage {
  type: string;
  message?: string;
  data?: any;
}

export default function LogsStreamPage() {
  const [robotId, setRobotId] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [maxLogs, setMaxLogs] = useState(500);

  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取 Token
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  };

  // 获取 WebSocket 地址
  const getWebSocketUrl = () => {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = getToken();
    return `${protocol}//${host}/api/v1/logs/stream?robotId=${robotId}&token=${token}`;
  };

  // 连接 WebSocket
  const connect = () => {
    if (!robotId) {
      alert('请输入机器人 ID');
      return;
    }

    setConnecting(true);
    const wsUrl = getWebSocketUrl();

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket 连接成功');
        setConnected(true);
        setConnecting(false);

        // 发送订阅消息
        wsRef.current?.send(JSON.stringify({ type: 'subscribe' }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'log') {
            const newLog = message.data;
            setLogs((prev) => {
              const updated = [...prev, newLog];
              // 限制日志数量
              if (updated.length > maxLogs) {
                return updated.slice(-maxLogs);
              }
              return updated;
            });

            // 自动滚动到底部
            if (autoScroll) {
              setTimeout(() => {
                logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          } else if (message.type === 'authenticated') {
            console.log('认证成功:', message.data);
          } else if (message.type === 'pong') {
            // 心跳响应
            console.log('收到心跳响应');
          } else if (message.type === 'config_update') {
            console.log('配置更新:', message.data);
          }
        } catch (error) {
          console.error('解析消息失败:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        setConnecting(false);
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket 连接关闭:', event.code, event.reason);
        setConnected(false);
        setConnecting(false);
        wsRef.current = null;

        // 自动重连（3秒后）
        reconnectTimerRef.current = setTimeout(() => {
          console.log('尝试重新连接...');
          connect();
        }, 3000);
      };
    } catch (error) {
      console.error('创建 WebSocket 连接失败:', error);
      setConnecting(false);
    }
  };

  // 断开连接
  const disconnect = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      // 发送取消订阅消息
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe' }));
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
  };

  // 导出日志
  const exportLogs = () => {
    const text = logs
      .map((log) => {
        const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
        const level = LogLevel[log.level];
        return `[${timestamp}] [${level}] [${log.tag}] ${log.message}`;
      })
      .join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${robotId}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // 获取日志级别信息
  const getLevelInfo = (level: LogLevel) => {
    const levelMap = {
      [LogLevel.VERBOSE]: { label: 'VERBOSE', color: 'bg-gray-500', icon: Activity },
      [LogLevel.DEBUG]: { label: 'DEBUG', color: 'bg-blue-500', icon: Search },
      [LogLevel.INFO]: { label: 'INFO', color: 'bg-green-500', icon: Info },
      [LogLevel.WARN]: { label: 'WARN', color: 'bg-yellow-500', icon: AlertTriangle },
      [LogLevel.ERROR]: { label: 'ERROR', color: 'bg-red-500', icon: AlertTriangle },
      [LogLevel.FATAL]: { label: 'FATAL', color: 'bg-purple-500', icon: Zap },
    };
    return levelMap[level] || { label: 'UNKNOWN', color: 'bg-gray-500', icon: Info };
  };

  // 获取日志统计
  const getLogStats = () => {
    const stats = {
      total: logs.length,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    logs.forEach((log) => {
      if (log.level === LogLevel.INFO) stats.info++;
      else if (log.level === LogLevel.WARN) stats.warn++;
      else if (log.level === LogLevel.ERROR) stats.error++;
      else if (log.level === LogLevel.FATAL) stats.fatal++;
    });

    return stats;
  };

  const stats = getLogStats();

  // 清理
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">实时日志</h1>
            <p className="text-gray-600">实时查看机器人日志推送</p>
          </div>
          <Button asChild variant="outline" className="flex items-center gap-2">
            <a href="/logs">
              <FileText className="w-4 h-4" />
              日志列表
            </a>
          </Button>
        </div>

        {/* 连接配置 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              连接配置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>机器人 ID</Label>
                <Input
                  placeholder="输入机器人 ID"
                  value={robotId}
                  onChange={(e) => setRobotId(e.target.value)}
                  disabled={connected || connecting}
                  className="mt-1"
                />
              </div>

              <div className="flex items-end gap-2">
                {!connected ? (
                  <Button
                    onClick={connect}
                    disabled={connecting || !robotId}
                    className="flex items-center gap-2"
                  >
                    {connecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        连接中...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        开始接收
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={disconnect}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    停止接收
                  </Button>
                )}
              </div>
            </div>

            {/* 连接状态 */}
            <div className="mt-4 flex items-center gap-2">
              {connected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-medium">已连接</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-500">未连接</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 统计信息 */}
        {logs.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-gray-600">总日志数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
                  <div className="text-sm text-gray-600">INFO</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.warn}</div>
                  <div className="text-sm text-gray-600">WARN</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.error}</div>
                  <div className="text-sm text-gray-600">ERROR</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.fatal}</div>
                  <div className="text-sm text-gray-600">FATAL</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 操作按钮 */}
        {logs.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">自动滚动</span>
                </label>

                <div className="flex items-center gap-2">
                  <Label>最大日志数:</Label>
                  <Input
                    type="number"
                    min="100"
                    max="5000"
                    step="100"
                    value={maxLogs}
                    onChange={(e) => setMaxLogs(parseInt(e.target.value) || 500)}
                    className="w-24"
                  />
                </div>

                <div className="flex-1" />

                <Button onClick={clearLogs} variant="outline" className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  清空
                </Button>
                <Button onClick={exportLogs} variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 日志流 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              实时日志流
            </CardTitle>
            <CardDescription>
              {connected ? '正在接收实时日志...' : '请先连接机器人'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-y-auto max-h-[600px]">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  {connected ? '等待日志推送...' : '请先连接机器人'}
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => {
                    const levelInfo = getLevelInfo(log.level);
                    const LevelIcon = levelInfo.icon;

                    return (
                      <div key={`${log.id}-${index}`} className="flex items-start gap-2">
                        <span className="text-gray-500 flex-shrink-0">
                          [{formatTimestamp(log.timestamp)}]
                        </span>
                        <Badge
                          variant="outline"
                          className={`flex-shrink-0 ${levelInfo.color} text-white text-xs`}
                        >
                          {levelInfo.label}
                        </Badge>
                        <Badge variant="secondary" className="flex-shrink-0 text-xs">
                          {log.tag}
                        </Badge>
                        <span className="flex-1 break-all">{log.message}</span>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
