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
  Zap,
  Shield,
  Globe,
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
        {/* 欢迎区域 - 使用渐变背景 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900 p-8">
          <div className="relative">
            <div className="inline-block px-4 py-2 mb-4 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <span className="text-white/90 text-sm font-medium">欢迎回来，开始管理您的机器人</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              WorkBot 控制台
            </h1>
            <p className="text-xl text-blue-100 mb-6 max-w-2xl">
              多平台智能机器人管理系统，统一管理企业微信、微信、小程序等多个平台的机器人
            </p>
            <div className="flex gap-3">
              <Link href="/robots">
                <Button className="bg-white text-blue-600 hover:bg-blue-50">
                  <Plus className="mr-2 h-4 w-4" />
                  创建机器人
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" className="bg-transparent text-white border-white/50 hover:bg-white/10">
                  <Settings className="mr-2 h-4 w-4" />
                  系统设置
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 统计卡片 - 使用渐变背景 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-50">机器人总数</CardTitle>
              <Bot className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalRobots}</div>
              <p className="text-sm text-blue-100 mt-1">
                {stats.activeRobots} 个在线
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-50">激活码数量</CardTitle>
              <Key className="h-4 w-4 text-green-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalActivationCodes}</div>
              <p className="text-sm text-green-100 mt-1">
                85 未使用 · 35 已使用
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-50">对话总数</CardTitle>
              <MessageSquare className="h-4 w-4 text-purple-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalConversations}</div>
              <p className="text-sm text-purple-100 mt-1">
                历史对话记录
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-50">消息总数</CardTitle>
              <Activity className="h-4 w-4 text-orange-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalMessages}</div>
              <p className="text-sm text-orange-100 mt-1">
                今日新增 {stats.todayMessages} 条
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-pink-50">活跃用户</CardTitle>
              <Users className="h-4 w-4 text-pink-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">28</div>
              <p className="text-sm text-pink-100 mt-1">
                最近 7 天活跃
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-cyan-50">响应速度</CardTitle>
              <Clock className="h-4 w-4 text-cyan-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">1.2s</div>
              <p className="text-sm text-cyan-100 mt-1">
                平均响应时间
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 快速操作 - 使用鲜艳的渐变色大卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link href="/robots" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                  <Bot className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-1">管理机器人</h3>
                <p className="text-sm text-blue-100">配置和管理您的机器人</p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
          </Link>

          <Link href="/activation-codes" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                  <Key className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-1">生成激活码</h3>
                <p className="text-sm text-green-100">创建和管理激活码</p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
          </Link>

          <Link href="/knowledge" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-6 text-white hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                  <Activity className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-1">知识库管理</h3>
                <p className="text-sm text-purple-100">上传和管理文档</p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
          </Link>

          <Link href="/messages" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-1">查看消息</h3>
                <p className="text-sm text-orange-100">查看对话记录</p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
          </Link>
        </div>

        {/* 快速操作第二行 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/users" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-red-600 p-6 text-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">用户管理</h3>
                      <p className="text-sm text-rose-100">管理系统用户和权限</p>
                    </div>
                  </div>
                </div>
                <div className="w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              </div>
            </div>
          </Link>

          <Link href="/settings" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-600 to-green-600 p-6 text-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Settings className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">系统设置</h3>
                      <p className="text-sm text-cyan-100">配置系统参数和选项</p>
                    </div>
                  </div>
                </div>
                <div className="w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              </div>
            </div>
          </Link>
        </div>

        {/* 最近对话、活跃机器人和最近激活码 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 最近对话 */}
          <Card className="border-2 border-blue-100 dark:border-blue-900">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    最近对话
                  </CardTitle>
                  <CardDescription>最新的对话记录</CardDescription>
                </div>
                <Link href="/messages">
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    查看全部
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>机器人</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentConversations.map((conv) => (
                    <TableRow key={conv.id}>
                      <TableCell className="font-medium">{conv.robotName}</TableCell>
                      <TableCell>{conv.user}</TableCell>
                      <TableCell>{conv.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 活跃机器人 */}
          <Card className="border-2 border-green-100 dark:border-green-900">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-green-600" />
                    活跃机器人
                  </CardTitle>
                  <CardDescription>最近活跃的机器人</CardDescription>
                </div>
                <Link href="/robots">
                  <Button variant="ghost" size="sm" className="text-green-600">
                    查看全部
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>消息数</TableHead>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 最近激活码 */}
          <Card className="border-2 border-green-100 dark:border-green-900">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-green-600" />
                    最近激活码
                  </CardTitle>
                  <CardDescription>最近生成或使用的激活码</CardDescription>
                </div>
                <Link href="/activation-codes">
                  <Button variant="ghost" size="sm" className="text-green-600">
                    查看全部
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>激活码</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-sm">ABCD1234</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">未使用</Badge>
                    </TableCell>
                    <TableCell>2分钟前</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-sm">EFGH5678</TableCell>
                    <TableCell>
                      <Badge variant="secondary">已使用</Badge>
                    </TableCell>
                    <TableCell>1小时前</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-sm">IJKL9012</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">未使用</Badge>
                    </TableCell>
                    <TableCell>3小时前</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* 使用趋势 - 使用渐变背景 */}
        <Card className="border-2 border-purple-100 dark:border-purple-900">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              使用趋势
            </CardTitle>
            <CardDescription>最近 7 天的消息统计</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
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

        {/* 平台支持卡片 - 新增 */}
        <Card className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white border-0">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">支持多平台</h3>
                <p className="text-indigo-100">同时支持企业微信、微信公众号、微信小程序等多个平台</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-2">
                    <Globe className="h-8 w-8" />
                  </div>
                  <div className="text-sm">企业微信</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-2">
                    <Shield className="h-8 w-8" />
                  </div>
                  <div className="text-sm">公众号</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-2">
                    <Zap className="h-8 w-8" />
                  </div>
                  <div className="text-sm">小程序</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
