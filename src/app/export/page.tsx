'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Download,
  FileText,
  Database,
  Users,
  Bot,
  MessageSquare,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Key,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function ExportPage() {
  const [exporting, setExporting] = useState(false);
  const [dataType, setDataType] = useState<'users' | 'robots' | 'messages' | 'activation-codes'>('messages');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const handleExport = async () => {
    setExporting(true);

    try {
      let data: any[] = [];
      let filename = '';
      let headers: string[] = [];

      switch (dataType) {
        case 'users':
          // 导出用户数据
          const usersResponse = await apiClient.get('/api/users');
          if (usersResponse.data.success) {
            data = usersResponse.data.data;
            filename = `users-export-${Date.now()}.csv`;
            headers = ['ID', '手机号', '昵称', '角色', '状态', '创建时间', '最后登录'];
          }
          break;

        case 'robots':
          // 导出机器人数据
          const robotsResponse = await apiClient.get('/api/robots');
          if (robotsResponse.data.success) {
            data = robotsResponse.data.data;
            filename = `robots-export-${Date.now()}.csv`;
            headers = ['ID', 'Bot ID', '名称', '昵称', '状态', 'AI 模式', 'AI 提供商', '消息数', '创建时间'];
          }
          break;

        case 'messages':
          // 导出消息数据
          const messagesResponse = await apiClient.get('/api/messages/list', {
            params: {
              limit: 10000,
              offset: 0,
            },
          });
          if (messagesResponse.data.success) {
            data = messagesResponse.data.data.messages || [];
            filename = `messages-export-${Date.now()}.csv`;
            headers = ['ID', '机器人ID', '用户ID', '会话ID', '方向', '消息内容', '状态', '创建时间'];
          }
          break;

        case 'activation-codes':
          // 导出激活码数据
          const codesResponse = await apiClient.get('/api/activation-codes');
          if (codesResponse.data.success) {
            data = codesResponse.data.data || [];
            filename = `activation-codes-export-${Date.now()}.csv`;
            headers = ['ID', '激活码', '天数', '状态', '使用用户ID', '使用时间', '创建时间', '过期时间'];
          }
          break;
      }

      if (data && data.length > 0) {
        // 生成 CSV 内容
        const csv = [
          headers.join(','),
          ...data.map((item: any) => {
            return headers.map(header => {
              // 获取对应字段的值
              let value = '';
              switch (header) {
                case 'ID':
                  value = item.id || item.robotId || item.bot_id || '';
                  break;
                case 'Bot ID':
                  value = item.bot_id || '';
                  break;
                case '手机号':
                  value = item.phone || '';
                  break;
                case '昵称':
                  value = item.nickname || item.user_nickname || item.name || '';
                  break;
                case '角色':
                  value = item.role || '';
                  break;
                case '状态':
                  value = item.status || '';
                  break;
                case '创建时间':
                  value = item.created_at || '';
                  break;
                case '最后登录':
                  value = item.last_login_at || item.last_active_at || '';
                  break;
                case 'AI 模式':
                  value = item.ai_mode || '';
                  break;
                case 'AI 提供商':
                  value = item.ai_provider || '';
                  break;
                case '消息数':
                  value = item.total_messages || '';
                  break;
                case '机器人ID':
                  value = item.robotId || '';
                  break;
                case '用户ID':
                  value = item.userId || '';
                  break;
                case '会话ID':
                  value = item.sessionId || '';
                  break;
                case '方向':
                  value = item.direction || '';
                  break;
                case '消息内容':
                  value = item.content ? `"${item.content.replace(/"/g, '""')}"` : '';
                  break;
                case '激活码':
                  value = item.code || '';
                  break;
                case '天数':
                  value = item.days || '';
                  break;
                case '使用用户ID':
                  value = item.used_by || '';
                  break;
                case '使用时间':
                  value = item.used_at || '';
                  break;
                case '过期时间':
                  value = item.expires_at || '';
                  break;
                default:
                  value = '';
              }
              return value;
            }).join(',');
          }),
        ].join('\n');

        // 添加 BOM 以支持 Excel 正确显示中文
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);

        toast({
          title: "导出成功",
          description: `已成功导出 ${data.length} 条数据`,
        });
      } else {
        toast({
          title: "没有数据",
          description: "当前没有可导出的数据",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('导出失败:', error);
      toast({
        title: "导出失败",
        description: error.message || "导出数据失败，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">数据导出</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              导出系统数据用于备份和分析
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
          >
            {exporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                立即导出
              </>
            )}
          </Button>
        </div>

        {/* 导出选项 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              导出选项
            </CardTitle>
            <CardDescription>
              选择要导出的数据类型和时间范围
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="data-type">数据类型</Label>
                <Select value={dataType} onValueChange={(value: any) => setDataType(value)}>
                  <SelectTrigger id="data-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="users">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-blue-500" />
                        用户数据
                      </div>
                    </SelectItem>
                    <SelectItem value="robots">
                      <div className="flex items-center">
                        <Bot className="h-4 w-4 mr-2 text-purple-500" />
                        机器人数据
                      </div>
                    </SelectItem>
                    <SelectItem value="messages">
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2 text-cyan-500" />
                        消息记录
                      </div>
                    </SelectItem>
                    <SelectItem value="activation-codes">
                      <div className="flex items-center">
                        <Key className="h-4 w-4 mr-2 text-emerald-500" />
                        激活码数据
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-range">时间范围</Label>
                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                  <SelectTrigger id="date-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center">
                        <Database className="h-4 w-4 mr-2 text-slate-500" />
                        全部数据
                      </div>
                    </SelectItem>
                    <SelectItem value="today">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-green-500" />
                        今天
                      </div>
                    </SelectItem>
                    <SelectItem value="week">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                        最近7天
                      </div>
                    </SelectItem>
                    <SelectItem value="month">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                        最近30天
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 导出说明 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">用户数据</CardTitle>
              </div>
              <CardDescription>
                包含用户的基本信息、角色、状态等
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                • 手机号、昵称<br />
                • 角色、状态<br />
                • 创建时间、最后登录
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">机器人数据</CardTitle>
              </div>
              <CardDescription>
                包含机器人的配置和使用情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                • Bot ID、名称<br />
                • AI 模式、提供商<br />
                • 消息统计、状态
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-cyan-500" />
                <CardTitle className="text-lg">消息记录</CardTitle>
              </div>
              <CardDescription>
                包含所有用户与机器人的对话记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                • 机器人ID、用户ID<br />
                • 消息方向、内容<br />
                • 时间戳、状态
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-lg">激活码数据</CardTitle>
              </div>
              <CardDescription>
                包含激活码的生成和使用情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                • 激活码、天数<br />
                • 状态、使用用户<br />
                • 使用时间、过期时间
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 注意事项 */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              导出说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
              <li>• 导出的数据为 CSV 格式，可使用 Excel 打开</li>
              <li>• 大量数据导出可能需要较长时间，请耐心等待</li>
              <li>• 导出的数据包含敏感信息，请注意保密</li>
              <li>• 建议定期导出数据进行备份</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
