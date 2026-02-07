'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Save,
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Brain,
  Database,
  Zap,
  MessageSquare,
  Clock,
  Shield,
} from 'lucide-react';

interface Robot {
  id: number;
  bot_id: string;
  name: string;
  description: string;
  status: 'online' | 'offline';
  created_at: string;
  updated_at: string;
}

interface RobotConfig {
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  enableStream: boolean;
  enableMemory: boolean;
  memoryLimit: number;
  aiProvider: string;
  model: string;
}

interface KnowledgeFile {
  id: number;
  name: string;
  size: number;
  uploaded_at: string;
}

export default function RobotConfigPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [robot, setRobot] = useState<Robot | null>(null);
  const [config, setConfig] = useState<RobotConfig>({
    systemPrompt: '',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2000,
    enableStream: true,
    enableMemory: true,
    memoryLimit: 10,
    aiProvider: 'doubao',
    model: 'gpt-4',
  });
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);

  // 获取robotId
  const robotId = router.query?.id || typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : '';

  useEffect(() => {
    if (!robotId) {
      toast({
        title: '错误',
        description: '缺少机器人ID',
        variant: 'destructive',
      });
      router.push('/robots');
      return;
    }
    loadRobotData();
  }, [robotId]);

  const loadRobotData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // 加载机器人信息
      const robotRes = await fetch(`/api/robots/${robotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const robotData = await robotRes.json();

      if (robotData.success) {
        setRobot(robotData.data);
      }

      // 加载配置（这里暂时用模拟数据）
      setConfig({
        systemPrompt: '你是一个智能助手，请根据用户的问题提供准确、有帮助的回答。',
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 2000,
        enableStream: true,
        enableMemory: true,
        memoryLimit: 10,
        aiProvider: 'doubao',
        model: 'gpt-4',
      });

      setLoading(false);
    } catch (error) {
      console.error('加载数据失败:', error);
      toast({
        title: '错误',
        description: '加载数据失败',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/robots/${robotId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: '保存成功',
          description: '配置已保存',
          variant: 'success',
        });
      } else {
        toast({
          title: '保存失败',
          description: data.error || '请重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast({
        title: '错误',
        description: '保存失败',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadKnowledge = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/robots/${robotId}/knowledge/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: '上传成功',
          description: `成功上传 ${files.length} 个文件`,
          variant: 'success',
        });
        // 重新加载知识库列表
      } else {
        toast({
          title: '上传失败',
          description: data.error || '请重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('上传失败:', error);
      toast({
        title: '错误',
        description: '上传失败',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                机器人配置
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {robot?.name} ({robot?.bot_id})
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </div>

        {/* 配置卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI参数配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                AI参数配置
              </CardTitle>
              <CardDescription>配置AI模型的参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>AI提供商</Label>
                <Select
                  value={config.aiProvider}
                  onValueChange={(value) => setConfig({ ...config, aiProvider: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择AI提供商" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doubao">豆包</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="kimi">Kimi</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>模型</Label>
                <Select
                  value={config.model}
                  onValueChange={(value) => setConfig({ ...config, model: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3">Claude 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>温度 ({config.temperature})</Label>
                <Input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>保守 (0)</span>
                  <span>平衡 (1)</span>
                  <span>创意 (2)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Top P ({config.topP})</Label>
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.topP}
                  onChange={(e) => setConfig({ ...config, topP: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>最大Token数</Label>
                <Input
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>流式响应</Label>
                <Switch
                  checked={config.enableStream}
                  onCheckedChange={(checked) => setConfig({ ...config, enableStream: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>启用记忆</Label>
                <Switch
                  checked={config.enableMemory}
                  onCheckedChange={(checked) => setConfig({ ...config, enableMemory: checked })}
                />
              </div>

              {config.enableMemory && (
                <div className="space-y-2">
                  <Label>记忆轮数限制 ({config.memoryLimit})</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={config.memoryLimit}
                    onChange={(e) => setConfig({ ...config, memoryLimit: parseInt(e.target.value) })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 系统提示词 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                系统提示词
              </CardTitle>
              <CardDescription>定义机器人的角色和行为</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={config.systemPrompt}
                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                placeholder="输入系统提示词..."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                系统提示词将作为AI的初始指令，影响其回答风格和行为
              </p>
            </CardContent>
          </Card>

          {/* 知识库管理 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                知识库管理
              </CardTitle>
              <CardDescription>上传和管理知识库文件</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <label className="flex items-center justify-center gap-2 w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <span className="text-gray-500">点击上传文件</span>
                  <input
                    type="file"
                    multiple
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={handleUploadKnowledge}
                    className="hidden"
                  />
                </label>
              </div>

              {knowledgeFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">已上传文件</h4>
                  {knowledgeFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB • {new Date(file.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {knowledgeFiles.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Database className="h-12 w-12 mx-auto mb-2" />
                  <p>暂无知识库文件</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
