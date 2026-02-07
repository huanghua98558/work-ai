'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

export default function CreateRobotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    activationCode: '',
    robotId: '',
    name: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.activationCode.trim() && !formData.robotId.trim()) {
      toast({
        title: '提示',
        description: '请输入激活码或机器人ID',
        variant: 'default',
      });
      return;
    }

    if (formData.activationCode.trim() && formData.robotId.trim()) {
      toast({
        title: '提示',
        description: '激活码和机器人ID只能选择一个',
        variant: 'default',
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: '错误',
          description: '未登录，请先登录',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      const requestBody: any = {
        name: formData.name.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      if (formData.activationCode.trim()) {
        requestBody.activationCode = formData.activationCode.trim();
      } else if (formData.robotId.trim()) {
        requestBody.robotId = formData.robotId.trim();
      }

      const response = await fetch('/api/robots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '绑定成功',
          description: result.data.message || '机器人已成功绑定到您的账户',
          variant: 'default',
        });
        router.push('/robots');
      } else {
        toast({
          title: '绑定失败',
          description: result.error || '绑定机器人失败，请重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('绑定机器人错误:', error);
      toast({
        title: '错误',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* 标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">绑定机器人</h1>
            <p className="text-gray-600">
              通过激活码或机器人ID将机器人绑定到您的账户
            </p>
          </div>

          {/* 绑定卡片 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 激活码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  激活码 <span className="text-gray-500">(二选一)</span>
                </label>
                <input
                  type="text"
                  value={formData.activationCode}
                  onChange={(e) => setFormData({ ...formData, activationCode: e.target.value, robotId: '' })}
                  placeholder="请输入8位激活码，例如：ABC12345"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100"
                  disabled={loading || !!formData.robotId}
                />
                <p className="mt-2 text-sm text-gray-500">
                  输入激活码后，将自动绑定对应的机器人
                </p>
              </div>

              {/* 分隔线 */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">或</span>
                </div>
              </div>

              {/* 机器人ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  机器人ID <span className="text-gray-500">(二选一)</span>
                </label>
                <input
                  type="text"
                  value={formData.robotId}
                  onChange={(e) => setFormData({ ...formData, robotId: e.target.value, activationCode: '' })}
                  placeholder="请输入20位机器人ID，例如：NoJ65N5s8XI9XyV8eaHq"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100"
                  disabled={loading || !!formData.activationCode}
                />
                <p className="mt-2 text-sm text-gray-500">
                  机器人ID可在APP端激活后获得，或由管理员提供
                </p>
              </div>

              {/* 名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  自定义名称（可选）
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="为这个机器人起一个便于识别的名称"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  disabled={loading}
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述（可选）
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="添加关于这个机器人的备注信息"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  disabled={loading}
                />
              </div>

              {/* 按钮 */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading || (!formData.activationCode.trim() && !formData.robotId.trim())}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '绑定中...' : '绑定机器人'}
                </button>
              </div>
            </form>
          </div>

          {/* 帮助信息 */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h3 className="font-medium text-blue-800 mb-2">💡 如何获取激活码或机器人ID？</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>1. 激活码和机器人ID由管理员生成并提供</li>
              <li>2. 您可以使用激活码或机器人ID中的任何一个来绑定机器人</li>
              <li>3. 绑定后，您可以在管理后台配置机器人的知识库、参数等</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
