'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Key, MessageSquare, Database, Activity, Users } from 'lucide-react';

interface Stats {
  totalRobots: number;
  activeRobots: number;
  totalActivationCodes: number;
  usedActivationCodes: number;
  totalMessages: number;
  totalSessions: number;
  knowledgeBaseSize: number;
  onlineUsers: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalRobots: 0,
    activeRobots: 0,
    totalActivationCodes: 0,
    usedActivationCodes: 0,
    totalMessages: 0,
    totalSessions: 0,
    knowledgeBaseSize: 0,
    onlineUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 从 API 获取统计数据
    // 这里先使用模拟数据
    setTimeout(() => {
      setStats({
        totalRobots: 12,
        activeRobots: 8,
        totalActivationCodes: 50,
        usedActivationCodes: 32,
        totalMessages: 1250,
        totalSessions: 380,
        knowledgeBaseSize: 156,
        onlineUsers: 24,
      });
      setLoading(false);
    }, 500);
  }, []);

  const statCards = [
    {
      title: '机器人总数',
      value: stats.totalRobots,
      active: stats.activeRobots,
      icon: Bot,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '激活码',
      value: stats.totalActivationCodes,
      subtitle: `已使用 ${stats.usedActivationCodes}`,
      icon: Key,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: '消息总数',
      value: stats.totalMessages,
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '会话数',
      value: stats.totalSessions,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: '知识库',
      value: stats.knowledgeBaseSize,
      icon: Database,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      title: '在线用户',
      value: stats.onlineUsers,
      icon: Activity,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
          <p className="text-slate-500">欢迎使用 WorkBot 管理系统</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  {card.subtitle && (
                    <p className="text-xs text-slate-500">{card.subtitle}</p>
                  )}
                  {card.active !== undefined && (
                    <p className="text-xs text-slate-500">
                      活跃 {card.active} 个
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>快捷操作</CardTitle>
              <CardDescription>常用功能快速入口</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="/activation-codes"
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-purple-600" />
                  <span>创建激活码</span>
                </div>
                <span className="text-slate-400">→</span>
              </a>
              <a
                href="/robots"
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <span>添加机器人</span>
                </div>
                <span className="text-slate-400">→</span>
              </a>
              <a
                href="/knowledge"
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-cyan-600" />
                  <span>添加知识库内容</span>
                </div>
                <span className="text-slate-400">→</span>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>系统状态</CardTitle>
              <CardDescription>实时系统运行状态</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">服务状态</span>
                <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  运行中
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">数据库连接</span>
                <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  正常
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">AI 服务</span>
                <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  可用
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">WebSocket</span>
                <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  连接正常
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
