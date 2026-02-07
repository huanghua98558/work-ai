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
import { Bot, ArrowLeft, Key } from 'lucide-react';

export default function CreateRobotPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    activationCode: '', // 激活码
    robotId: '', // 机器人ID
    bindType: 'activationCode', // 绑定类型：activationCode 或 robotId
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

    // 验证激活码或机器人ID
    if (formData.bindType === 'activationCode' && !formData.activationCode.trim()) {
      toast({
        title: '验证失败',
        description: '请输入激活码',
        variant: 'destructive',
      });
      return;
    }

    if (formData.bindType === 'robotId' && !formData.robotId.trim()) {
      toast({
        title: '验证失败',
        description: '请输入机器人ID',
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

      const requestBody: any = {
        name: formData.name,
        description: formData.description,
      };

      // 根据绑定类型添加对应字段
      if (formData.bindType === 'activationCode') {
        requestBody.activationCode = formData.activationCode;
      } else {
        requestBody.robotId = formData.robotId;
      }

      const response = await fetch('/api/robots', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '创建成功',
          description: `机器人 "${formData.name}" 已成功绑定！`,
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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              绑定机器人
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              通过激活码或机器人ID绑定机器人到您的服务器
            </p>
          </div>
        </div>

        {/* 创建表单 */}
        <Card className="border-2 border-blue-100 dark:border-blue-900">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              机器人信息
            </CardTitle>
            <CardDescription>
              填写机器人基本信息和绑定信息
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 机器人名称 */}
              <div className="space-y-2">
                <Label htmlFor="name">机器人名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="输入机器人名称"
                  disabled={loading}
                />
              </div>

              {/* 机器人描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">机器人描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="输入机器人描述（可选）"
                  rows={3}
                  disabled={loading}
                />
              </div>

              {/* 绑定类型选择 */}
              <div className="space-y-2">
                <Label>绑定方式 *</Label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleChange('bindType', 'activationCode')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      formData.bindType === 'activationCode'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <Key className="h-5 w-5" />
                      <span className="font-medium">激活码</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      输入激活码绑定机器人
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('bindType', 'robotId')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      formData.bindType === 'robotId'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <Bot className="h-5 w-5" />
                      <span className="font-medium">机器人ID</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      输入机器人ID直接绑定
                    </p>
                  </button>
                </div>
              </div>

              {/* 激活码输入 */}
              {formData.bindType === 'activationCode' && (
                <div className="space-y-2">
                  <Label htmlFor="activationCode">激活码 *</Label>
                  <Input
                    id="activationCode"
                    value={formData.activationCode}
                    onChange={(e) => handleChange('activationCode', e.target.value.toUpperCase())}
                    placeholder="输入8位激活码"
                    className="font-mono text-lg text-center"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    请输入您购买的激活码或管理员提供的激活码
                  </p>
                </div>
              )}

              {/* 机器人ID输入 */}
              {formData.bindType === 'robotId' && (
                <div className="space-y-2">
                  <Label htmlFor="robotId">机器人ID *</Label>
                  <Input
                    id="robotId"
                    value={formData.robotId}
                    onChange={(e) => handleChange('robotId', e.target.value)}
                    placeholder="输入20位机器人ID"
                    className="font-mono"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    20位随机字符（数字、大小写字母）
                  </p>
                </div>
              )}

              {/* 提示信息 */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  💡 使用说明：
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 mt-2 list-disc list-inside">
                  <li>激活码通过购买或管理员创建获得</li>
                  <li>激活成功后会自动创建或绑定机器人</li>
                  <li>机器人ID可在激活成功后获得</li>
                </ul>
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? '绑定中...' : '绑定机器人'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
