'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, XCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface ErrorLog {
  id: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, any>;
}

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/errors?limit=100');
      const data = await response.json();

      if (data.success) {
        setErrors(data.data.errors);
      } else {
        console.error('Failed to fetch errors:', data.error);
      }
    } catch (error) {
      console.error('Error fetching errors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
    // 每 30 秒自动刷新
    const interval = setInterval(fetchErrors, 30000);
    return () => clearInterval(interval);
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6">
        {/* 头部 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              系统错误监控
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              实时查看和分析系统错误日志
            </p>
          </div>
          <Button
            onClick={fetchErrors}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* 统计信息 */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总错误数</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{errors.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">错误</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {errors.filter(e => e.level === 'error').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">警告</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {errors.filter(e => e.level === 'warn').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 错误列表 */}
        <Card>
          <CardHeader>
            <CardTitle>错误日志</CardTitle>
            <CardDescription>
              最近的系统错误和警告信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && errors.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : errors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  暂无错误
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  系统运行正常，没有检测到任何错误
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {errors.map((error) => (
                  <Alert
                    key={error.id}
                    variant={error.level === 'error' ? 'destructive' : 'default'}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedError(error)}
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant={getLevelColor(error.level) as any} className="mt-0.5">
                        <div className="flex items-center gap-1">
                          {getLevelIcon(error.level)}
                          {error.level.toUpperCase()}
                        </div>
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{error.message}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(error.timestamp)}
                          </span>
                        </div>
                        {error.context && Object.keys(error.context).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {Object.entries(error.context)
                              .slice(0, 2)
                              .map(([key, value]) => (
                                <span key={key} className="mr-2">
                                  {key}: {String(value).slice(0, 50)}
                                  {String(value).length > 50 && '...'}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 错误详情对话框 */}
        {selectedError && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSelectedError(null)}
          >
            <Card
              className="max-w-4xl w-full max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getLevelIcon(selectedError.level)}
                      {selectedError.level.toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                      {formatTimestamp(selectedError.timestamp)}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedError(null)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 消息 */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold">错误消息</h3>
                  <Alert variant={selectedError.level === 'error' ? 'destructive' : 'default'}>
                    <AlertDescription>{selectedError.message}</AlertDescription>
                  </Alert>
                </div>

                {/* 堆栈跟踪 */}
                {selectedError.stack && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">堆栈跟踪</h3>
                    <pre className="overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-800 p-4 text-xs font-mono">
                      {selectedError.stack}
                    </pre>
                  </div>
                )}

                {/* 上下文 */}
                {selectedError.context && Object.keys(selectedError.context).length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">上下文信息</h3>
                    <div className="overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-800 p-4">
                      <table className="w-full text-sm">
                        <tbody>
                          {Object.entries(selectedError.context).map(([key, value]) => (
                            <tr key={key} className="border-t border-slate-200 dark:border-slate-700">
                              <td className="py-2 pr-4 font-medium">{key}</td>
                              <td className="py-2 font-mono text-xs break-all">
                                {typeof value === 'object'
                                  ? JSON.stringify(value, null, 2)
                                  : String(value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
