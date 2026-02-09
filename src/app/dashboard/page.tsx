'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Activity, TrendingUp, Users, Plus, Bot, Key, MessageSquare } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const [stats, setStats] = useState({
    totalRobots: 0,
    totalActivationCodes: 0,
    unusedActivationCodes: 0,
    usedActivationCodes: 0,
    totalConversations: 0,
    totalMessages: 0,
    activeRobots: 0,
    todayMessages: 0,
    activeUsers: 0,
  })

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">仪表盘</h1>
          <Button onClick={() => router.push('/dashboard/robots')}>
            <Plus className="mr-2 h-4 w-4" />
            添加机器人
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">机器人总数</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRobots}</div>
              <p className="text-xs text-muted-foreground">{stats.activeRobots} 个在线</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">激活码数量</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActivationCodes}</div>
              <p className="text-xs text-muted-foreground">
                {stats.unusedActivationCodes} 未使用 · {stats.usedActivationCodes} 已使用
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">对话总数</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversations}</div>
              <p className="text-xs text-muted-foreground">历史对话记录</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">消息总数</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground">
                今日新增 {stats.todayMessages} 条
                <TrendingUp className="inline h-3 w-3 ml-1" />
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 使用趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>使用趋势</CardTitle>
            <CardDescription>最近 7 天的消息统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {[120, 156, 189, 234, 289, 312, 367].map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-700 hover:to-blue-500"
                    style={{ height: `${(value / 400) * 100}%` }}
                  />
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {7 - index}天前
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
