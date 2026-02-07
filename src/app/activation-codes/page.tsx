'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Copy, CheckCircle, XCircle, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ActivationCode {
  id: number;
  code: string;
  type: string;
  maxUses: number;
  usedCount: number;
  status: 'unused' | 'used' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export default function ActivationCodesPage() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'single',
    maxUses: 1,
    days: 30,
  });

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      const response = await apiClient.get<{ codes: ActivationCode[] }>('/api/activation-codes');
      if (response.data?.codes) {
        setCodes(response.data.codes);
      }
    } catch (error) {
      console.error('加载激活码失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await apiClient.post<{ code: string }>('/api/activation-codes', formData);
      if (response.data?.code) {
        await loadCodes();
        setDialogOpen(false);
      }
    } catch (error: any) {
      alert(error.message || '创建失败');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('已复制到剪贴板');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unused':
        return (
          <span className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3 text-blue-600" />
            <span className="text-blue-600">未使用</span>
          </span>
        );
      case 'used':
        return (
          <span className="flex items-center gap-1 text-xs">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span className="text-green-600">已使用</span>
          </span>
        );
      case 'expired':
        return (
          <span className="flex items-center gap-1 text-xs">
            <XCircle className="h-3 w-3 text-red-600" />
            <span className="text-red-600">已过期</span>
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">激活码管理</h1>
            <p className="text-slate-500">管理和创建激活码</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建激活码
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建激活码</DialogTitle>
                <DialogDescription>
                  创建新的激活码用于设备激活
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: string) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">单次使用</SelectItem>
                      <SelectItem value="unlimited">无限使用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.type === 'single' && (
                  <div className="space-y-2">
                    <Label>最大使用次数</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.maxUses}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>有效期（天）</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.days}
                    onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  创建
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>激活码列表</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">加载中...</div>
            ) : codes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">暂无激活码</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>激活码</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>使用次数</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono text-sm">{code.code}</TableCell>
                      <TableCell>
                        {code.type === 'single' ? '单次' : '无限'}
                      </TableCell>
                      <TableCell>
                        {code.usedCount}/{code.type === 'single' ? code.maxUses : '∞'}
                      </TableCell>
                      <TableCell>{getStatusBadge(code.status)}</TableCell>
                      <TableCell>
                        {new Date(code.expiresAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
