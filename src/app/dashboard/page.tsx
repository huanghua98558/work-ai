'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Bot,
  Key,
  MessageSquare,
  Activity,
  TrendingUp,
  Users,
  Clock,
  ArrowUpRight,
  Plus,
  Settings,
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalRobots: 0,
    totalActivationCodes: 0,
    totalConversations: 0,
    totalMessages: 0,
    activeRobots: 0,
    todayMessages: 0,
  })
  const [recentConversations, setRecentConversations] = useState<any[]>([])
  const [recentRobots, setRecentRobots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    // 加载统计数据
    fetchDashboardData()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      // 这里可以调用 API 获取真实数据
      // 目前使用模拟数据
      setStats({
        totalRobots: 5,
        totalActivationCodes: 120,
        totalConversations: 85,
        totalMessages: 1234,
        activeRobots: 4,
        todayMessages: 67,
      })
      setRecentConversations([
        { id: 1, robotName: '客服机器人1', user: '用户001', lastMessage: '请问如何激活？', time: '2 分钟前', status: 'active' },
        { id: 2, robotName: '企业助手', user: '员工002', lastMessage: '查询销售数据', time: '15 分钟前', status: 'active' },
        { id: 3, robotName: '智能问答', user: '用户003', lastMessage: '产品价格是多少？', time: '1 小时前', status: 'closed' },
      ])
      setRecentRobots([
        { id: 1, name: '客服机器人1', status: 'online', messages: 456, lastActive: '2 分钟前' },
        { id: 2, name: '企业助手', status: 'online', messages: 321, lastActive: '5 分钟前' },
        { id: 3, name: '智能问答', status: 'offline', messages: 189, lastActive: '1 小时前' },
      ])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

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
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 欢迎区域 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              欢迎回来！
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              这里是 WorkBot 控制台，您可以管理所有机器人和系统设置
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/settings">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                设置
              </Button>
            </Link>
            <Link href="/robots">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                创建机器人
              </Button>
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">机器人总数</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRobots}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeRobots} 个在线
              </p>
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
                可用于激活新设备
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
              <p className="text-xs text-muted-foreground">
                历史对话记录
              </p>
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
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">28</div>
              <p className="text-xs text-muted-foreground">
                最近 7 天活跃
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">响应速度</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.2s</div>
              <p className="text-xs text-muted-foreground">
                平均响应时间
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用的管理功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link href="/robots">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                  <Bot className="h-6 w-6" />
                  <span>管理机器人</span>
                </Button>
              </Link>
              <Link href="/activation-codes">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                  <Key className="h-6 w-6" />
                  <span>生成激活码</span>
                </Button>
              </Link>
              <Link href="/knowledge">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                  <Activity className="h-6 w-6" />
                  <span>知识库管理</span>
                </Button>
              </Link>
              <Link href="/messages">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                  <MessageSquare className="h-6 w-6" />
                  <span>查看消息</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 最近对话和活跃机器人 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 最近对话 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>最近对话</CardTitle>
                  <CardDescription>最新的对话记录</CardDescription>
                </div>
                <Link href="/messages">
                  <Button variant="ghost" size="sm">
                    查看全部
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>机器人</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>最后消息</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentConversations.map((conv) => (
                    <TableRow key={conv.id}>
                      <TableCell className="font-medium">{conv.robotName}</TableCell>
                      <TableCell>{conv.user}</TableCell>
                      <TableCell className="max-w-xs truncate">{conv.lastMessage}</TableCell>
                      <TableCell>{conv.time}</TableCell>
                      <TableCell>
                        <Badge variant={conv.status === 'active' ? 'default' : 'secondary'}>
                          {conv.status === 'active' ? '进行中' : '已结束'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 活跃机器人 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>活跃机器人</CardTitle>
                  <CardDescription>最近活跃的机器人</CardDescription>
                </div>
                <Link href="/robots">
                  <Button variant="ghost" size="sm">
                    查看全部
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>消息数</TableHead>
                    <TableHead>最后活跃</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRobots.map((robot) => (
                    <TableRow key={robot.id}>
                      <TableCell className="font-medium">{robot.name}</TableCell>
                      <TableCell>
                        <Badge variant={robot.status === 'online' ? 'default' : 'secondary'}>
                          {robot.status === 'online' ? '在线' : '离线'}
                        </Badge>
                      </TableCell>
                      <TableCell>{robot.messages}</TableCell>
                      <TableCell>{robot.lastActive}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
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
