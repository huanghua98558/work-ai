'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Power, Settings, Activity } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Robot {
  id: number;
  robotId: string;
  activationCode: string;
  deviceId: string | null;
  status: 'active' | 'inactive';
  lastActiveAt: string;
  createdAt: string;
}

export default function RobotsPage() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [configData, setConfigData] = useState({
    systemPrompt: '',
    enableKnowledgeBase: true,
    knowledgeDataset: 'workbot_knowledge',
    enableStreamResponse: true,
    temperature: 0.7,
  });

  useEffect(() => {
    loadRobots();
  }, []);

  const loadRobots = async () => {
    try {
      const response = await apiClient.get<{ robots: Robot[] }>('/api/robots');
      if (response.data?.robots) {
        setRobots(response.data.robots);
      }
    } catch (error) {
      console.error('加载机器人失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (robotId: string) => {
    try {
      await apiClient.post(`/api/robots/${robotId}/toggle`, {});
      await loadRobots();
    } catch (error: any) {
      alert(error.message || '操作失败');
    }
  };

  const openConfigDialog = (robot: Robot) => {
    setSelectedRobot(robot);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedRobot) return;

    try {
      await apiClient.put(`/api/robots/${selectedRobot.robotId}/config`, configData);
      setConfigDialogOpen(false);
      alert('配置保存成功');
    } catch (error: any) {
      alert(error.message || '保存失败');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">机器人管理</h1>
          <p className="text-slate-500">管理所有机器人设备</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>机器人列表</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">加载中...</div>
            ) : robots.length === 0 ? (
              <div className="text-center py-8 text-slate-500">暂无机器人</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>机器人 ID</TableHead>
                    <TableHead>设备 ID</TableHead>
                    <TableHead>激活码</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最后活跃</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {robots.map((robot) => (
                    <TableRow key={robot.id}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          {robot.robotId}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {robot.deviceId || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {robot.activationCode}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              robot.status === 'active' ? 'bg-green-500' : 'bg-slate-400'
                            }`}
                          />
                          <span className="text-sm">
                            {robot.status === 'active' ? '活跃' : '未激活'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {robot.lastActiveAt
                          ? new Date(robot.lastActiveAt).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggle(robot.robotId)}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openConfigDialog(robot)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
