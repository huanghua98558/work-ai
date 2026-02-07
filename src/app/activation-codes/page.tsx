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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Key,
  Plus,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Shield,
  Zap,
  Trash2,
  Edit,
  Eye,
  AlertTriangle,
} from 'lucide-react';

interface ActivationCode {
  id: number;
  code: string;
  robot_id?: string | null;
  robot_name?: string | null;
  status: 'unused' | 'used' | 'expired' | 'disabled';
  validity_period: number;
  bound_user_id: number | null;
  price?: string;
  created_by?: number;
  created_at: string;
  expires_at: string;
  used_at?: string | null;
  type?: string;
  max_uses?: number;
  used_count?: number;
  notes?: string;
  device_id?: string | null;
  device_info?: any;
}

interface Robot {
  id: number;
  robot_id: string;
  name: string;
  status: string;
}

export default function ActivationCodesPage() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  
  // 生成激活码弹窗
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRobotId, setSelectedRobotId] = useState(''); // 绑定的机器人ID（可选）
  const [robotName, setRobotName] = useState('');
  const [validityPeriod, setValidityPeriod] = useState('365');
  const [notes, setNotes] = useState('');
  const [batchCount, setBatchCount] = useState('1'); // 批量生成数量
  const [isCreating, setIsCreating] = useState(false); // 创建中状态
  
  // 编辑激活码弹窗
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<ActivationCode | null>(null);
  
  // 查看详情弹窗
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingCode, setViewingCode] = useState<ActivationCode | null>(null);

  // 加载数据
  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const [codesRes, robotsRes] = await Promise.all([
        fetch('/api/activation-codes', { headers }),
        fetch('/api/robots', { headers }),
      ]);

      const codesData = await codesRes.json();
      const robotsData = await robotsRes.json();

      console.log('加载激活码响应:', codesData);
      console.log('加载机器人响应:', robotsData);

      if (codesRes.status === 401) {
        toast({
          title: '登录已过期',
          description: '请重新登录',
          variant: 'destructive',
        });
        window.location.href = '/login';
        return;
      }

      if (robotsRes.status === 401) {
        toast({
          title: '登录已过期',
          description: '请重新登录',
          variant: 'destructive',
        });
        window.location.href = '/login';
        return;
      }

      if (codesData.success) {
        console.log('设置激活码数据:', codesData.data);
        console.log('激活码数据详情:');
        codesData.data.forEach((code: any, index: number) => {
          console.log(`[${index}] ID=${code.id}, code=${code.code}, robot_id=${code.robot_id}, robot_name=${code.robot_name}`);
        });
        setCodes(codesData.data);
      }
      if (robotsData.success) {
        setRobots(robotsData.data);
      }
    } catch (error: any) {
      console.error('加载数据失败:', error);
      if (error.message?.includes('401') || error.message?.includes('未授权')) {
        toast({
          title: '登录已过期',
          description: '请重新登录',
          variant: 'destructive',
        });
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 刷新列表
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // 复制激活码
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: '复制成功',
      description: '激活码已复制到剪贴板',
      variant: 'success',
    });
  };

  // 生成激活码
  const handleCreateCode = async () => {
    try {
      setIsCreating(true);

      // 验证：批量生成时不能绑定机器人
      if (selectedRobotId && parseInt(batchCount) > 1) {
        toast({
          title: '验证失败',
          description: '绑定机器人模式只能生成1个激活码',
          variant: 'destructive',
        });
        setIsCreating(false);
        return;
      }

      const requestBody: any = {
        validityPeriod: parseInt(validityPeriod),
        notes,
        batchCount: parseInt(batchCount), // 批量生成数量
      };

      if (selectedRobotId) {
        requestBody.robotId = selectedRobotId;
      }

      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/activation-codes', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      console.log('创建激活码响应:', data);

      if (data.success) {
        const newCodes = data.data || [];
        const count = Array.isArray(newCodes) ? newCodes.length : 1;
        toast({
          title: '创建成功',
          description: `成功生成 ${count} 个激活码！`,
          variant: 'success',
        });
        setCreateDialogOpen(false);
        setSelectedRobotId('');
        setRobotName('');
        setNotes('');
        setBatchCount('1');
        // 立即刷新列表
        await loadData();
      } else {
        toast({
          title: '创建失败',
          description: data.error || '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('生成激活码失败:', error);
      if (error.message?.includes('401') || error.message?.includes('未授权')) {
        toast({
          title: '登录已过期',
          description: '请重新登录',
          variant: 'destructive',
        });
        // 可以在这里添加跳转到登录页的逻辑
        window.location.href = '/login';
      } else {
        toast({
          title: '创建失败',
          description: '请稍后重试',
          variant: 'destructive',
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  // 编辑激活码
  const handleEditCode = async () => {
    if (!editingCode) return;

    try {
      // 计算有效期天数（从当前日期到过期日期）
      const now = new Date();
      const expiresAt = new Date(editingCode.expires_at);
      const validityPeriod = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/activation-codes/${editingCode.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          validityPeriod: validityPeriod > 0 ? validityPeriod : 365, // 确保为正数
          notes: editingCode.notes,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: '更新成功',
          description: '激活码已更新',
          variant: 'success',
        });
        setEditDialogOpen(false);
        setEditingCode(null);
        await loadData();
      } else {
        toast({
          title: '更新失败',
          description: data.error || '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('更新激活码失败:', error);
      toast({
        title: '更新失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 删除激活码
  const handleDeleteCode = async (id: number) => {
    if (!confirm('确定要删除此激活码吗？此操作不可恢复！')) return;

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/activation-codes/${id}`, {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: '删除成功',
          description: '激活码已删除',
          variant: 'success',
        });
        await loadData();
      } else {
        toast({
          title: '删除失败',
          description: data.error || '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('删除激活码失败:', error);
      toast({
        title: '删除失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 解绑设备
  const handleUnbindDevice = async (code: string) => {
    if (!confirm('确定要解绑设备吗？解绑后可以使用新设备激活。')) return;

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/unbind-device', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code,
          reason: '管理员解绑',
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: '解绑成功',
          description: '设备已解绑',
          variant: 'success',
        });
        await loadData();
      } else {
        toast({
          title: '解绑失败',
          description: data.error || '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('解绑设备失败:', error);
      toast({
        title: '解绑失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 批量导出
  const handleExport = () => {
    if (codes.length === 0) {
      toast({
        title: '导出失败',
        description: '没有可导出的激活码',
        variant: 'destructive',
      });
      return;
    }

    const csvContent = [
      ['激活码', '机器人名称', '机器人ID', '状态', '有效期', '创建时间', '过期时间', '备注'].join(','),
      ...codes.map(code => [
        code.code,
        code.robot_name || '-',
        code.robot_id || '-',
        code.status,
        code.validity_period + '天',
        code.created_at,
        code.expires_at,
        code.notes || '-',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `activation_codes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // 查看详情
  const handleViewDetail = (code: ActivationCode) => {
    setViewingCode(code);
    setDetailDialogOpen(true);
  };

  // 编辑
  const handleEditClick = (code: ActivationCode) => {
    setEditingCode(code);
    setEditDialogOpen(true);
  };

  // 状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'unused':
        return '未使用';
      case 'used':
        return '已使用';
      case 'expired':
        return '已过期';
      case 'disabled':
        return '已禁用';
      default:
        return status;
    }
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-900 dark:via-emerald-900 dark:to-teal-900 p-8">
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              激活码管理
            </h1>
            <p className="text-xl text-green-100 mb-6 max-w-2xl">
              生成和管理激活码，支持批量生成和导出功能
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                className="bg-white text-green-600 hover:bg-green-50"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                生成新激活码
              </Button>
              <Button 
                className="bg-white/10 text-white border-white/50 hover:bg-white/20"
                onClick={handleExport}
              >
                <Download className="mr-2 h-4 w-4" />
                批量导出
              </Button>
              <Button 
                className="bg-white/10 text-white border-white/50 hover:bg-white/20"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                刷新列表
              </Button>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-50">总数</CardTitle>
              <Key className="h-4 w-4 text-green-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{codes.length}</div>
              <p className="text-sm text-green-100 mt-1">已生成</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-50">未使用</CardTitle>
              <Shield className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {codes.filter(c => c.status === 'unused').length}
              </div>
              <p className="text-sm text-blue-100 mt-1">可激活</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-50">已使用</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-purple-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {codes.filter(c => c.status === 'used').length}
              </div>
              <p className="text-sm text-purple-100 mt-1">已激活</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-50">价值</CardTitle>
              <Zap className="h-4 w-4 text-orange-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ¥{codes.reduce((sum, c) => sum + (parseFloat(c.price || '0') || 0), 0).toFixed(2)}
              </div>
              <p className="text-sm text-orange-100 mt-1">总价值</p>
            </CardContent>
          </Card>
        </div>

        {/* 激活码列表 */}
        <Card className="border-2 border-green-100 dark:border-green-900">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-600" />
              激活码列表
            </CardTitle>
            <CardDescription>查看和管理所有激活码</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* 帮助提示 */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    如何在激活码列表中看到机器人ID？
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    创建激活码时，请选择 <span className="font-semibold">"绑定机器人"</span> 模式，并选择已存在的机器人。
                    只有绑定机器人的激活码才会显示机器人ID，纯激活码激活时才会自动创建机器人。
                  </p>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 font-bold bg-slate-100 dark:bg-slate-800 text-center">ID</TableHead>
                    <TableHead className="font-bold bg-slate-100 dark:bg-slate-800">激活码</TableHead>
                    <TableHead className="font-bold bg-slate-100 dark:bg-slate-800">机器人名称</TableHead>
                    <TableHead className="font-bold bg-slate-100 dark:bg-slate-800">机器人ID</TableHead>
                    <TableHead className="font-bold bg-slate-100 dark:bg-slate-800">设备ID</TableHead>
                    <TableHead className="font-bold bg-slate-100 dark:bg-slate-800">状态</TableHead>
                    <TableHead className="font-bold bg-slate-100 dark:bg-slate-800">有效期</TableHead>
                    <TableHead className="font-bold bg-slate-100 dark:bg-slate-800">创建时间</TableHead>
                    <TableHead className="font-bold bg-slate-100 dark:bg-slate-800">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-bold text-base px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2">
                          #{code.id}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono">
                            {code.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCode(code.code)}
                            className="text-blue-600"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {code.robot_name || <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell>
                        {code.robot_id ? (
                          <code className="text-xs">{code.robot_id}</code>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {code.device_id ? (
                          <code className="text-xs">{code.device_id}</code>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            code.status === 'unused'
                              ? 'default'
                              : code.status === 'used'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {code.status === 'unused' ? (
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              未使用
                            </span>
                          ) : code.status === 'used' ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              已使用
                            </span>
                          ) : code.status === 'expired' ? (
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              已过期
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              已禁用
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{code.validity_period} 天</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          {new Date(code.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(code)}
                            className="text-green-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {code.status === 'used' && code.device_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnbindDevice(code.code)}
                              className="text-orange-600"
                            >
                              解绑
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(code)}
                            className="text-blue-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCode(code.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 生成激活码弹窗 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 mx-auto">
          <DialogHeader>
            <DialogTitle>生成新激活码</DialogTitle>
            <DialogDescription>
              {selectedRobotId
                ? '激活时将使用绑定的机器人'
                : '激活时自动创建新机器人'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>绑定机器人（可选）</Label>
              <Select value={selectedRobotId} onValueChange={setSelectedRobotId}>
                <SelectTrigger>
                  <SelectValue placeholder="不选择则激活时自动创建机器人" />
                </SelectTrigger>
                <SelectContent>
                  {robots.filter(r => r.status !== 'deleted').map(robot => (
                    <SelectItem key={robot.robot_id} value={robot.robot_id}>
                      {robot.name} ({robot.robot_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                💡 不选择机器人时，激活时会自动创建新机器人
              </p>
            </div>

            <div className="space-y-2">
              <Label>有效期</Label>
              <Select value={validityPeriod} onValueChange={setValidityPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="选择有效期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">1个月</SelectItem>
                  <SelectItem value="180">6个月</SelectItem>
                  <SelectItem value="365">1年</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>生成数量</Label>
              <Select value={batchCount} onValueChange={setBatchCount} disabled={!!selectedRobotId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择生成数量" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 个</SelectItem>
                  <SelectItem value="5">5 个</SelectItem>
                  <SelectItem value="10">10 个</SelectItem>
                  <SelectItem value="20">20 个</SelectItem>
                  <SelectItem value="50">50 个</SelectItem>
                  <SelectItem value="100">100 个</SelectItem>
                </SelectContent>
              </Select>
              {selectedRobotId && (
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ 绑定机器人后只能生成 1 个激活码
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="请输入备注信息"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateCode} disabled={loading || isCreating}>
              {isCreating ? '生成中...' : '生成激活码'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑激活码弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 mx-auto">
          <DialogHeader>
            <DialogTitle>编辑激活码</DialogTitle>
            <DialogDescription>
              修改激活码信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>激活码</Label>
              <Input value={editingCode?.code || ''} disabled />
            </div>

            <div className="space-y-2">
              <Label>有效期（天）</Label>
              <Select
                value={editingCode?.validity_period?.toString() || '365'}
                onValueChange={(value) => setEditingCode({ ...editingCode!, validity_period: parseInt(value) } as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择有效期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">1个月（30天）</SelectItem>
                  <SelectItem value="90">3个月（90天）</SelectItem>
                  <SelectItem value="180">6个月（180天）</SelectItem>
                  <SelectItem value="365">1年（365天）</SelectItem>
                  <SelectItem value="730">2年（730天）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                placeholder="请输入备注信息"
                value={editingCode?.notes || ''}
                onChange={(e) => setEditingCode({ ...editingCode!, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditCode} disabled={loading}>
              {loading ? '更新中...' : '更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 mx-auto">
          <DialogHeader>
            <DialogTitle>激活码详情</DialogTitle>
            <DialogDescription>
              查看激活码的完整信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-500">激活码</Label>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-bold">{viewingCode?.code}</code>
                  <Button variant="ghost" size="sm" onClick={() => copyCode(viewingCode!.code)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-500">状态</Label>
                <Badge>{getStatusText(viewingCode?.status || '')}</Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-500">机器人名称</Label>
                <div>{viewingCode?.robot_name || '-'}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-500">机器人ID</Label>
                <code className="text-xs break-all">{viewingCode?.robot_id || '-'}</code>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-500">设备ID</Label>
                <code className="text-xs break-all">{viewingCode?.device_id || '-'}</code>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-500">有效期</Label>
                <div>{viewingCode?.validity_period} 天</div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-500">创建时间</Label>
                <div>{viewingCode?.created_at}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-500">过期时间</Label>
                <div>{viewingCode?.expires_at}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-500">使用时间</Label>
                <div>{viewingCode?.used_at || '-'}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-500">价格</Label>
                <div>{viewingCode?.price ? `¥${viewingCode.price}` : '-'}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-500">使用次数</Label>
                <div>{viewingCode?.used_count || 0} / {viewingCode?.max_uses || 1}</div>
              </div>
            </div>

            {viewingCode?.device_info && (
              <div className="space-y-2">
                <Label className="text-gray-500">设备信息</Label>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(viewingCode.device_info, null, 2)}
                </pre>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-500">备注</Label>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                {viewingCode?.notes || '无备注'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
