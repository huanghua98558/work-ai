'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users,
  Plus,
  Search,
  Download,
  Filter,
  Edit,
  Trash2,
  Shield,
  Key,
  Clock,
  CheckCircle,
  XCircle,
  Crown,
  User as UserIcon,
  Phone,
  RefreshCw,
  Eye,
  MoreVertical,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface User {
  id: number;
  nickname: string;
  phone: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  created_at: string;
  last_login_at: string | null;
  avatar: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 创建用户对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    nickname: '',
    phone: '',
    password: '',
    role: 'user',
    status: 'active',
  });
  const [creating, setCreating] = useState(false);

  // 编辑用户对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    nickname: '',
    role: 'user',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  // 用户详情对话框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/users', {
        params: {
          search: searchQuery || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page,
          limit: 20,
        },
      });

      if (response.data.success) {
        setUsers(response.data.data);
        setTotal(response.data.pagination.total);
      } else {
        toast({
          title: "加载失败",
          description: response.data.error || "加载用户列表失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('加载用户列表失败:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载用户列表失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadUsers();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateUser = async () => {
    if (!createUserForm.phone || !createUserForm.password) {
      toast({
        title: "提示",
        description: "手机号和密码不能为空",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const response = await apiClient.post('/api/users', createUserForm);

      if (response.data.success) {
        toast({
          title: "创建成功",
          description: "用户创建成功",
        });
        setCreateDialogOpen(false);
        setCreateUserForm({
          nickname: '',
          phone: '',
          password: '',
          role: 'user',
          status: 'active',
        });
        loadUsers();
      } else {
        toast({
          title: "创建失败",
          description: response.data.error || "创建用户失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('创建用户失败:', error);
      toast({
        title: "创建失败",
        description: error.message || "创建用户失败",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);
      const response = await apiClient.put(`/api/users/${editingUser.id}`, editUserForm);

      if (response.data.success) {
        toast({
          title: "更新成功",
          description: "用户信息更新成功",
        });
        setEditDialogOpen(false);
        setEditingUser(null);
        loadUsers();
      } else {
        toast({
          title: "更新失败",
          description: response.data.error || "更新用户失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('更新用户失败:', error);
      toast({
        title: "更新失败",
        description: error.message || "更新用户失败",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`确定要删除用户 "${userName}" 吗？此操作将禁用该用户账号。`)) {
      return;
    }

    try {
      const response = await apiClient.delete(`/api/users/${userId}`);

      if (response.data.success) {
        toast({
          title: "删除成功",
          description: "用户删除成功",
        });
        loadUsers();
      } else {
        toast({
          title: "删除失败",
          description: response.data.error || "删除用户失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('删除用户失败:', error);
      toast({
        title: "删除失败",
        description: error.message || "删除用户失败",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    const action = newStatus === 'active' ? '启用' : '禁用';

    if (!confirm(`确定要${action}用户 "${user.nickname}" 吗？`)) {
      return;
    }

    try {
      const response = await apiClient.put(`/api/users/${user.id}`, {
        status: newStatus,
      });

      if (response.data.success) {
        toast({
          title: `${action}成功`,
          description: `用户已${action}`,
        });
        loadUsers();
      } else {
        toast({
          title: `${action}失败`,
          description: response.data.error || `${action}用户失败`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error(`${action}用户失败:`, error);
      toast({
        title: `${action}失败`,
        description: error.message || `${action}用户失败`,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditUserForm({
      nickname: user.nickname,
      role: user.role,
      status: user.status,
    });
    setEditDialogOpen(true);
  };

  const openDetailDialog = (user: User) => {
    setDetailUser(user);
    setDetailDialogOpen(true);
  };

  if (loading && page === 1) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">加载中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 - 使用渐变背景 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 dark:from-rose-900 dark:via-pink-900 dark:to-red-900 p-8">
          <div className="relative">
            <div className="inline-block px-4 py-2 mb-4 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <span className="text-white/90 text-sm font-medium">管理系统用户，支持角色权限配置和账户状态管理</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              用户管理
            </h1>
            <p className="text-xl text-rose-100 mb-6 max-w-2xl">
              管理系统用户，支持角色权限配置、激活码绑定和账户状态管理
            </p>
            <div className="flex gap-3">
              <Button className="bg-white text-rose-600 hover:bg-rose-50" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                新增用户
              </Button>
              <Button className="bg-white/10 text-white border-white/50 hover:bg-white/20">
                <Key className="mr-2 h-4 w-4" />
                批量分配激活码
              </Button>
              <Button className="bg-white/10 text-white border-white/50 hover:bg-white/20">
                <Download className="mr-2 h-4 w-4" />
                导出用户
              </Button>
            </div>
          </div>
        </div>

        {/* 统计卡片 - 使用渐变背景 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-rose-50">用户总数</CardTitle>
              <Users className="h-4 w-4 text-rose-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{total}</div>
              <p className="text-sm text-rose-100 mt-1">注册用户</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-pink-50">活跃用户</CardTitle>
              <CheckCircle className="h-4 w-4 text-pink-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.filter(u => u.status === 'active').length}
              </div>
              <p className="text-sm text-pink-100 mt-1">正常使用</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-50">管理员</CardTitle>
              <Crown className="h-4 w-4 text-red-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.filter(u => u.role === 'admin').length}
              </div>
              <p className="text-sm text-red-100 mt-1">管理员账户</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-50">普通用户</CardTitle>
              <UserIcon className="h-4 w-4 text-orange-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.filter(u => u.role === 'user').length}
              </div>
              <p className="text-sm text-orange-100 mt-1">注册用户</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选栏 */}
        <Card className="border-2 border-rose-100 dark:border-rose-900">
          <CardContent className="p-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索用户名或手机号..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="角色筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部角色</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="user">普通用户</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">正常</SelectItem>
                  <SelectItem value="disabled">已禁用</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadUsers}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 用户列表 */}
        <Card className="border-2 border-rose-100 dark:border-rose-900">
          <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-rose-600" />
              用户列表
            </CardTitle>
            <CardDescription>查看和管理所有系统用户</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        暂无用户数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {user.role === 'admin' && <Crown className="h-4 w-4 text-yellow-500" />}
                              {user.nickname}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                            {user.role === 'admin' ? (
                              <span className="flex items-center gap-1">
                                <Crown className="h-3 w-3" />
                                管理员
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <UserIcon className="h-3 w-3" />
                                用户
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={user.status === 'active' ? 'text-green-600' : 'text-red-600'}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.status === 'active' ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                正常
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                已禁用
                              </span>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            {new Date(user.created_at).toLocaleDateString('zh-CN')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.last_login_at ? (
                            <span className="text-gray-600 dark:text-gray-400 text-sm">
                              {new Date(user.last_login_at).toLocaleString('zh-CN')}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">从未登录</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600"
                              onClick={() => openDetailDialog(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDeleteUser(user.id, user.nickname)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 分页 */}
            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-gray-500">
                共 {total} 条记录 · 第 {page} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={users.length < 20}
                >
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 创建用户对话框 */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新用户</DialogTitle>
              <DialogDescription>填写用户信息以创建新账户</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nickname" className="text-right">
                  昵称
                </Label>
                <Input
                  id="nickname"
                  value={createUserForm.nickname}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, nickname: e.target.value })}
                  className="col-span-3"
                  placeholder="请输入昵称"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  手机号
                </Label>
                <Input
                  id="phone"
                  value={createUserForm.phone}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
                  className="col-span-3"
                  placeholder="请输入手机号"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  密码
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                  className="col-span-3"
                  placeholder="请输入密码"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  角色
                </Label>
                <Select
                  value={createUserForm.role}
                  onValueChange={(value) => setCreateUserForm({ ...createUserForm, role: value as 'admin' | 'user' })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">用户</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  状态
                </Label>
                <Select
                  value={createUserForm.status}
                  onValueChange={(value) => setCreateUserForm({ ...createUserForm, status: value as 'active' | 'disabled' })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">正常</SelectItem>
                    <SelectItem value="disabled">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑用户对话框 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑用户</DialogTitle>
              <DialogDescription>修改用户信息</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-nickname" className="text-right">
                  昵称
                </Label>
                <Input
                  id="edit-nickname"
                  value={editUserForm.nickname}
                  onChange={(e) => setEditUserForm({ ...editUserForm, nickname: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  角色
                </Label>
                <Select
                  value={editUserForm.role}
                  onValueChange={(value) => setEditUserForm({ ...editUserForm, role: value as 'admin' | 'user' })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">用户</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  状态
                </Label>
                <Select
                  value={editUserForm.status}
                  onValueChange={(value) => setEditUserForm({ ...editUserForm, status: value as 'active' | 'disabled' })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">正常</SelectItem>
                    <SelectItem value="disabled">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleEditUser} disabled={saving}>
                {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 用户详情对话框 */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>用户详情</DialogTitle>
              <DialogDescription>查看用户详细信息</DialogDescription>
            </DialogHeader>
            {detailUser && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-gray-500">昵称</Label>
                  <div className="col-span-3 font-medium">{detailUser.nickname}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-gray-500">手机号</Label>
                  <div className="col-span-3 font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {detailUser.phone}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-gray-500">角色</Label>
                  <div className="col-span-3">
                    <Badge variant={detailUser.role === 'admin' ? 'default' : 'outline'}>
                      {detailUser.role === 'admin' ? (
                        <span className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          管理员
                        </span>
                      ) : (
                        '用户'
                      )}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-gray-500">状态</Label>
                  <div className="col-span-3">
                    <Badge variant={detailUser.status === 'active' ? 'default' : 'secondary'}>
                      {detailUser.status === 'active' ? '正常' : '已禁用'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-gray-500">注册时间</Label>
                  <div className="col-span-3 text-sm">
                    {new Date(detailUser.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-gray-500">最后登录</Label>
                  <div className="col-span-3 text-sm">
                    {detailUser.last_login_at ? (
                      new Date(detailUser.last_login_at).toLocaleString('zh-CN')
                    ) : (
                      <span className="text-gray-400">从未登录</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
