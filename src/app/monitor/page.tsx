'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface LogEntry {
  requestId: string;
  level: string;
  category: string;
  code?: string;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    database: 'up' | 'down';
    websocket: 'up' | 'down';
    knowledge: 'up' | 'down';
    ai: 'up' | 'down';
  };
  uptime: number;
  activeConnections: number;
}

export default function MonitorPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [logLevel, setLogLevel] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadData();
  }, [logLevel, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadLogs(), loadHealth()]);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await apiClient.get<{ logs: LogEntry[] }>(
        `/api/logs?page=${page}&limit=${limit}${logLevel !== 'all' ? `&level=${logLevel}` : ''}`
      );
      if (response.data?.logs) {
        setLogs(response.data.logs);
      }
    } catch (error) {
      console.error('加载日志失败:', error);
    }
  };

  const loadHealth = async () => {
    try {
      const response = await apiClient.get<HealthStatus>('/api/monitor/health');
      if (response.data) {
        setHealth(response.data);
      }
    } catch (error) {
      console.error('加载健康状态失败:', error);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'debug':
        return <Clock className="h-4 w-4 text-slate-500" />;
      default:
        return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-slate-500';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days} 天 ${hours} 小时`;
    } else if (hours > 0) {
      return `${hours} 小时 ${minutes} 分钟`;
    } else {
      return `${minutes} 分钟`;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">系统监控</h1>
            <p className="text-slate-500">监控系统运行状态和日志</p>
          </div>
          <Button onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* Health Status Cards */}
        {health && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">系统状态</CardTitle>
                {health.status === 'healthy' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : health.status === 'degraded' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {health.status === 'healthy' ? '正常' : health.status === 'degraded' ? '降级' : '异常'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  运行时间: {formatUptime(health.uptime)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">数据库</CardTitle>
                <CheckCircle className={`h-4 w-4 ${getStatusColor(health.services.database)}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {health.services.database === 'up' ? '运行中' : '异常'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">WebSocket</CardTitle>
                <CheckCircle className={`h-4 w-4 ${getStatusColor(health.services.websocket)}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {health.services.websocket === 'up' ? '运行中' : '异常'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  活跃连接: {health.activeConnections}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">AI 服务</CardTitle>
                <CheckCircle className={`h-4 w-4 ${getStatusColor(health.services.ai)}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {health.services.ai === 'up' ? '运行中' : '异常'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Logs */}
        <Card>
          <CardHeader>
            <CardTitle>错误日志</CardTitle>
            <CardDescription>查看系统运行日志</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Select value={logLevel} onValueChange={setLogLevel}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部级别</SelectItem>
                    <SelectItem value="error">错误</SelectItem>
                    <SelectItem value="warn">警告</SelectItem>
                    <SelectItem value="info">信息</SelectItem>
                    <SelectItem value="debug">调试</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-slate-500">
                  第 {page} 页
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">暂无日志</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">级别</TableHead>
                      <TableHead className="w-[150px]">时间</TableHead>
                      <TableHead className="w-[120px]">分类</TableHead>
                      <TableHead>消息</TableHead>
                      <TableHead className="w-[120px]">请求 ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.requestId}>
                        <TableCell>{getLevelIcon(log.level)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">{log.category}</TableCell>
                        <TableCell>
                          <div className="text-sm max-w-md truncate">
                            {log.message}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.requestId.slice(-8)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={logs.length < limit}
                >
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
