'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
  Wifi,
  WifiOff,
} from 'lucide-react'

// 缓存键常量
const CACHE_KEYS = {
  STATS: 'dashboard_stats',
  CONVERSATIONS: 'dashboard_conversations',
  ROBOTS: 'dashboard_robots',
}

// 缓存有效期（5分钟）
const CACHE_TTL = 5 * 60 * 1000

// 获取缓存数据
const getCachedData = <T,>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()

    // 检查缓存是否过期
    if (now - timestamp > CACHE_TTL) {
      localStorage.removeItem(key)
      return null
    }

    return data
  } catch (error) {
    console.error('Error reading cache:', error)
    return null
  }
}

// 设置缓存数据
const setCachedData = <T,>(key: string, data: T): void => {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cacheItem))
  } catch (error) {
    console.error('Error setting cache:', error)
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalRobots: 0,
    totalActivationCodes: 0,
    unusedActivationCodes: 0,
    usedActivationCodes: 0,
    expiredActivationCodes: 0,
    totalConversations: 0,
    totalMessages: 0,
    activeRobots: 0,
    todayMessages: 0,
    activeUsers: 0,
  })
  const [recentConversations, setRecentConversations] = useState<any[]>([])
  const [recentRobots, setRecentRobots] = useState<any[]>([])
  const [recentActivationCodes, setRecentActivationCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [websocketData, setWebsocketData] = useState<{
    totalConnections: number;
    onlineRobots: any[];
    serverStatus: string;
  }>({
    totalConnections: 0,
    onlineRobots: [],
    serverStatus: 'unknown',
  })
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  // 模拟API数据获取（实际应该调用后端API）
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)

      // 尝试从缓存读取数据
      const cachedStats = getCachedData(CACHE_KEYS.STATS)
      const cachedConversations = getCachedData(CACHE_KEYS.CONVERSATIONS)
      const cachedRobots = getCachedData(CACHE_KEYS.ROBOTS)
      const cachedActivationCodes = getCachedData('dashboard_activation_codes')

      if (cachedStats && cachedConversations && cachedRobots && cachedActivationCodes) {
        // 使用缓存数据快速渲染
        setStats(cachedStats)
        setRecentConversations(cachedConversations)
        setRecentRobots(cachedRobots)
        setRecentActivationCodes(cachedActivationCodes)
        setLastUpdated(Date.now() - cachedStats.timestamp)
        setLoading(false)

        // 后台更新数据
        refreshData()
      } else {
        // 没有缓存，直接获取新数据
        await refreshData()
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setLoading(false)
    }
  }, [])

  // 刷新数据（获取最新数据）
  const refreshData = useCallback(async () => {
    try {
      setLoading(true)

      const token = localStorage.getItem('token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // 调用真实的API
      const response = await fetch('/api/dashboard/stats', { headers })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '获取数据失败')
      }

      // 从API响应中提取数据
      const apiData = data.data

      const newStats = {
        totalRobots: apiData.stats.totalRobots,
        totalActivationCodes: apiData.stats.totalActivationCodes,
        unusedActivationCodes: apiData.stats.unusedActivationCodes,
        usedActivationCodes: apiData.stats.usedActivationCodes,
        expiredActivationCodes: apiData.stats.expiredActivationCodes,
        totalConversations: apiData.stats.totalConversations,
        totalMessages: apiData.stats.totalMessages,
        activeRobots: apiData.stats.activeRobots,
        todayMessages: apiData.stats.todayMessages,
        activeUsers: apiData.stats.activeUsers,
      }

      const newConversations = apiData.recentConversations || []
      const newRobots = apiData.recentRobots || []

      // 更新状态
      setStats(newStats)
      setRecentConversations(newConversations)
      setRecentRobots(newRobots)
      setRecentActivationCodes(apiData.recentActivationCodes || [])
      setLastUpdated(Date.now())

      // 更新缓存
      setCachedData(CACHE_KEYS.STATS, newStats)
      setCachedData(CACHE_KEYS.CONVERSATIONS, newConversations)
      setCachedData(CACHE_KEYS.ROBOTS, newRobots)
      setCachedData('dashboard_activation_codes', apiData.recentActivationCodes || [])

      // 获取 WebSocket 数据
      try {
        console.log('[仪表盘] 开始获取 WebSocket 数据');
        const wsResponse = await fetch('/api/websocket/monitor', { headers })
        const wsData = await wsResponse.json()
        console.log('[仪表盘] WebSocket 响应:', wsData);
        if (wsData.success) {
          console.log('[仪表盘] WebSocket 服务器状态:', wsData.data.serverStatus);
          console.log('[仪表盘] WebSocket 连接数:', wsData.data.totalConnections);
          console.log('[仪表盘] WebSocket 在线机器人数:', wsData.data.onlineRobots?.length || 0);
          setWebsocketData(wsData.data)
        } else {
          console.error('[仪表盘] WebSocket API 返回失败:', wsData.error);
        }
      } catch (error) {
        console.error('[仪表盘] 获取 WebSocket 数据失败:', error)
      }
    } catch (error: any) {
      console.error('Failed to refresh data:', error)
      // 使用缓存数据作为fallback
      const cachedStats = getCachedData(CACHE_KEYS.STATS)
      const cachedConversations = getCachedData(CACHE_KEYS.CONVERSATIONS)
      const cachedRobots = getCachedData(CACHE_KEYS.ROBOTS)

      if (cachedStats) {
        setStats(cachedStats)
      }
      if (cachedConversations) {
        setRecentConversations(cachedConversations)
      }
      if (cachedRobots) {
        setRecentRobots(cachedRobots)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    // 加载统计数据
    fetchDashboardData()

    // 定期刷新 WebSocket 数据（每 5 秒）
    const wsInterval = setInterval(async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const wsResponse = await fetch('/api/websocket/monitor', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        const wsData = await wsResponse.json()
        if (wsData.success) {
          setWebsocketData(wsData.data)
        }
      } catch (error) {
        console.error('[仪表盘] 定期刷新 WebSocket 数据失败:', error)
      }
    }, 5000)

    return () => clearInterval(wsInterval)
  }, [router, fetchDashboardData])

  // 使用 useMemo 优化计算
  const onlineRobotsCount = useMemo(() => {
    return recentRobots.filter(r => r.status === 'online').length
  }, [recentRobots])

  const activeConversationsCount = useMemo(() => {
    return recentConversations.filter(c => c.status === 'active').length
  }, [recentConversations])

  if (loading && (!lastUpdated || lastUpdated > CACHE_TTL)) {
    // 首次加载或缓存过期时显示加载状态
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
          <StatCard
            title="机器人总数"
            value={stats.totalRobots}
            description={`${stats.activeRobots} 个在线`}
            icon={Bot}
            gradient="from-blue-500 to-blue-600"
          />

          <StatCard
            title="激活码数量"
            value={stats.totalActivationCodes}
            description={`${stats.unusedActivationCodes} 未使用 · ${stats.usedActivationCodes} 已使用`}
            icon={Key}
            gradient="from-green-500 to-green-600"
          />

          <StatCard
            title="对话总数"
            value={stats.totalConversations}
            description="历史对话记录"
            icon={MessageSquare}
            gradient="from-purple-500 to-purple-600"
          />

          <StatCard
            title="消息总数"
            value={stats.totalMessages}
            description={`今日新增 ${stats.todayMessages} 条`}
            icon={Activity}
            gradient="from-orange-500 to-orange-600"
          />

          <StatCard
            title="活跃用户"
            value="28"
            description="最近 7 天活跃"
            icon={Users}
            gradient="from-pink-500 to-pink-600"
          />

          <StatCard
            title="响应速度"
            value="1.2s"
            description="平均响应时间"
            icon={Clock}
            gradient="from-cyan-500 to-cyan-600"
          />
        </div>

        {/* 快速操作 - 使用鲜艳的渐变色大卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <QuickActionCard
            href="/robots"
            title="管理机器人"
            description="配置和管理您的机器人"
            icon={Bot}
            gradient="from-blue-500 to-indigo-600"
          />

          <QuickActionCard
            href="/activation-codes"
            title="生成激活码"
            description="创建和管理激活码"
            icon={Key}
            gradient="from-green-500 to-emerald-600"
          />

          <QuickActionCard
            href="/knowledge"
            title="知识库管理"
            description="上传和管理文档"
            icon={Activity}
            gradient="from-purple-500 to-pink-600"
          />

          <QuickActionCard
            href="/messages"
            title="查看消息"
            description="查看对话记录"
            icon={MessageSquare}
            gradient="from-orange-500 to-red-600"
          />
        </div>

        {/* 快速操作第二行 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WideQuickActionCard
            href="/users"
            title="用户管理"
            description="管理系统用户和权限"
            icon={Users}
            gradient="from-rose-500 via-pink-600 to-red-600"
          />

          <WideQuickActionCard
            href="/settings"
            title="系统设置"
            description="配置系统参数和选项"
            icon={Settings}
            gradient="from-cyan-500 via-teal-600 to-green-600"
          />
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
                    <TableHead>今日消息</TableHead>
                    <TableHead>最后活跃</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRobots.map((robot) => (
                    <TableRow key={robot.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{robot.name}</div>
                          {robot.robot_id && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {robot.robot_id}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={robot.status === 'online' ? 'default' : 'secondary'}
                          className={
                            robot.status === 'online'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                              : ''
                          }
                        >
                          {robot.status === 'online' ? '在线' : '离线'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{robot.todayMessages}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            总计: {robot.messages}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{robot.lastActive}</div>
                      </TableCell>
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
                    <TableHead>机器人</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivationCodes && recentActivationCodes.length > 0 ? (
                    recentActivationCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono text-sm">{code.code}</TableCell>
                        <TableCell>
                          <div>
                            {code.robotName ? (
                              <div className="text-sm font-medium">{code.robotName}</div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                            {code.robotId && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {code.robotId}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={code.status === 'unused' ? 'default' : 'secondary'}
                            className={
                              code.status === 'unused'
                                ? 'bg-green-500'
                                : code.status === 'used'
                                ? 'bg-blue-500'
                                : code.status === 'expired'
                                ? 'bg-red-500'
                                : 'bg-gray-500'
                            }
                          >
                            {code.status === 'unused'
                              ? '未使用'
                              : code.status === 'used'
                              ? '已使用'
                              : code.status === 'expired'
                              ? '已过期'
                              : '已禁用'}
                          </Badge>
                        </TableCell>
                        <TableCell>{code.timeAgo}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        暂无激活码
                      </TableCell>
                    </TableRow>
                  )}
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

        {/* WebSocket 监控板块 */}
        <Card className="border-2 border-yellow-100 dark:border-yellow-900">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-yellow-600" />
                  WebSocket 连接监控
                </CardTitle>
                <CardDescription>实时监控 WebSocket 连接状态和在线机器人</CardDescription>
              </div>
              <Link href="/websocket">
                <Button variant="ghost" size="sm" className="text-yellow-600">
                  查看详情
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* 服务器状态 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      websocketData.serverStatus === 'running'
                        ? 'bg-green-100 dark:bg-green-900'
                        : 'bg-red-100 dark:bg-red-900'
                    }`}
                  >
                    <Activity className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">服务器状态</div>
                    <div className="text-sm font-semibold">
                      {websocketData.serverStatus === 'running' ? '运行中' : '已停止'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">连接数</div>
                    <div className="text-sm font-semibold">{websocketData.totalConnections}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Wifi className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">在线机器人</div>
                    <div className="text-sm font-semibold">{websocketData.onlineRobots.length}</div>
                  </div>
                </div>
              </div>

              {/* 在线机器人列表 */}
              {websocketData.onlineRobots.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    在线机器人列表
                  </div>
                  {websocketData.onlineRobots.slice(0, 5).map((robot: any) => (
                    <div
                      key={robot.robotId}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <Wifi className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {robot.robotId}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            连接时间: {new Date(robot.connectedAt).toLocaleTimeString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                      >
                        在线
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无在线机器人</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 平台支持卡片 */}
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

// 提取的组件 - 统计卡片
function StatCard({ title, value, description, icon: Icon, gradient }: {
  title: string
  value: string | number
  description: string
  icon: any
  gradient: string
}) {
  return (
    <Card className={`bg-gradient-to-br ${gradient} text-white border-0`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium text-white/80`}>{title}</CardTitle>
        <Icon className="h-4 w-4 text-white/70" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-sm text-white/80 mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

// 提取的组件 - 快速操作卡片
function QuickActionCard({ href, title, description, icon: Icon, gradient }: {
  href: string
  title: string
  description: string
  icon: any
  gradient: string
}) {
  return (
    <Link href={href} className="group">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer`}>
        <div className="relative z-10">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
            <Icon className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold mb-1">{title}</h3>
          <p className="text-sm text-white/80">{description}</p>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>
    </Link>
  )
}

// 提取的组件 - 宽版快速操作卡片
function WideQuickActionCard({ href, title, description, icon: Icon, gradient }: {
  href: string
  title: string
  description: string
  icon: any
  gradient: string
}) {
  return (
    <Link href={href} className="group">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradient} p-6 text-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer`}>
        <div className="flex items-center justify-between">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-sm text-white/80">{description}</p>
              </div>
            </div>
          </div>
          <div className="w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        </div>
      </div>
    </Link>
  )
}
