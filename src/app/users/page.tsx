'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
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
  Mail,
  Phone,
  MoreVertical,
} from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'banned';
  role: 'admin' | 'user' | 'vip';
  createdAt: string;
  lastLoginAt: string | null;
  robotsCount: number;
  activationCode: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // 模拟数据加载
    const mockUsers: User[] = [
      {
        id: 1,
        username: 'admin',
        email: 'admin@workbot.com',
        phone: '13800138000',
        status: 'active',
        role: 'admin',
        createdAt: '2024-01-01',
        lastLoginAt: '2024-02-15 10:30',
        robotsCount: 5,
        activationCode: 'ADMIN2024',
      },
      {
        id: 2,
        username: 'zhangsan',
        email: 'zhangsan@example.com',
        phone: '13800138001',
        status: 'active',
        role: 'user',
        createdAt: '2024-01-15',
        lastLoginAt: '2024-02-14 09:15',
        robotsCount: 2,
        activationCode: 'ABCD1234',
      },
      {
        id: 3,
        username: 'lisi',
        email: 'lisi@example.com',
        phone: null,
        status: 'active',
        role: 'vip',
        createdAt: '2024-02-01',
        lastLoginAt: '2024-02-15 14:20',
        robotsCount: 10,
        activationCode: 'EFGH5678',
      },
      {
        id: 4,
        username: 'wangwu',
        email: 'wangwu@example.com',
        phone: '13800138003',
        status: 'inactive',
        role: 'user',
        createdAt: '2024-02-10',
        lastLoginAt: null,
        robotsCount: 0,
        activationCode: null,
      },
    ];
    setUsers(mockUsers);
    setLoading(false);
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 dark:from-rose-900 dark:via-pink-900 dark:to-red-900 p-8">
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              用户管理
            </h1>
            <p className="text-xl text-rose-100 mb-6 max-w-2xl">
              管理系统用户，支持角色权限配置、激活码绑定和账户状态管理
            </p>
            <div className="flex gap-3">
              <Button className="bg-white text-rose-600 hover:bg-rose-50">
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

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-rose-50">用户总数</CardTitle>
              <Users className="h-4 w-4 text-rose-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users.length}</div>
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
              <CardTitle className="text-sm font-medium text-red-50">VIP 用户</CardTitle>
              <Crown className="h-4 w-4 text-red-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.filter(u => u.role === 'vip').length}
              </div>
              <p className="text-sm text-red-100 mt-1">会员用户</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-50">机器人总数</CardTitle>
              <Shield className="h-4 w-4 text-orange-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.reduce((sum, u) => sum + u.robotsCount, 0)}
              </div>
              <p className="text-sm text-orange-100 mt-1">已配置</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索用户名或邮箱..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                筛选
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
                    <TableHead>激活码</TableHead>
                    <TableHead>机器人数</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {user.role === 'admin' && <Crown className="h-4 w-4 text-yellow-500" />}
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === 'admin' ? 'default' : user.role === 'vip' ? 'secondary' : 'outline'
                          }
                        >
                          {user.role === 'admin' ? (
                            <span className="flex items-center gap-1">
                              <Crown className="h-3 w-3" />
                              管理员
                            </span>
                          ) : user.role === 'vip' ? (
                            <span className="flex items-center gap-1">
                              <Crown className="h-3 w-3" />
                              VIP
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
                        <Badge variant={user.status === 'active' ? 'default' : 'outline'}>
                          {user.status === 'active' ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              正常
                            </span>
                          ) : user.status === 'inactive' ? (
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              未激活
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              已禁用
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.activationCode ? (
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                            {user.activationCode}
                          </code>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Shield className="h-4 w-4 text-gray-600" />
                          {user.robotsCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          {user.createdAt}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt ? (
                          <span className="text-gray-600 dark:text-gray-400">{user.lastLoginAt}</span>
                        ) : (
                          <span className="text-gray-400">从未登录</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="text-rose-600">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600">
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
    </MainLayout>
  );
}
