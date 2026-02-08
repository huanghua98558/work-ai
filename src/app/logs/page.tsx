'use client';

import { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Download,
  Radio,
  BarChart3,
  Database,
  Clock,
  TrendingUp,
} from 'lucide-react';

// 日志级别
enum LogLevel {
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
  syncStatus: string;
  syncTime: number;
  deviceId: string;
}

interface LogQueryResponse {
  total: string;
  page: number;
  pageSize: number;
  logs: LogEntry[];
  totalPages: number;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  // 筛选条件
  const [robotId, setRobotId] = useState('');
  const [level, setLevel] = useState<string>('');
  const [tag, setTag] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [keyword, setKeyword] = useState('');

  // 展开详情
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // 获取 Token
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  };

  // 获取日志
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        console.error('No token found');
        return;
      }

      // 构建查询参数
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (robotId) params.append('robotId', robotId);
      if (level) params.append('level', level);
      if (tag) params.append('tag', tag);
      if (startTime) params.append('startTime', new Date(startTime).getTime().toString());
      if (endTime) params.append('endTime', new Date(endTime).getTime().toString());
      if (keyword) params.append('keyword', keyword);

      const response = await fetch(`/api/v1/logs/query?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs);
        setTotal(parseInt(data.data.total));
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('获取日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchLogs();
  }, [page]);

  // 刷新日志
  const handleRefresh = () => {
    setPage(1);
    fetchLogs();
  };

  // 搜索
  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  // 重置筛选
  const handleReset = () => {
    setRobotId('');
    setLevel('');
    setTag('');
    setStartTime('');
    setEndTime('');
    setKeyword('');
    setPage(1);
    fetchLogs();
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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

  // 复制日志
  const handleCopy = (log: LogEntry) => {
    const text = `[${formatTimestamp(log.timestamp)}] [${getLevelInfo(log.level).label}] [${log.tag}] ${log.message}`;
    navigator.clipboard.writeText(text);
  };

  // 日志统计
  const logStats = useMemo(() => {
    const stats = {
      total: logs.length,
      verbose: 0,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
      uniqueRobots: new Set<string>(),
      uniqueTags: new Set<string>(),
    };

    logs.forEach(log => {
      switch (log.level) {
        case LogLevel.VERBOSE:
          stats.verbose++;
          break;
        case LogLevel.DEBUG:
          stats.debug++;
          break;
        case LogLevel.INFO:
          stats.info++;
          break;
        case LogLevel.WARN:
          stats.warn++;
          break;
        case LogLevel.ERROR:
          stats.error++;
          break;
        case LogLevel.FATAL:
          stats.fatal++;
          break;
      }
      if (log.robotId) stats.uniqueRobots.add(log.robotId);
      if (log.tag) stats.uniqueTags.add(log.tag);
    });

    return {
      ...stats,
      uniqueRobots: stats.uniqueRobots.size,
      uniqueTags: stats.uniqueTags.size,
      criticalCount: stats.error + stats.fatal,
    };
  }, [logs]);

  // 导出日志
  const handleExport = () => {
    const csvContent = [
      'Timestamp,Level,Tag,RobotID,Message,Extra',
      ...logs.map(log =>
        `"${formatTimestamp(log.timestamp)}",${getLevelInfo(log.level).label},"${log.tag}","${log.robotId}","${log.message.replace(/"/g, '""')}","${JSON.stringify(log.extra || {}).replace(/"/g, '""')}"`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">总日志数</p>
                  <p className="text-2xl font-bold">{total}</p>
                </div>
                <Database className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">严重错误</p>
                  <p className="text-2xl font-bold">{logStats.criticalCount}</p>
                </div>
                <Zap className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">警告</p>
                  <p className="text-2xl font-bold">{logStats.warn}</p>
                </div>
                <AlertTriangle className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">正常</p>
                  <p className="text-2xl font-bold">{logStats.info}</p>
                </div>
                <CheckCircle className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">机器人</p>
                  <p className="text-2xl font-bold">{logStats.uniqueRobots}</p>
                </div>
                <Radio className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">标签</p>
                  <p className="text-2xl font-bold">{logStats.uniqueTags}</p>
                </div>
                <BarChart3 className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">日志管理</h1>
            <p className="text-gray-600">查看和管理机器人日志</p>
          </div>
          <Button asChild variant="outline" className="flex items-center gap-2">
            <a href="/logs/stream">
              <Radio className="w-4 h-4" />
              实时日志
            </a>
          </Button>
        </div>

        {/* 筛选条件 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              筛选条件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>机器人 ID</Label>
                <Input
                  placeholder="输入机器人 ID"
                  value={robotId}
                  onChange={(e) => setRobotId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>日志级别</Label>
                <Select value={level || 'all'} onValueChange={(val) => setLevel(val === 'all' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择日志级别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部级别</SelectItem>
                    <SelectItem value="0">VERBOSE</SelectItem>
                    <SelectItem value="1">DEBUG</SelectItem>
                    <SelectItem value="2">INFO</SelectItem>
                    <SelectItem value="3">WARN</SelectItem>
                    <SelectItem value="4">ERROR</SelectItem>
                    <SelectItem value="5">FATAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>标签</Label>
                <Input
                  placeholder="输入标签"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>开始时间</Label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>结束时间</Label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>关键词</Label>
                <Input
                  placeholder="搜索关键词"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSearch} className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                搜索
              </Button>
              <Button onClick={handleReset} variant="outline">
                重置
              </Button>
              <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                刷新
              </Button>
              <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                导出
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 统计信息 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="text-gray-600">总日志数：</span>
                <span className="font-semibold">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">页码：</span>
                <span className="font-semibold">{page} / {totalPages}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 日志列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              日志列表
            </CardTitle>
            <CardDescription>
              {loading ? '加载中...' : `共 ${total} 条日志`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                暂无日志数据
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => {
                  const levelInfo = getLevelInfo(log.level);
                  const LevelIcon = levelInfo.icon;

                  return (
                    <div
                      key={log.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* 日志级别图标 */}
                        <div className={`p-2 rounded-lg ${levelInfo.color} text-white`}>
                          <LevelIcon className="w-5 h-5" />
                        </div>

                        {/* 日志信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline">{levelInfo.label}</Badge>
                            <Badge variant="secondary">{log.tag}</Badge>
                            <span className="text-sm text-gray-500">{formatTimestamp(log.timestamp)}</span>
                          </div>
                          <p className="text-gray-900 break-all">{log.message}</p>

                          {/* 展开详情 */}
                          {expandedLogId === log.id && (
                            <div className="mt-3 p-3 bg-gray-100 rounded-lg space-y-2">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="font-semibold">ID:</span> {log.id}
                                </div>
                                <div>
                                  <span className="font-semibold">Robot ID:</span> {log.robotId}
                                </div>
                                <div>
                                  <span className="font-semibold">Device ID:</span> {log.deviceId}
                                </div>
                                <div>
                                  <span className="font-semibold">Sync Status:</span> {log.syncStatus}
                                </div>
                              </div>

                              {log.extra && Object.keys(log.extra).length > 0 && (
                                <div className="text-sm">
                                  <span className="font-semibold">Extra:</span>
                                  <pre className="mt-1 p-2 bg-white rounded overflow-x-auto text-xs">
                                    {JSON.stringify(log.extra, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.stackTrace && (
                                <div className="text-sm">
                                  <span className="font-semibold">Stack Trace:</span>
                                  <pre className="mt-1 p-2 bg-white rounded overflow-x-auto text-xs">
                                    {log.stackTrace}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          >
                            {expandedLogId === log.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(log)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <span className="text-sm text-gray-600">
                  第 {page} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
