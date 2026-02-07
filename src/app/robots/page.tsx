'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import {
  Bot,
  Power,
  Settings,
  Activity,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  MessageSquare,
  Zap,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface Robot {
  id: number;
  robotId: string;
  name: string;
  nickname?: string;
  status: 'online' | 'offline';
  aiMode: 'builtin' | 'third_party';
  aiProvider: string;
  totalMessages: number;
  lastActiveAt: string;
  createdAt: string;
  boundAt: string;
}

export default function RobotsPage() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [configData, setConfigData] = useState({
    systemPrompt: '',
    enableKnowledgeBase: false,
    knowledgeDataset: '',
    enableStreamResponse: true,
    temperature: 0.7,
  });

  // 加载机器人列表
  const loadRobots = async () => {
    try {
      setRefreshing(true);

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('未登录');
        window.location.href = '/login';
        return;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      console.log('开始加载机器人列表...');
      const response = await fetch('/api/robots', { headers });
      const data = await response.json();

      console.log('机器人列表API响应:', data);

      if (data.success && data.data) {
        console.log('机器人数量:', data.data.length);

        // 转换API数据为页面需要的格式
        const formattedRobots = data.data.map((robot: any, index: number) => {
          const formatted = {
            id: robot.id,
            robotId: robot.bot_id || robot.robotId,
            name: robot.name,
            nickname: robot.user_nickname || robot.name,
            status: robot.status === 'online' ? 'online' : 'offline',
            aiMode: robot.ai_mode || 'builtin',
            aiProvider: robot.ai_provider || 'doubao',
            totalMessages: robot.total_messages || 0,
            lastActiveAt: robot.last_active_at ? new Date(robot.last_active_at).toLocaleDateString('zh-CN') : '-',
            createdAt: new Date(robot.created_at).toLocaleDateString('zh-CN'),
            boundAt: robot.bound_at ? new Date(robot.bound_at).toLocaleDateString('zh-CN') : '-',
          };
          console.log(`机器人[${index}]:`, formatted);
          return formatted;
        });

        console.log('设置机器人列表:', formattedRobots.length, '个');
        setRobots(formattedRobots);
      } else {
        console.error('API返回失败:', data);
      }
    } catch (error) {
      console.error('加载机器人列表失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRobots();
  }, []);

  // 每次页面显示时重新加载数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadRobots();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleSaveConfig = () => {
    console.log('Saving config:', configData);
    setConfigDialogOpen(false);
  };

  const openConfigDialog = (robot: Robot) => {
    setSelectedRobot(robot);
    setConfigData({
      systemPrompt: '',
      enableKnowledgeBase: false,
      knowledgeDataset: '',
      enableStreamResponse: true,
      temperature: 0.7,
    });
    setConfigDialogOpen(true);
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900 p-8">
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              机器人管理
            </h1>
            <p className="text-xl text-blue-100 mb-6 max-w-2xl">
              管理您的多平台机器人，支持企业微信、微信、小程序等多个平台
            </p>
            <Link href="/robots/create">
              <Button className="bg-white text-blue-600 hover:bg-blue-50">
                <Plus className="mr-2 h-4 w-4" />
                创建新机器人
              </Button>
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-50">总数</CardTitle>
              <Bot className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{robots.length}</div>
              <p className="text-sm text-blue-100 mt-1">已创建</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-50">在线</CardTitle>
              <Activity className="h-4 w-4 text-green-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {robots.filter(r => r.status === 'online').length}
              </div>
              <p className="text-sm text-green-100 mt-1">运行中</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-50">总消息</CardTitle>
              <MessageSquare className="h-4 w-4 text-purple-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {robots.reduce((sum, r) => sum + r.totalMessages, 0).toLocaleString()}
              </div>
              <p className="text-sm text-purple-100 mt-1">累计处理</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-50">AI 模型</CardTitle>
              <Zap className="h-4 w-4 text-orange-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">3</div>
              <p className="text-sm text-orange-100 mt-1">已集成</p>
            </CardContent>
          </Card>
        </div>

        {/* 机器人列表 */}
        <Card className="border-2 border-blue-100 dark:border-blue-900">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  机器人列表
                </CardTitle>
                <CardDescription>管理所有已创建的机器人</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadRobots()}
                disabled={loading || refreshing}
                className="bg-white dark:bg-gray-800"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? '刷新中...' : '刷新'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {robots.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300 mb-4">暂无机器人</p>
                <Link href="/robots/create">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    绑定第一个机器人
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>机器人ID</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>消息数</TableHead>
                      <TableHead>最后活跃</TableHead>
                      <TableHead>绑定时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {robots.map((robot) => (
                      <TableRow key={robot.id}>
                        <TableCell className="font-medium">
                          {robot.nickname && robot.nickname !== robot.name ? (
                            <div>
                              <div className="font-medium">{robot.nickname}</div>
                              <div className="text-xs text-gray-500">{robot.name}</div>
                            </div>
                          ) : (
                            robot.name
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {robot.robotId}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={robot.status === 'online' ? 'default' : 'secondary'}>
                            {robot.status === 'online' ? (
                              <span className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                在线
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                离线
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{robot.totalMessages.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            {robot.lastActiveAt}
                          </div>
                        </TableCell>
                        <TableCell>{robot.boundAt}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600"
                              onClick={() => openConfigDialog(robot)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-green-600">
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Config Dialog */}
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>机器人配置</DialogTitle>
              <DialogDescription>
                配置机器人 {selectedRobot?.robotId}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>系统提示</Label>
                <Textarea
                  placeholder="输入机器人的系统提示..."
                  value={configData.systemPrompt}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfigData({ ...configData, systemPrompt: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>启用知识库</Label>
                <Switch
                  checked={configData.enableKnowledgeBase}
                  onCheckedChange={(checked: boolean) => setConfigData({ ...configData, enableKnowledgeBase: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>知识库数据集</Label>
                <Input
                  value={configData.knowledgeDataset}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigData({ ...configData, knowledgeDataset: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>流式回复</Label>
                <Switch
                  checked={configData.enableStreamResponse}
                  onCheckedChange={(checked: boolean) => setConfigData({ ...configData, enableStreamResponse: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>温度 ({configData.temperature})</Label>
                <Input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={configData.temperature}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigData({ ...configData, temperature: parseFloat(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>保守</span>
                  <span>平衡</span>
                  <span>创意</span>
                </div>
              </div>

              <Button onClick={handleSaveConfig} className="w-full">
                保存配置
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
