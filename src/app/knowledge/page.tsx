'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Plus, Search, Upload, Link as LinkIcon } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface SearchResult {
  content: string;
  score?: number;
  metadata?: Record<string, any>;
}

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState('add');
  const [addType, setAddType] = useState<'text' | 'url'>('text');
  const [textData, setTextData] = useState('');
  const [urlData, setUrlData] = useState('');
  const [dataset, setDataset] = useState('workbot_knowledge');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    try {
      setLoading(true);
      if (addType === 'text') {
        await apiClient.post('/api/knowledge/add', {
          type: 'text',
          content: textData,
          dataset,
        });
        setTextData('');
      } else {
        await apiClient.post('/api/knowledge/add', {
          type: 'url',
          url: urlData,
          dataset,
        });
        setUrlData('');
      }
      alert('添加成功');
    } catch (error: any) {
      alert(error.message || '添加失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await apiClient.get<{ results: SearchResult[] }>(
        `/api/knowledge/search?query=${encodeURIComponent(searchQuery)}&dataset=${dataset}`
      );
      if (response.data?.results) {
        setSearchResults(response.data.results);
      }
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">知识库管理</h1>
          <p className="text-slate-500">管理 AI 助手的知识库内容</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="add">添加内容</TabsTrigger>
            <TabsTrigger value="search">搜索知识</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>添加新内容</CardTitle>
                <CardDescription>
                  将文本或网页 URL 添加到知识库
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={addType === 'text' ? 'default' : 'outline'}
                    onClick={() => setAddType('text')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    文本
                  </Button>
                  <Button
                    variant={addType === 'url' ? 'default' : 'outline'}
                    onClick={() => setAddType('url')}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    URL
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>数据集</Label>
                  <Select value={dataset} onValueChange={setDataset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workbot_knowledge">workbot_knowledge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {addType === 'text' ? (
                  <div className="space-y-2">
                    <Label>内容</Label>
                    <Textarea
                      placeholder="输入要添加的文本内容..."
                      value={textData}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTextData(e.target.value)}
                      rows={8}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={urlData}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrlData(e.target.value)}
                    />
                  </div>
                )}

                <Button onClick={handleAdd} disabled={loading} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {loading ? '添加中...' : '添加到知识库'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>搜索知识库</CardTitle>
                <CardDescription>
                  在知识库中搜索相关内容
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="输入搜索关键词..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    搜索
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>数据集</Label>
                  <Select value={dataset} onValueChange={setDataset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workbot_knowledge">workbot_knowledge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <div className="text-sm font-medium">搜索结果 ({searchResults.length})</div>
                    {searchResults.map((result, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm">{result.content}</p>
                            </div>
                            {result.score && (
                              <div className="text-xs text-slate-500 whitespace-nowrap">
                                相似度: {(result.score * 100).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
