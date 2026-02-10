'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: string;
  components: {
    database: {
      status: string;
      message: string;
      stats: {
        totalCount: number;
        idleCount: number;
        waitingCount: number;
      } | null;
    };
    cache: {
      status: string;
      stats: {
        size: number;
        hits: number;
        misses: number;
      };
    };
    memory: {
      heapUsed: string;
      heapTotal: string;
      rss: string;
    };
    system: {
      uptime: string;
      nodeVersion: string;
      platform: string;
    };
  };
}

export default function MonitorPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadHealthStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('加载健康状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthStatus();

    // 每 30 秒自动刷新
    const interval = setInterval(loadHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === 'healthy') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          健康
        </Badge>
      );
    } else if (status === 'degraded') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          警告
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          异常
        </Badge>
      );
    }
  };

  if (!health) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">系统监控</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              WorkBot 系统健康状态监控
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <Clock className="h-4 w-4 mr-2" />
                最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
              </div>
            )}
            <Button onClick={loadHealthStatus} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* 总体状态 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>系统状态</CardTitle>
              {getStatusBadge(health.status)}
            </div>
            <CardDescription>
              响应时间: {health.responseTime} | 更新时间: {new Date(health.timestamp).toLocaleString('zh-CN')}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* 组件状态 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 数据库状态 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  数据库
                </CardTitle>
                {getStatusBadge(health.components.database.status)}
              </div>
              <CardDescription>{health.components.database.message}</CardDescription>
            </CardHeader>
            {health.components.database.stats && (
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">总连接数</span>
                    <span className="font-medium">{health.components.database.stats.totalCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">空闲连接</span>
                    <span className="font-medium">{health.components.database.stats.idleCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">等待连接</span>
                    <span className="font-medium">{health.components.database.stats.waitingCount}</span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 缓存状态 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  缓存
                </CardTitle>
                {getStatusBadge(health.components.cache.status)}
              </div>
              <CardDescription>内存缓存统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">缓存数量</span>
                  <span className="font-medium">{health.components.cache.stats.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">命中次数</span>
                  <span className="font-medium text-green-600">{health.components.cache.stats.hits}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">未命中次数</span>
                  <span className="font-medium text-red-600">{health.components.cache.stats.misses}</span>
                </div>
                {health.components.cache.stats.hits > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">命中率</span>
                    <span className="font-medium">
                      {((health.components.cache.stats.hits / (health.components.cache.stats.hits + health.components.cache.stats.misses)) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 内存状态 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                内存使用
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">堆内存使用</span>
                  <span className="font-medium">{health.components.memory.heapUsed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">堆内存总量</span>
                  <span className="font-medium">{health.components.memory.heapTotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">常驻内存</span>
                  <span className="font-medium">{health.components.memory.rss}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 系统信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                系统信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">运行时间</span>
                  <span className="font-medium">{health.components.system.uptime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Node 版本</span>
                  <span className="font-medium">{health.components.system.nodeVersion}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">平台</span>
                  <span className="font-medium">{health.components.system.platform}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
