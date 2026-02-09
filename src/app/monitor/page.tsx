'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Database,
  Wifi,
  Zap,
  Cpu,
  HardDrive,
  Server,
  TrendingUp,
  TrendingDown,
  XCircle,
  Play,
  Pause,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface LogEntry {
  requestId: string;
  level: 'error' | 'warn' | 'info' | 'debug';
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
  resources: {
    memory: {
      used: number;
      total: number;
      percent: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
  };
  performance: {
    avgResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
  };
}

export default function MonitorPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [logLevel, setLogLevel] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // 5秒
  const limit = 20;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadLogs(), loadHealth()]);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [logLevel, page]);

  const loadLogs = async () => {
    try {
      const response = await apiClient.get<{ logs: LogEntry[]; pagination: { total: number } }>(
        `/api/logs?page=${page}&limit=${limit}${logLevel !== 'all' ? `&level=${logLevel}` : ''}`
      );
      if (response.data?.logs) {
        setLogs(response.data.logs);
        setTotalLogs(response.data.pagination.total);
      }
    } catch (error) {
      console.error('加载日志失败:', error);
    }
  };

  const loadHealth = async () => {
    try {
      const response = await apiClient.get<{ data: HealthStatus; issues: string[] }>('/api/monitor/health');
      if (response.data) {
        setHealth(response.data.data);
        setIssues(response.data.issues || []);
      }
    } catch (error) {
      console.error('加载健康状态失败:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadHealth(); // 只刷新健康状态，不刷新日志
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadHealth]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
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

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>;
      case 'warn':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">WARN</Badge>;
      case 'info':
        return <Badge className="bg-blue-500 hover:bg-blue-600">INFO</Badge>;
      case 'debug':
        return <Badge variant="outline">DEBUG</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
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
      return `${days}天 ${hours}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 - 使用渐变背景 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 dark:from-teal-900 dark:via-cyan-900 dark:to-blue-900 p-8">
          <div className="relative">
            <div className="inline-block px-4 py-2 mb-4 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <span className="text-white/90 text-sm font-medium">实时监控系统状态和性能</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              系统监控
            </h1>
            <p className="text-xl text-teal-100 mb-6 max-w-2xl">
              监控系统运行状态、资源使用情况和日志信息，确保系统稳定运行
            </p>
            <div className="flex gap-3 items-center">
              <Button onClick={loadData} disabled={loading} className="bg-white text-teal-600 hover:bg-teal-50">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-white/20 text-white border-white/50 hover:bg-white/30' : 'bg-transparent text-white border-white/50 hover:bg-white/10'}
              >
                {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {autoRefresh ? '暂停刷新' : '开启刷新'}
              </Button>
              {autoRefresh && (
                <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(parseInt(v))}>
                  <SelectTrigger className="w-[140px] bg-white/20 text-white border-white/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 秒</SelectItem>
                    <SelectItem value="5">5 秒</SelectItem>
                    <SelectItem value="10">10 秒</SelectItem>
                    <SelectItem value="30">30 秒</SelectItem>
                    <SelectItem value="60">1 分钟</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {/* 系统状态概览 */}
        {health && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 系统整体状态 */}
            <Card className="border-2 border-teal-100 dark:border-teal-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
                <CardTitle className="text-sm font-medium">系统状态</CardTitle>
                {health.status === 'healthy' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : health.status === 'degraded' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {health.status === 'healthy' ? (
                    <span className="text-green-600">正常</span>
                  ) : health.status === 'degraded' ? (
                    <span className="text-yellow-600">降级</span>
                  ) : (
                    <span className="text-red-600">异常</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  运行时间: {formatUptime(health.uptime)}
                </div>
              </CardContent>
            </Card>

            {/* 数据库状态 */}
            <Card className="border-2 border-blue-100 dark:border-blue-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardTitle className="text-sm font-medium">数据库</CardTitle>
                <Database className={`h-4 w-4 ${getStatusColor(health.services.database)}`} />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {health.services.database === 'up' ? (
                    <span className="text-green-600">运行中</span>
                  ) : (
                    <span className="text-red-600">异常</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  PostgreSQL 18
                </div>
              </CardContent>
            </Card>

            {/* WebSocket 状态 */}
            <Card className="border-2 border-purple-100 dark:border-purple-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                <CardTitle className="text-sm font-medium">WebSocket</CardTitle>
                <Wifi className={`h-4 w-4 ${getStatusColor(health.services.websocket)}`} />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {health.services.websocket === 'up' ? (
                    <span className="text-green-600">运行中</span>
                  ) : (
                    <span className="text-red-600">异常</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  活跃连接: {health.activeConnections}
                </div>
              </CardContent>
            </Card>

            {/* AI 服务状态 */}
            <Card className="border-2 border-orange-100 dark:border-orange-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
                <CardTitle className="text-sm font-medium">AI 服务</CardTitle>
                <Zap className={`h-4 w-4 ${getStatusColor(health.services.ai)}`} />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {health.services.ai === 'up' ? (
                    <span className="text-green-600">运行中</span>
                  ) : (
                    <span className="text-red-600">异常</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  大语言模型
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 系统资源监控 */}
        {health && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 内存使用 */}
            <Card className="border-2 border-indigo-100 dark:border-indigo-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <CardTitle className="text-sm font-medium">内存使用</CardTitle>
                <Cpu className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold mb-2">
                  {health.resources.memory.used} MB
                </div>
                <Progress value={health.resources.memory.percent} className="h-2 mb-2" />
                <div className="text-xs text-slate-500">
                  总计 {health.resources.memory.total} MB · 使用率 {health.resources.memory.percent}%
                </div>
              </CardContent>
            </Card>

            {/* CPU 使用 */}
            <Card className="border-2 border-cyan-100 dark:border-cyan-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20">
                <CardTitle className="text-sm font-medium">CPU 使用</CardTitle>
                <Server className="h-4 w-4 text-cyan-600" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold mb-2">
                  {health.resources.cpu.usage}%
                </div>
                <Progress value={health.resources.cpu.usage} className="h-2 mb-2" />
                <div className="text-xs text-slate-500">
                  负载: {health.resources.cpu.loadAverage.join(', ')}
                </div>
              </CardContent>
            </Card>

            {/* 性能指标 */}
            <Card className="border-2 border-emerald-100 dark:border-emerald-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                <CardTitle className="text-sm font-medium">性能指标</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-500">响应时间</div>
                    <div className="text-xl font-bold">{health.performance.avgResponseTime}ms</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">请求/分钟</div>
                    <div className="text-xl font-bold">{health.performance.requestsPerMinute}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-slate-500">错误率</div>
                    <div className="text-xl font-bold">
                      {health.performance.errorRate}%
                      {health.performance.errorRate > 1 ? (
                        <TrendingUp className="inline h-4 w-4 text-red-500 ml-1" />
                      ) : (
                        <TrendingDown className="inline h-4 w-4 text-green-500 ml-1" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 问题列表 */}
        {issues.length > 0 && (
          <Card className="border-2 border-red-100 dark:border-red-900">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                检测到的问题
              </CardTitle>
              <CardDescription>需要关注的系统问题</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                {issues.map((issue, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700 dark:text-red-300">{issue}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 系统日志 */}
        <Card className="border-2 border-slate-100 dark:border-slate-900">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-600" />
              系统日志
            </CardTitle>
            <CardDescription>查看系统运行日志</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* 日志过滤和控制 */}
              <div className="flex items-center justify-between">
                <Select value={logLevel} onValueChange={(value) => { setLogLevel(value); setPage(1); }}>
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
                <div className="flex items-center gap-4">
                  <div className="text-sm text-slate-500">
                    共 {totalLogs} 条记录 · 第 {page} 页
                  </div>
                </div>
              </div>

              {/* 日志表格 */}
              {loading && page === 1 ? (
                <div className="text-center py-8">加载中...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">暂无日志</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">级别</TableHead>
                      <TableHead className="w-[150px]">时间</TableHead>
                      <TableHead className="w-[120px]">分类</TableHead>
                      <TableHead>消息</TableHead>
                      <TableHead className="w-[150px]">请求 ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.requestId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getLevelIcon(log.level)}
                            {getLevelBadge(log.level)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(log.timestamp).toLocaleString('zh-CN')}
                        </TableCell>
                        <TableCell className="text-sm">{log.category}</TableCell>
                        <TableCell>
                          <div className="text-sm max-w-md">
                            {log.message}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {log.requestId.slice(-12)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* 分页控制 */}
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
    </AdminLayout>
  );
}
