'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Database,
  Shield,
  Bell,
  Globe,
  Lock,
  Server,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  Key,
  Zap,
  Clock,
  HardDrive,
  Cpu,
} from 'lucide-react';

interface SystemConfig {
  environment: string;
  version: string;
  database: {
    host: string;
    port: number;
    database: string;
    status: 'connected' | 'disconnected' | 'error';
  };
  websocket: {
    enabled: boolean;
    port: number;
    status: 'running' | 'stopped' | 'error';
  };
  features: {
    knowledgeBase: boolean;
    fileUpload: boolean;
    realtimeChat: boolean;
    logManagement: boolean;
  };
  security: {
    jwtConfigured: boolean;
    bcryptRounds: number;
    sessionTimeout: number;
  };
}

export default function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/settings/config', { headers });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/settings/config', {
        method: 'POST',
        headers,
        body: JSON.stringify(config),
      });
      if (response.ok) {
        alert('配置已保存');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
      case 'running':
        return <Badge variant="default" className="bg-green-600">正常</Badge>;
      case 'disconnected':
      case 'stopped':
        return <Badge variant="secondary">未连接</Badge>;
      case 'error':
        return <Badge variant="destructive">异常</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">系统设置</h1>
            <p className="text-gray-600">管理系统配置和环境变量</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadConfig} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </div>

        {/* 系统概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Server className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-90">运行环境</p>
                  <p className="text-xl font-bold">{config?.environment}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-90">数据库</p>
                  <p className="text-xl font-bold">{config?.database.status === 'connected' ? '已连接' : '未连接'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-90">WebSocket</p>
                  <p className="text-xl font-bold">{config?.websocket.status === 'running' ? '运行中' : '已停止'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-90">安全状态</p>
                  <p className="text-xl font-bold">{config?.security.jwtConfigured ? '已配置' : '未配置'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="system" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="system">
              <Server className="w-4 h-4 mr-2" />
              系统配置
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="w-4 h-4 mr-2" />
              数据库
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              安全设置
            </TabsTrigger>
            <TabsTrigger value="features">
              <Zap className="w-4 h-4 mr-2" />
              功能开关
            </TabsTrigger>
          </TabsList>

          {/* 系统配置 */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  基本信息
                </CardTitle>
                <CardDescription>查看和修改系统基本信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>运行环境</Label>
                    <Input value={config?.environment} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>系统版本</Label>
                    <Input value={config?.version} disabled />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>WebSocket 端口</Label>
                    <Input type="number" value={config?.websocket.port} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>WebSocket 状态</Label>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(config?.websocket.status || 'stopped')}
                      <span className="text-sm text-gray-600">
                        {config?.websocket.status === 'running' ? '服务正常运行' : '服务未启动'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 数据库配置 */}
          <TabsContent value="database" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  数据库连接
                </CardTitle>
                <CardDescription>查看数据库连接状态</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>主机地址</Label>
                    <Input value={config?.database.host} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>端口</Label>
                    <Input type="number" value={config?.database.port} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>数据库名</Label>
                    <Input value={config?.database.database} disabled />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    {config?.database.status === 'connected' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {config?.database.status === 'connected' ? '数据库连接正常' : '数据库连接异常'}
                      </p>
                      <p className="text-sm text-gray-600">PostgreSQL 18</p>
                    </div>
                  </div>
                  <Button onClick={loadConfig} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    测试连接
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  资源使用
                </CardTitle>
                <CardDescription>数据库资源使用情况</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>连接池使用率</Label>
                    <span className="text-sm text-gray-600">45%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">活跃连接</p>
                    <p className="font-semibold">9</p>
                  </div>
                  <div>
                    <p className="text-gray-600">空闲连接</p>
                    <p className="font-semibold">11</p>
                  </div>
                  <div>
                    <p className="text-gray-600">最大连接数</p>
                    <p className="font-semibold">20</p>
                  </div>
                  <div>
                    <p className="text-gray-600">等待连接</p>
                    <p className="font-semibold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 安全设置 */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  JWT 配置
                </CardTitle>
                <CardDescription>JWT Token 安全配置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">JWT_SECRET</span>
                      {config?.security.jwtConfigured ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          已配置
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          未配置
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      用于签名和验证 JWT Token 的密钥
                    </p>
                  </div>
                  {!config?.security.jwtConfigured && (
                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/config/production'}>
                      配置
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  密码策略
                </CardTitle>
                <CardDescription>密码加密和会话管理</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>BCrypt 轮数</Label>
                    <Input type="number" value={config?.security.bcryptRounds} disabled />
                    <p className="text-xs text-gray-600">密码加密强度，建议值为 10-12</p>
                  </div>
                  <div className="space-y-2">
                    <Label>会话超时（秒）</Label>
                    <Input type="number" value={config?.security.sessionTimeout} disabled />
                    <p className="text-xs text-gray-600">用户登录会话的有效时长</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 功能开关 */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  功能模块
                </CardTitle>
                <CardDescription>启用或禁用系统功能模块</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">知识库功能</p>
                        <p className="text-sm text-gray-600">启用知识库管理和检索</p>
                      </div>
                    </div>
                    <Switch checked={config?.features.knowledgeBase} disabled />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <HardDrive className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">文件上传</p>
                        <p className="text-sm text-gray-600">启用文件上传和管理功能</p>
                      </div>
                    </div>
                    <Switch checked={config?.features.fileUpload} disabled />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">实时聊天</p>
                        <p className="text-sm text-gray-600">启用 WebSocket 实时消息推送</p>
                      </div>
                    </div>
                    <Switch checked={config?.features.realtimeChat} disabled />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                        <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium">日志管理</p>
                        <p className="text-sm text-gray-600">启用日志查询和导出功能</p>
                      </div>
                    </div>
                    <Switch checked={config?.features.logManagement} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
