'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bot, ArrowLeft, Save } from 'lucide-react';

export default function CreateRobotPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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
          description: formData.description,
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
      <div className="space-y-6 max-w-2xl mx-auto">
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
              创建机器人后，可以配置AI参数和生成激活码
            </p>
          </div>
        </div>

        {/* 创建表单 */}
        <Card className="border-2 border-blue-100 dark:border-blue-900">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              基本信息
            </CardTitle>
            <CardDescription>只需填写机器人名称即可创建，AI配置可在创建后设置</CardDescription>
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
                <p className="text-xs text-gray-500">
                  建议使用简洁明确的名称，方便后续管理
                </p>
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
                <p className="text-xs text-gray-500">
                  帮助团队成员了解机器人的用途
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

              {/* 提示信息 */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 创建成功后，您可以：
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                  <li>• 配置AI参数（模型、温度、上下文等）</li>
                  <li>• 生成激活码并分发使用</li>
                  <li>• 查看消息统计和对话记录</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
