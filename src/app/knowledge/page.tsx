'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Plus,
  Search,
  Upload,
  FileText,
  Database,
  BarChart,
  Link as LinkIcon,
  Trash2,
  Edit,
  Brain,
  Zap,
  Globe,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface KnowledgeBase {
  id: number;
  name: string;
  description: string | null;
  type: string;
  remote_id: string | null;
  status: 'active' | 'disabled';
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export default function KnowledgePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 创建知识库对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createKbForm, setCreateKbForm] = useState({
    name: '',
    description: '',
    type: 'document',
    remoteId: '',
  });
  const [creating, setCreating] = useState(false);

  // 编辑知识库对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [editKbForm, setEditKbForm] = useState({
    name: '',
    description: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/knowledge-bases?page=${page}&limit=20`);

      if (response.data.success) {
        setKnowledgeBases(response.data.data);
        setTotal(response.data.pagination.total);
      } else {
        toast({
          title: "加载失败",
          description: response.data.error || "加载知识库列表失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('加载知识库列表失败:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载知识库列表失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledgeBases();
  }, [page]);

  const handleCreateKnowledgeBase = async () => {
    if (!createKbForm.name) {
      toast({
        title: "提示",
        description: "知识库名称不能为空",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const response = await apiClient.post('/api/knowledge-bases', createKbForm);

      if (response.data.success) {
        toast({
          title: "创建成功",
          description: "知识库创建成功",
        });
        setCreateDialogOpen(false);
        setCreateKbForm({
          name: '',
          description: '',
          type: 'document',
          remoteId: '',
        });
        loadKnowledgeBases();
      } else {
        toast({
          title: "创建失败",
          description: response.data.error || "创建知识库失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('创建知识库失败:', error);
      toast({
        title: "创建失败",
        description: error.message || "创建知识库失败",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditKnowledgeBase = async () => {
    if (!editingKb) return;

    try {
      setSaving(true);
      const response = await apiClient.put(`/api/knowledge-bases/${editingKb.id}`, editKbForm);

      if (response.data.success) {
        toast({
          title: "更新成功",
          description: "知识库更新成功",
        });
        setEditDialogOpen(false);
        setEditingKb(null);
        loadKnowledgeBases();
      } else {
        toast({
          title: "更新失败",
          description: response.data.error || "更新知识库失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('更新知识库失败:', error);
      toast({
        title: "更新失败",
        description: error.message || "更新知识库失败",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKnowledgeBase = async (kbId: number, kbName: string) => {
    if (!confirm(`确定要删除知识库 "${kbName}" 吗？此操作将同时删除知识库中的所有文档。`)) {
      return;
    }

    try {
      const response = await apiClient.delete(`/api/knowledge-bases/${kbId}`);

      if (response.data.success) {
        toast({
          title: "删除成功",
          description: "知识库删除成功",
        });
        loadKnowledgeBases();
      } else {
        toast({
          title: "删除失败",
          description: response.data.error || "删除知识库失败",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('删除知识库失败:', error);
      toast({
        title: "删除失败",
        description: error.message || "删除知识库失败",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (kb: KnowledgeBase) => {
    setEditingKb(kb);
    setEditKbForm({
      name: kb.name,
      description: kb.description || '',
      status: kb.status,
    });
    setEditDialogOpen(true);
  };

  if (loading) {
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
        {/* 页面标题 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 p-8">
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              知识库管理
            </h1>
            <p className="text-xl text-indigo-100 mb-6 max-w-2xl">
              构建企业知识库，支持文档、URL、数据库多种数据源，让 AI 更懂业务
            </p>
            <div className="flex gap-3">
              <Button className="bg-white text-indigo-600 hover:bg-indigo-50" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                创建知识库
              </Button>
              <Button className="bg-white/10 text-white border-white/50 hover:bg-white/20">
                <Upload className="mr-2 h-4 w-4" />
                上传文档
              </Button>
              <Button className="bg-white/10 text-white border-white/50 hover:bg-white/20">
                <Search className="mr-2 h-4 w-4" />
                全局搜索
              </Button>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-50">知识库数量</CardTitle>
              <BookOpen className="h-4 w-4 text-indigo-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{knowledgeBases.length}</div>
              <p className="text-sm text-indigo-100 mt-1">已创建</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-50">知识库类型</CardTitle>
              <Database className="h-4 w-4 text-purple-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {knowledgeBases.length}
              </div>
              <p className="text-sm text-purple-100 mt-1">已创建</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-pink-50">活跃知识库</CardTitle>
              <Globe className="h-4 w-4 text-pink-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {knowledgeBases.filter(kb => kb.status === 'active').length}
              </div>
              <p className="text-sm text-pink-100 mt-1">正常运行</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-50">禁用知识库</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {knowledgeBases.filter(kb => kb.status === 'disabled').length}
              </div>
              <p className="text-sm text-blue-100 mt-1">已禁用</p>
            </CardContent>
          </Card>
        </div>

        {/* 知识库列表 */}
        <Card className="border-2 border-indigo-100 dark:border-indigo-900">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              知识库列表
            </CardTitle>
            <CardDescription>管理您的企业知识库，支持文档上传、URL 导入和数据库连接</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              </div>
            ) : knowledgeBases.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                暂无知识库，点击&quot;创建知识库&quot;开始使用
              </div>
            ) : (
              <div className="space-y-4">
                {knowledgeBases.map((kb) => (
                  <div
                    key={kb.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{kb.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{kb.description || '暂无描述'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            类型: {kb.type}
                          </p>
                          {kb.remote_id && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              远程ID: {kb.remote_id}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={kb.status === 'active' ? 'default' : 'outline'}>
                        {kb.status === 'active' ? (
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            活跃
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            禁用
                          </span>
                        )}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-sm">
                        <div className="text-gray-600 dark:text-gray-400">类型</div>
                        <div className="font-semibold">{kb.type}</div>
                      </div>
                      <div className="text-sm">
                        <div className="text-gray-600 dark:text-gray-400">远程ID</div>
                        <div className="font-semibold">{kb.remote_id || '未配置'}</div>
                      </div>
                      <div className="text-sm">
                        <div className="text-gray-600 dark:text-gray-400">创建时间</div>
                        <div className="font-semibold">{new Date(kb.created_at).toLocaleDateString('zh-CN')}</div>
                      </div>
                      <div className="text-sm">
                        <div className="text-gray-600 dark:text-gray-400">最后更新</div>
                        <div className="font-semibold">{new Date(kb.updated_at).toLocaleDateString('zh-CN')}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-indigo-600" onClick={() => openEditDialog(kb)}>
                        <Edit className="mr-2 h-4 w-4" />
                        编辑
                      </Button>
                      <Button variant="ghost" size="sm" className="text-purple-600">
                        <Brain className="mr-2 h-4 w-4" />
                        测试问答
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 ml-auto" onClick={() => handleDeleteKnowledgeBase(kb.id, kb.name)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 创建知识库对话框 */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建知识库</DialogTitle>
              <DialogDescription>创建一个新的知识库来管理您的文档和数据</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="kb-name" className="text-right">
                  名称
                </Label>
                <Input
                  id="kb-name"
                  value={createKbForm.name}
                  onChange={(e) => setCreateKbForm({ ...createKbForm, name: e.target.value })}
                  className="col-span-3"
                  placeholder="请输入知识库名称"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="kb-description" className="text-right">
                  描述
                </Label>
                <Textarea
                  id="kb-description"
                  value={createKbForm.description}
                  onChange={(e) => setCreateKbForm({ ...createKbForm, description: e.target.value })}
                  className="col-span-3"
                  placeholder="请输入知识库描述"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="kb-type" className="text-right">
                  类型
                </Label>
                <Select
                  value={createKbForm.type}
                  onValueChange={(value) => setCreateKbForm({ ...createKbForm, type: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">文档</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="database">数据库</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="kb-remote-id" className="text-right">
                  远程ID（可选）
                </Label>
                <Input
                  id="kb-remote-id"
                  value={createKbForm.remoteId}
                  onChange={(e) => setCreateKbForm({ ...createKbForm, remoteId: e.target.value })}
                  className="col-span-3"
                  placeholder="请输入远程ID（留空则不设置）"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateKnowledgeBase} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑知识库对话框 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑知识库</DialogTitle>
              <DialogDescription>修改知识库信息</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-kb-name" className="text-right">
                  名称
                </Label>
                <Input
                  id="edit-kb-name"
                  value={editKbForm.name}
                  onChange={(e) => setEditKbForm({ ...editKbForm, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-kb-description" className="text-right">
                  描述
                </Label>
                <Textarea
                  id="edit-kb-description"
                  value={editKbForm.description}
                  onChange={(e) => setEditKbForm({ ...editKbForm, description: e.target.value })}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-kb-status" className="text-right">
                  状态
                </Label>
                <Select
                  value={editKbForm.status}
                  onValueChange={(value) => setEditKbForm({ ...editKbForm, status: value as 'active' | 'disabled' })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="disabled">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleEditKnowledgeBase} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
