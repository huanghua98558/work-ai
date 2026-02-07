'use client';

import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Bot, ArrowLeft, Save, Key, Copy, CheckCircle2 } from 'lucide-react';

export default function CreateRobotPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [createdRobot, setCreatedRobot] = useState<any>(null);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    autoGenerateCode: true, // 默认自动生成激活码
    validityPeriod: '365', // 默认有效期1年
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const copyActivationCode = () => {
    if (activationCode) {
      navigator.clipboard.writeText(activationCode);
      setCopied(true);
      toast({
        title: '复制成功',
        description: '激活码已复制到剪贴板',
        variant: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    }
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

      const requestBody: any = {
        name: formData.name,
        description: formData.description,
        autoGenerateCode: formData.autoGenerateCode,
      };

      if (formData.autoGenerateCode) {
        requestBody.validityPeriod = parseInt(formData.validityPeriod);
      }

      const response = await fetch('/api/robots', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setCreatedRobot(data.data.robot);
        setActivationCode(data.data.activationCode?.code || null);
        
        toast({
          title: '创建成功',
          description: `机器人 "${formData.name}" 已成功创建！`,
          variant: 'success',
        });

        // 如果生成了激活码，跳转到机器人列表
        setTimeout(() => {
          router.push('/robots');
        }, 3000);
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

  // 创建成功显示激活码
  if (createdRobot && activationCode) {
    return (
      <MainLayout>
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* 成功页面 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-900 dark:via-emerald-900 dark:to-teal-900 p-8">
            <div className="relative">
              <CheckCircle2 className="h-16 w-16 text-white mb-4" />
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                创建成功！
              </h1>
              <p className="text-xl text-green-100">
                机器人 "{createdRobot.name}" 已创建，激活码已生成
              </p>
            </div>
          </div>

          {/* 激活码卡片 */}
          <Card className="border-2 border-green-100 dark:border-green-900">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-green-600" />
                激活码
              </CardTitle>
              <CardDescription>复制此激活码，用于激活机器人</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <code className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-lg text-center">
                  {activationCode}
                </code>
                <Button
                  onClick={copyActivationCode}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      复制
                    </>
                  )}
                </Button>
              </div>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                  机器人信息：
                </p>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p>• 名称：{createdRobot.name}</p>
                  <p>• ID：{createdRobot.bot_id}</p>
                  <p>• 状态：{createdRobot.status === 'online' ? '在线' : '离线'}</p>
                </div>
              </div>

              <Button
                onClick={() => router.push('/robots')}
                className="w-full"
              >
                返回机器人列表
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

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
              一步到位：创建机器人 + 生成激活码
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
            <CardDescription>填写机器人信息，系统将自动生成激活码</CardDescription>
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

              <hr className="border-gray-200 dark:border-gray-800" />

              {/* 自动生成激活码 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoGenerateCode" className="text-base">
                    自动生成激活码
                  </Label>
                  <p className="text-xs text-gray-500">
                    创建机器人后自动生成激活码并绑定
                  </p>
                </div>
                <Switch
                  id="autoGenerateCode"
                  checked={formData.autoGenerateCode}
                  onCheckedChange={(checked) => handleChange('autoGenerateCode', checked)}
                  disabled={loading}
                />
              </div>

              {/* 有效期（如果自动生成激活码） */}
              {formData.autoGenerateCode && (
                <div className="space-y-2">
                  <Label htmlFor="validityPeriod">激活码有效期</Label>
                  <Select
                    value={formData.validityPeriod}
                    onValueChange={(value) => handleChange('validityPeriod', value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择有效期" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">1个月</SelectItem>
                      <SelectItem value="180">6个月</SelectItem>
                      <SelectItem value="365">1年</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    激活码的有效时长，过期后需要重新生成
                  </p>
                </div>
              )}

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
                      创建机器人{formData.autoGenerateCode ? '并生成激活码' : ''}
                    </>
                  )}
                </Button>
              </div>

              {/* 提示信息 */}
              {formData.autoGenerateCode ? (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-900 dark:text-green-100 font-medium">
                    ✓ 一键完成：创建机器人 + 生成激活码
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    创建成功后，您可以直接复制激活码使用，无需额外操作
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                    ℹ️ 创建后可在激活码管理页面生成激活码
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
