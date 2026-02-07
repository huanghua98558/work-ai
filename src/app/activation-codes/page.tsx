'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

interface ActivationCode {
  id: number;
  code: string;
  status: 'unused' | 'used' | 'expired' | 'disabled';
  validityPeriod: number;
  boundUserId: number | null;
  price: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export default function ActivationCodesPage() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟数据加载
    const mockCodes: ActivationCode[] = [
      {
        id: 1,
        code: 'ABCD1234',
        status: 'unused',
        validityPeriod: 365,
        boundUserId: null,
        price: '99.00',
        createdAt: '2024-02-01',
        expiresAt: '2025-02-01',
        usedAt: null,
      },
      {
        id: 2,
        code: 'EFGH5678',
        status: 'used',
        validityPeriod: 365,
        boundUserId: 101,
        price: '99.00',
        createdAt: '2024-01-20',
        expiresAt: '2025-01-20',
        usedAt: '2024-01-25',
      },
      {
        id: 3,
        code: 'IJKL9012',
        status: 'unused',
        validityPeriod: 365,
        boundUserId: null,
        price: '99.00',
        createdAt: '2024-02-05',
        expiresAt: '2025-02-05',
        usedAt: null,
      },
    ];
    setCodes(mockCodes);
    setLoading(false);
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('已复制到剪贴板');
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
            <div className="flex gap-3">
              <Button className="bg-white text-green-600 hover:bg-green-50">
                <Plus className="mr-2 h-4 w-4" />
                生成新激活码
              </Button>
              <Button className="bg-white/10 text-white border-white/50 hover:bg-white/20">
                <Download className="mr-2 h-4 w-4" />
                批量导出
              </Button>
              <Button className="bg-white/10 text-white border-white/50 hover:bg-white/20">
                <RefreshCw className="mr-2 h-4 w-4" />
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
              <div className="text-3xl font-bold">¥{codes.length * 99}</div>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>激活码</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>有效期</TableHead>
                    <TableHead>价格</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead>使用时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
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
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              已过期
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{code.validityPeriod} 天</TableCell>
                      <TableCell>¥{code.price}</TableCell>
                      <TableCell>{code.createdAt}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          {code.expiresAt}
                        </div>
                      </TableCell>
                      <TableCell>
                        {code.usedAt ? (
                          <span className="text-gray-600 dark:text-gray-400">{code.usedAt}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-green-600">
                          详情
                        </Button>
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
