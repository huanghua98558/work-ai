'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
  Activity,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
} from 'lucide-react';

interface OnlineRobot {
  robotId: string;
  status: 'online' | 'offline';
  connectedAt: string;
}

interface WebSocketMonitorData {
  totalConnections: number;
  onlineRobots: OnlineRobot[];
  serverStatus: 'running' | 'stopped';
  timestamp: string;
}

export default function WebSocketMonitorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WebSocketMonitorData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchData();
    // 自动刷新
    const interval = setInterval(() => {
      fetchData();
    }, 5000); // 每 5 秒刷新一次

    return () => clearInterval(interval);
  }, [router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/websocket/monitor', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast({
          title: '错误',
          description: result.error || '获取数据失败',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      toast({
        title: '错误',
        description: '获取数据失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getConnectionDuration = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}秒`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟`;
    return `${Math.floor(diff / 3600)}小时`;
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Wifi className="h-8 w-8 text-yellow-600" />
              WebSocket 监控中心
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              实时监控 WebSocket 连接状态和在线机器人
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '刷新中...' : '刷新'}
          </Button>
        </div>

        {/* 服务器状态卡片 */}
        <Card className="border-2 border-yellow-100 dark:border-yellow-900">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-yellow-600" />
              服务器状态
            </CardTitle>
            <CardDescription>WebSocket 服务器运行状态</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    data?.serverStatus === 'running'
                      ? 'bg-green-100 dark:bg-green-900'
                      : 'bg-red-100 dark:bg-red-900'
                  }`}
                >
                  {data?.serverStatus === 'running' ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">服务器状态</div>
                  <div className="text-lg font-semibold">
                    {data?.serverStatus === 'running' ? '运行中' : '已停止'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">连接数</div>
                  <div className="text-lg font-semibold">{data?.totalConnections || 0}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">最后更新</div>
                  <div className="text-lg font-semibold">
                    {data?.timestamp ? formatTime(data.timestamp) : '-'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 在线机器人列表 */}
        <Card className="border-2 border-green-100 dark:border-green-900">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-green-600" />
                  在线机器人
                </CardTitle>
                <CardDescription>当前在线的机器人列表</CardDescription>
              </div>
              <Badge
                variant="default"
                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
              >
                {data?.onlineRobots.length || 0} 台在线
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {data && data.onlineRobots.length > 0 ? (
              <div className="space-y-3">
                {data.onlineRobots.map((robot) => (
                  <div
                    key={robot.robotId}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Wifi className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {robot.robotId}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          连接时长: {getConnectionDuration(robot.connectedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                      >
                        在线
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/robots?robotId=${robot.robotId}`)}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <WifiOff className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  暂无在线机器人
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  当前没有机器人连接到 WebSocket 服务器
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 连接说明 */}
        <Card className="bg-gradient-to-br from-yellow-500 to-amber-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">WebSocket 连接信息</h3>
                <div className="space-y-1 text-sm text-yellow-100">
                  <p>• 服务器地址: <code className="bg-white/20 px-2 py-1 rounded">ws://localhost:5000/ws</code></p>
                  <p>• 认证参数: <code className="bg-white/20 px-2 py-1 rounded">robotId</code> 和 <code className="bg-white/20 px-2 py-1 rounded">token</code></p>
                  <p>• 心跳间隔: 30 秒</p>
                  <p>• 认证超时: 30 秒</p>
                  <p>• 心跳超时: 60 秒</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
