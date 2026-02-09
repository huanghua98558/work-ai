'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
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
  systemPrompt?: string;
  enableKnowledgeBase?: boolean;
  knowledgeDataset?: string;
  enableStreamResponse?: boolean;
  aiMode: 'builtin' | 'third_party';
  aiProvider: string;
  aiModel: string;
  aiApiKey?: string;
  aiTemperature: number;
  aiMaxTokens: number;
  aiContextLength: number;
  aiScenario?: string;
  thirdPartyCallbackUrl?: string;
  thirdPartyResultCallbackUrl?: string;
  thirdPartySecretKey?: string;
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
    // 系统提示
    systemPrompt: '',
    // 知识库配置
    enableKnowledgeBase: false,
    knowledgeDataset: '',
    // 流式回复
    enableStreamResponse: true,
    // AI 模式
    aiMode: 'builtin' as 'builtin' | 'third_party',
    // AI 提供商
    aiProvider: 'doubao',
    // AI 模型
    aiModel: '',
    // API Key
    aiApiKey: '',
    // 温度参数
    temperature: 0.7,
    // 最大 tokens
    maxTokens: 2000,
    // 上下文长度
    contextLength: 10,
    // 场景
    scenario: 'general',
    // 第三方回调 URL
    thirdPartyCallbackUrl: '',
    thirdPartyResultCallbackUrl: '',
    thirdPartySecretKey: '',
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
            aiModel: robot.ai_model || '',
            aiApiKey: robot.ai_api_key || '',
            aiTemperature: parseFloat(robot.ai_temperature) || 0.7,
            aiMaxTokens: robot.ai_max_tokens || 2000,
            aiContextLength: robot.ai_context_length || 10,
            aiScenario: robot.ai_scenario || 'general',
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
      systemPrompt: robot.systemPrompt || '',
      enableKnowledgeBase: robot.enableKnowledgeBase || false,
      knowledgeDataset: robot.knowledgeDataset || '',
      enableStreamResponse: robot.enableStreamResponse !== false,
      aiMode: robot.aiMode || 'builtin',
      aiProvider: robot.aiProvider || 'doubao',
      aiModel: robot.aiModel || '',
      aiApiKey: robot.aiApiKey || '',
      temperature: robot.aiTemperature || 0.7,
      maxTokens: robot.aiMaxTokens || 2000,
      contextLength: robot.aiContextLength || 10,
      scenario: robot.aiScenario || 'general',
      thirdPartyCallbackUrl: robot.thirdPartyCallbackUrl || '',
      thirdPartyResultCallbackUrl: robot.thirdPartyResultCallbackUrl || '',
      thirdPartySecretKey: robot.thirdPartySecretKey || '',
    });
    setConfigDialogOpen(true);
  };

  // 删除机器人
  const [deletingRobotId, setDeletingRobotId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const openDeleteDialog = (robot: Robot) => {
    setSelectedRobot(robot);
    setDeleteDialogOpen(true);
  };

  const handleDeleteRobot = async () => {
    if (!selectedRobot) return;

    try {
      setDeletingRobotId(selectedRobot.robotId);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/robots/${selectedRobot.robotId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "成功",
          description: "机器人已删除",
        });
        setDeleteDialogOpen(false);
        loadRobots();
      } else {
        toast({
          title: "删除失败",
          description: data.error || "删除机器人失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('删除机器人失败:', error);
      toast({
        title: "删除失败",
        description: error.message || "删除机器人失败",
        variant: "destructive",
      });
    } finally {
      setDeletingRobotId(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">加载中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => openDeleteDialog(robot)}
                              disabled={deletingRobotId === robot.robotId}
                            >
                              {deletingRobotId === robot.robotId ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>机器人配置</DialogTitle>
              <DialogDescription>
                配置机器人 {selectedRobot?.robotId}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* AI 模式选择 */}
              <div className="space-y-2">
                <Label className="text-base font-medium">AI 模式</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={configData.aiMode === 'builtin' ? 'default' : 'outline'}
                    onClick={() => setConfigData({ ...configData, aiMode: 'builtin' })}
                    className="flex-1"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    内置模型
                  </Button>
                  <Button
                    type="button"
                    variant={configData.aiMode === 'third_party' ? 'default' : 'outline'}
                    onClick={() => setConfigData({ ...configData, aiMode: 'third_party' })}
                    className="flex-1"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    第三方 API
                  </Button>
                </div>
              </div>

              {/* AI 提供商选择 */}
              {configData.aiMode === 'builtin' && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">AI 提供商</Label>
                  <Select
                    value={configData.aiProvider}
                    onValueChange={(value) => setConfigData({ ...configData, aiProvider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择 AI 提供商" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doubao">豆包 (Doubao)</SelectItem>
                      <SelectItem value="deepseek">DeepSeek</SelectItem>
                      <SelectItem value="kimi">Kimi</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* AI 模型 */}
              <div className="space-y-2">
                <Label className="text-base font-medium">AI 模型</Label>
                <Input
                  placeholder="例如: gpt-3.5-turbo, doubao-pro, deepseek-chat"
                  value={configData.aiModel}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigData({ ...configData, aiModel: e.target.value })}
                />
                <p className="text-xs text-gray-500">留空则使用提供商的默认模型</p>
              </div>

              {/* API Key (第三方模式) */}
              {configData.aiMode === 'third_party' && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">API Key</Label>
                  <Input
                    type="password"
                    placeholder="输入 API Key"
                    value={configData.aiApiKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigData({ ...configData, aiApiKey: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">第三方 API 认证密钥</p>
                </div>
              )}

              {/* 第三方回调 URL */}
              {configData.aiMode === 'third_party' && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">第三方回调配置</Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm">请求回调 URL</Label>
                      <Input
                        placeholder="https://your-api.com/callback"
                        value={configData.thirdPartyCallbackUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigData({ ...configData, thirdPartyCallbackUrl: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">结果回调 URL</Label>
                      <Input
                        placeholder="https://your-api.com/result-callback"
                        value={configData.thirdPartyResultCallbackUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigData({ ...configData, thirdPartyResultCallbackUrl: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">回调密钥</Label>
                      <Input
                        type="password"
                        placeholder="回调验证密钥"
                        value={configData.thirdPartySecretKey}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigData({ ...configData, thirdPartySecretKey: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 场景选择 */}
              <div className="space-y-2">
                <Label className="text-base font-medium">使用场景</Label>
                <Select
                  value={configData.scenario}
                  onValueChange={(value) => setConfigData({ ...configData, scenario: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择使用场景" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">通用</SelectItem>
                    <SelectItem value="consult">咨询服务</SelectItem>
                    <SelectItem value="qa">问答助手</SelectItem>
                    <SelectItem value="chat">闲聊陪伴</SelectItem>
                    <SelectItem value="after-sales">售后支持</SelectItem>
                    <SelectItem value="community">社群管理</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 参数设置 */}
              <div className="space-y-4">
                <Label className="text-base font-medium">参数设置</Label>
                <div className="grid grid-cols-2 gap-4">
                  {/* 温度 */}
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
                      <span>创意</span>
                    </div>
                  </div>

                  {/* 最大 tokens */}
                  <div className="space-y-2">
                    <Label>最大 Tokens</Label>
                    <Input
                      type="number"
                      min="100"
                      max="8000"
                      step="100"
                      value={configData.maxTokens}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigData({ ...configData, maxTokens: parseInt(e.target.value) })}
                    />
                  </div>

                  {/* 上下文长度 */}
                  <div className="space-y-2">
                    <Label>上下文长度</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={configData.contextLength}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigData({ ...configData, contextLength: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-gray-500">保留的对话上下文条数</p>
                  </div>
                </div>
              </div>

              {/* 系统提示 */}
              <div className="space-y-2">
                <Label className="text-base font-medium">系统提示</Label>
                <Textarea
                  placeholder="输入机器人的系统提示，定义机器人的行为和风格..."
                  value={configData.systemPrompt}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfigData({ ...configData, systemPrompt: e.target.value })}
                  rows={4}
                />
              </div>

              {/* 知识库配置 */}
              <div className="space-y-4">
                <Label className="text-base font-medium">知识库配置</Label>
                <div className="flex items-center justify-between">
                  <Label>启用知识库</Label>
                  <Switch
                    checked={configData.enableKnowledgeBase}
                    onCheckedChange={(checked: boolean) => setConfigData({ ...configData, enableKnowledgeBase: checked })}
                  />
                </div>
                {configData.enableKnowledgeBase && (
                  <div className="space-y-2">
                    <Label>知识库数据集 ID</Label>
                    <Input
                      placeholder="输入知识库数据集 ID"
                      value={configData.knowledgeDataset}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigData({ ...configData, knowledgeDataset: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* 流式回复 */}
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">流式回复</Label>
                <Switch
                  checked={configData.enableStreamResponse}
                  onCheckedChange={(checked: boolean) => setConfigData({ ...configData, enableStreamResponse: checked })}
                />
              </div>

              <Button onClick={handleSaveConfig} className="w-full">
                保存配置
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除机器人 <strong>{selectedRobot?.name}</strong> 吗？
                <br />
                机器人 ID: <code>{selectedRobot?.robotId}</code>
                <br />
                此操作不可撤销！
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deletingRobotId !== null}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRobot}
                disabled={deletingRobotId !== null}
              >
                {deletingRobotId ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    删除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    确认删除
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

