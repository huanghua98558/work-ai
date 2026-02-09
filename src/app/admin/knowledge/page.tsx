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

export default function AdminKnowledgePage() {
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

      if (response.success) {
        setKnowledgeBases(response.data);
        setTotal(response.data.pagination.total);
      } else {
        toast({
          title: "加载失败",
          description: response.error || "加载知识库列表失败",
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

      if (response.success) {
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
          description: response.error || "创建知识库失败",
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

      if (response.success) {
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
          description: response.error || "更新知识库失败",
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
      
      if (response.success) {
        toast({
          title: "删除成功",
          description: "知识库删除成功",
        });
        loadKnowledgeBases();
      } else {
        toast({
          title: "删除失败",
          description: response.error || "删除知识库失败",
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

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">启用</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">禁用</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'url':
        return <Globe className="h-4 w-4 text-green-500" />;
      case 'remote':
        return <Database className="h-4 w-4 text-purple-500" />;
      default:
        return <BookOpen className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'document':
        return '文档知识库';
      case 'url':
        return '网页知识库';
      case 'remote':
        return '远程知识库';
      default:
        return type;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">知识库管理</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              管理所有知识库，支持文档、网页和远程知识库
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Plus className="h-4 w-4 mr-2" />
                创建知识库
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建知识库</DialogTitle>
                <DialogDescription>创建一个新的知识库用于存储和管理文档</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="kb-name">知识库名称 *</Label>
                  <Input
                    id="kb-name"
                    value={createKbForm.name}
                    onChange={(e) => setCreateKbForm({ ...createKbForm, name: e.target.value })}
                    placeholder="例如：产品文档知识库"
                  />
                </div>
                <div>
                  <Label htmlFor="kb-description">描述</Label>
                  <Textarea
                    id="kb-description"
                    value={createKbForm.description}
                    onChange={(e) => setCreateKbForm({ ...createKbForm, description: e.target.value })}
                    placeholder="描述知识库的用途和内容"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="kb-type">知识库类型</Label>
                  <Select
                    value={createKbForm.type}
                    onValueChange={(value) => setCreateKbForm({ ...createKbForm, type: value })}
                  >
                    <SelectTrigger id="kb-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">文档知识库</SelectItem>
                      <SelectItem value="url">网页知识库</SelectItem>
                      <SelectItem value="remote">远程知识库</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {createKbForm.type === 'remote' && (
                  <div>
                    <Label htmlFor="kb-remote-id">远程 ID</Label>
                    <Input
                      id="kb-remote-id"
                      value={createKbForm.remoteId}
                      onChange={(e) => setCreateKbForm({ ...createKbForm, remoteId: e.target.value })}
                      placeholder="输入远程知识库的 ID"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreateKnowledgeBase}
                  disabled={creating}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    '创建'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>总知识库数</CardDescription>
              <CardTitle className="text-3xl">{total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <Database className="h-4 w-4 mr-2 text-blue-500" />
                所有知识库
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>文档知识库</CardDescription>
              <CardTitle className="text-3xl">
                {knowledgeBases.filter(kb => kb.type === 'document').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <FileText className="h-4 w-4 mr-2 text-blue-500" />
                本地文档存储
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>网页知识库</CardDescription>
              <CardTitle className="text-3xl">
                {knowledgeBases.filter(kb => kb.type === 'url').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <Globe className="h-4 w-4 mr-2 text-green-500" />
                网页爬取内容
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>远程知识库</CardDescription>
              <CardTitle className="text-3xl">
                {knowledgeBases.filter(kb => kb.type === 'remote').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <LinkIcon className="h-4 w-4 mr-2 text-purple-500" />
                远程集成
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 知识库列表 */}
        <Card>
          <CardHeader>
            <CardTitle>知识库列表</CardTitle>
            <CardDescription>管理所有已创建的知识库</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : knowledgeBases.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  暂无知识库
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  开始创建第一个知识库来管理你的文档
                </p>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  创建知识库
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {knowledgeBases.map((kb) => (
                  <Card key={kb.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getTypeIcon(kb.type)}
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                              {kb.name}
                            </h3>
                            {getStatusBadge(kb.status)}
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 mb-3">
                            {kb.description || '暂无描述'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center">
                              {getTypeLabel(kb.type)}
                            </span>
                            <span className="flex items-center">
                              创建于 {new Date(kb.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setEditingKb(kb);
                              setEditKbForm({
                                name: kb.name,
                                description: kb.description || '',
                                status: kb.status,
                              });
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteKnowledgeBase(kb.id, kb.name)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑知识库</DialogTitle>
            <DialogDescription>更新知识库的配置信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-kb-name">知识库名称</Label>
              <Input
                id="edit-kb-name"
                value={editKbForm.name}
                onChange={(e) => setEditKbForm({ ...editKbForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-kb-description">描述</Label>
              <Textarea
                id="edit-kb-description"
                value={editKbForm.description}
                onChange={(e) => setEditKbForm({ ...editKbForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-kb-status">状态</Label>
              <Select
                value={editKbForm.status}
                onValueChange={(value: any) => setEditKbForm({ ...editKbForm, status: value })}
              >
                <SelectTrigger id="edit-kb-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="disabled">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button
              onClick={handleEditKnowledgeBase}
              disabled={saving}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
