'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Switch,
} from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Bot,
  ArrowLeft,
  Save,
  Zap,
  Settings,
  Globe,
  Shield,
} from 'lucide-react';

export default function CreateRobotPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    botType: 'feishu',
    description: '',
    aiMode: 'builtin',
    aiProvider: 'doubao',
    aiModel: 'doubao-pro-4k',
    aiTemperature: 0.7,
    aiMaxTokens: 2000,
    aiContextLength: 10,
    aiScenario: '咨询',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: '验证失败',
        description: '请输入机器人名称',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/robots', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: formData.name,
          botType: formData.botType,
          description: formData.description,
          aiMode: formData.aiMode,
          aiProvider: formData.aiProvider,
          aiModel: formData.aiModel,
          aiTemperature: formData.aiTemperature,
          aiMaxTokens: formData.aiMaxTokens,
          aiContextLength: formData.aiContextLength,
          aiScenario: formData.aiScenario,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '创建成功',
          description: `机器人 "${formData.name}" 已成功创建！`,
          variant: 'success',
        });

        // 跳转到机器人列表
        setTimeout(() => {
          router.push('/robots');
        }, 1500);
      } else {
        toast({
          title: '创建失败',
          description: data.error || '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('创建机器人失败:', error);
      toast({
        title: '创建失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900 p-8">
          <div className="relative">
            <Button
              variant="ghost"
              className="mb-4 text-white hover:bg-white/10"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              创建新机器人
            </h1>
            <p className="text-xl text-blue-100">
              配置您的智能机器人，开始多平台对话服务
            </p>
          </div>
        </div>

        {/* 创建表单 */}
        <Card className="border-2 border-blue-100 dark:border-blue-900">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              机器人基本信息
            </CardTitle>
            <CardDescription>配置机器人的基本属性和连接信息</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 机器人名称 */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  机器人名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="例如：客服机器人、企业助手"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* 机器人类型 */}
              <div className="space-y-2">
                <Label htmlFor="botType">机器人类型</Label>
                <Select
                  value={formData.botType}
                  onValueChange={(value) => handleChange('botType', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择机器人类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feishu">飞书机器人</SelectItem>
                    <SelectItem value="wechat">微信公众号</SelectItem>
                    <SelectItem value="wecom">企业微信</SelectItem>
                    <SelectItem value="miniprogram">微信小程序</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">描述（可选）</Label>
                <Textarea
                  id="description"
                  placeholder="描述机器人的用途和特点"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  disabled={loading}
                  rows={3}
                />
              </div>

              <hr className="border-gray-200 dark:border-gray-800" />

              <CardHeader className="p-0 pl-0 bg-transparent">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-purple-600" />
                  AI 配置
                </CardTitle>
                <CardDescription>配置机器人的AI回复能力</CardDescription>
              </CardHeader>

              {/* AI 模式 */}
              <div className="space-y-2">
                <Label htmlFor="aiMode">AI 模式</Label>
                <Select
                  value={formData.aiMode}
                  onValueChange={(value) => handleChange('aiMode', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择AI模式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="builtin">内置AI（推荐）</SelectItem>
                    <SelectItem value="third_party">第三方API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI 提供商 */}
              <div className="space-y-2">
                <Label htmlFor="aiProvider">AI 提供商</Label>
                <Select
                  value={formData.aiProvider}
                  onValueChange={(value) => handleChange('aiProvider', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择AI提供商" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doubao">豆包（ByteDance）</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="kimi">Kimi（Moonshot）</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI 模型 */}
              <div className="space-y-2">
                <Label htmlFor="aiModel">AI 模型</Label>
                <Select
                  value={formData.aiModel}
                  onValueChange={(value) => handleChange('aiModel', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择AI模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.aiProvider === 'doubao' && (
                      <>
                        <SelectItem value="doubao-pro-4k">Doubao Pro 4K</SelectItem>
                        <SelectItem value="doubao-pro-32k">Doubao Pro 32K</SelectItem>
                        <SelectItem value="doubao-lite-4k">Doubao Lite 4K</SelectItem>
                      </>
                    )}
                    {formData.aiProvider === 'deepseek' && (
                      <>
                        <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                        <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                      </>
                    )}
                    {formData.aiProvider === 'kimi' && (
                      <>
                        <SelectItem value="moonshot-v1-8k">Moonshot V1 8K</SelectItem>
                        <SelectItem value="moonshot-v1-32k">Moonshot V1 32K</SelectItem>
                        <SelectItem value="moonshot-v1-128k">Moonshot V1 128K</SelectItem>
                      </>
                    )}
                    {formData.aiProvider === 'custom' && (
                      <SelectItem value="custom">自定义模型</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* 场景 */}
              <div className="space-y-2">
                <Label htmlFor="aiScenario">使用场景</Label>
                <Select
                  value={formData.aiScenario}
                  onValueChange={(value) => handleChange('aiScenario', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择使用场景" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="咨询">咨询</SelectItem>
                    <SelectItem value="问答">问答</SelectItem>
                    <SelectItem value="闲聊">闲聊</SelectItem>
                    <SelectItem value="售后">售后</SelectItem>
                    <SelectItem value="社群管理">社群管理</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 温度 */}
              <div className="space-y-2">
                <Label htmlFor="aiTemperature">
                  温度 (Temperature): {formData.aiTemperature}
                </Label>
                <Input
                  id="aiTemperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.aiTemperature}
                  onChange={(e) => handleChange('aiTemperature', parseFloat(e.target.value))}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  较低的值（0.0-0.3）使输出更确定，较高的值（0.7-1.0）使输出更随机
                </p>
              </div>

              {/* 最大Token数 */}
              <div className="space-y-2">
                <Label htmlFor="aiMaxTokens">最大Token数</Label>
                <Input
                  id="aiMaxTokens"
                  type="number"
                  min="100"
                  max="8000"
                  step="100"
                  value={formData.aiMaxTokens}
                  onChange={(e) => handleChange('aiMaxTokens', parseInt(e.target.value))}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  控制AI回复的最大长度，建议范围：500-4000
                </p>
              </div>

              {/* 上下文长度 */}
              <div className="space-y-2">
                <Label htmlFor="aiContextLength">
                  上下文保留条数: {formData.aiContextLength}
                </Label>
                <Input
                  id="aiContextLength"
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={formData.aiContextLength}
                  onChange={(e) => handleChange('aiContextLength', parseInt(e.target.value))}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  保留最近N条对话作为上下文，0表示不保留历史上下文
                </p>
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? '创建中...' : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      创建机器人
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
