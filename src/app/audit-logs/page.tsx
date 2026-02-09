'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText,
  Search,
  RefreshCw,
  Filter,
  Shield,
  Calendar,
  User,
  Activity,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  resource: string;
  resourceId: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  status: 'success' | 'failed';
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/audit-logs', {
        params: {
          search: searchQuery || undefined,
          action: actionFilter !== 'all' ? actionFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit,
          offset: (page - 1) * limit,
        },
      });

      if (response.success) {
        setLogs(response.data);
        setTotal(response.pagination.total);
      } else {
        toast({
          title: "加载失败",
          description: response.error || "加载审计日志失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('加载审计日志失败:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载审计日志失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadLogs();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            成功
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            失败
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    const actionMap: Record<string, { icon: any; color: string }> = {
      'login': { icon: User, color: 'text-blue-500' },
      'logout': { icon: User, color: 'text-gray-500' },
      'create': { icon: CheckCircle2, color: 'text-green-500' },
      'update': { icon: RefreshCw, color: 'text-yellow-500' },
      'delete': { icon: XCircle, color: 'text-red-500' },
      'view': { icon: FileText, color: 'text-purple-500' },
      'export': { icon: Download, color: 'text-cyan-500' },
    };

    const { icon: Icon, color } = actionMap[action.split(':')[0]] || { icon: Activity, color: 'text-gray-500' };
    return <Icon className={`h-4 w-4 ${color}`} />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">审计日志</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              查看系统操作记录和安全事件
            </p>
          </div>
          <Button
            variant="outline"
            onClick={loadLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>总日志数</CardDescription>
              <CardTitle className="text-3xl">{total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <FileText className="h-4 w-4 mr-2 text-blue-500" />
                所有操作记录
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>成功操作</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {logs.filter(l => l.status === 'success').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                执行成功
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>失败操作</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {logs.filter(l => l.status === 'failed').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                执行失败
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>今日操作</CardDescription>
              <CardTitle className="text-3xl">
                {logs.filter(l => {
                  const today = new Date().toDateString();
                  return new Date(l.createdAt).toDateString() === today;
                }).length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                今日新增
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选条件 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              筛选条件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">搜索</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="搜索用户、操作、资源..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">操作类型</label>
                <Select value={actionFilter} onValueChange={(value) => {
                  setActionFilter(value);
                  setPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部操作" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部操作</SelectItem>
                    <SelectItem value="login">登录</SelectItem>
                    <SelectItem value="logout">登出</SelectItem>
                    <SelectItem value="create">创建</SelectItem>
                    <SelectItem value="update">更新</SelectItem>
                    <SelectItem value="delete">删除</SelectItem>
                    <SelectItem value="view">查看</SelectItem>
                    <SelectItem value="export">导出</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">执行状态</label>
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="success">成功</SelectItem>
                    <SelectItem value="failed">失败</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 日志列表 */}
        <Card>
          <CardHeader>
            <CardTitle>日志列表</CardTitle>
            <CardDescription>共 {total} 条记录</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  暂无日志
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  系统暂无操作记录
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>用户ID</TableHead>
                      <TableHead>操作</TableHead>
                      <TableHead>资源</TableHead>
                      <TableHead>资源ID</TableHead>
                      <TableHead>IP地址</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {formatTime(log.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.userId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span className="text-sm">{log.action}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.resource}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.resourceId || '-'}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.ipAddress || '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 分页 */}
            {total > limit && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  第 {page} 页 / 共 {Math.ceil(total / limit)} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                  disabled={page >= Math.ceil(total / limit)}
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
