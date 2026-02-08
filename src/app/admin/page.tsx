import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Activity, Users, Database, Settings } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            管理后台
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            WorkBot 系统管理和监控中心
          </p>
        </div>

        {/* 快速导航 */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/errors">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  错误监控
                </CardTitle>
                <CardDescription>
                  查看和分析系统错误日志
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  查看错误
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/activation-codes">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  激活码管理
                </CardTitle>
                <CardDescription>
                  管理和生成激活码
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  管理激活码
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/robots">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  机器人管理
                </CardTitle>
                <CardDescription>
                  配置和管理机器人
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  管理机器人
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/users">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  用户管理
                </CardTitle>
                <CardDescription>
                  查看和管理用户账户
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  管理用户
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/conversations">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-500" />
                  对话管理
                </CardTitle>
                <CardDescription>
                  查看和管理对话记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  管理对话
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-slate-500" />
                  系统设置
                </CardTitle>
                <CardDescription>
                  配置系统参数和选项
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  配置设置
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 系统状态 */}
        <Card>
          <CardHeader>
            <CardTitle>系统状态</CardTitle>
            <CardDescription>
              当前系统运行状态和健康检查
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">API 服务</span>
                <span className="text-sm text-green-500 font-medium">正常运行</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">数据库连接</span>
                <span className="text-sm text-green-500 font-medium">已连接</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">WebSocket 服务</span>
                <span className="text-sm text-yellow-500 font-medium">开发模式不可用</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
