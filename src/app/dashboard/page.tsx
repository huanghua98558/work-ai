'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Bot,
  Key,
  MessageSquare,
  Activity,
  TrendingUp,
  Users,
  Plus,
  Settings,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Clock,
  BarChart3,
  Database,
  Wifi,
  Menu,
  Bell,
  Search,
  Filter,
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    setMounted(true)
    // 检查是否已登录
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken')
    if (!token) {
      router.push('/login')
      return
    }

    // 获取用户角色
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserRole(user.role || '')
      } catch (e) {
        console.error('解析用户信息失败:', e)
      }
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

  if (!mounted) {
    return null
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* 顶部导航栏 */}
        <div className="border-b border-slate-200/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">WorkBot</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">企业微信机器人管理系统</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* 管理员入口 */}
                {userRole === 'admin' && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="rounded-full gap-2">
                      <Shield className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <span className="text-sm">管理后台</span>
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Search className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                  <Bell className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Settings className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 主要内容区 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 欢迎区域 - 大型横幅 */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 md:p-12 mb-8 shadow-2xl shadow-violet-500/30">
            {/* 装饰性背景元素 */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-pink-400/30 rounded-full blur-2xl"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-white/20 text-white border-white/20 hover:bg-white/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  新功能上线
                </Badge>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                欢迎回到 WorkBot
              </h2>
              <p className="text-lg text-violet-100 mb-8 max-w-2xl">
                智能管理您的企业微信机器人，支持多平台集成、知识库管理、实时监控等功能
              </p>

              {/* 主要操作按钮组 */}
              <div className="flex flex-wrap gap-4">
                {/* 激活入口按钮 - 突出显示 */}
                <Button
                  size="lg"
                  className="bg-white text-violet-700 hover:bg-violet-50 px-8 py-6 text-base font-semibold rounded-xl shadow-xl shadow-white/20 hover:shadow-2xl hover:shadow-white/30 transition-all duration-300 hover:scale-105"
                  onClick={() => router.push('/activation-codes')}
                >
                  <Key className="h-5 w-5 mr-2" />
                  立即激活机器人
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20 px-6 py-6 text-base font-semibold rounded-xl backdrop-blur-sm"
                  onClick={() => router.push('/dashboard/robots')}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  创建新机器人
                </Button>
              </div>
            </div>
          </div>

          {/* 快速统计卡片 - 现代化设计 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 机器人卡片 */}
            <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-10 rounded-bl-3xl transition-opacity group-hover:opacity-20"></div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-1 rounded-full">
                    <Activity className="h-3 w-3 mr-1" />
                    运行中
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                  {stats.totalRobots}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  机器人总数
                </p>
                <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  {stats.activeRobots} 个在线
                </div>
              </CardContent>
            </Card>

            {/* 激活码卡片 */}
            <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-10 rounded-bl-3xl transition-opacity group-hover:opacity-20"></div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Key className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded-full">
                    <Zap className="h-3 w-3 mr-1" />
                    可用
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                  {stats.totalActivationCodes}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  激活码总数
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <span className="flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                    {stats.unusedActivationCodes} 未使用
                  </span>
                  <span className="flex items-center">
                    <Activity className="h-3 w-3 mr-1 text-blue-500" />
                    {stats.usedActivationCodes} 已使用
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 对话卡片 */}
            <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-500 opacity-10 rounded-bl-3xl transition-opacity group-hover:opacity-20"></div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12%
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                  {stats.totalConversations}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  对话总数
                </p>
                <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
                  <Clock className="h-3 w-3 mr-1" />
                  历史对话记录
                </div>
              </CardContent>
            </Card>

            {/* 消息卡片 */}
            <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 opacity-10 rounded-bl-3xl transition-opacity group-hover:opacity-20"></div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +8%
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                  {stats.totalMessages}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  消息总数
                </p>
                <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  今日新增 {stats.todayMessages} 条
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 快速操作区 - 大型卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 激活机器人 */}
            <Card className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-violet-200 dark:border-violet-900 overflow-hidden bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950/50"
                  onClick={() => router.push('/activation-codes')}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500 to-purple-500 opacity-10 rounded-bl-full transition-opacity group-hover:opacity-20"></div>
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/30 group-hover:shadow-2xl group-hover:shadow-violet-500/40 transition-all">
                  <Key className="h-8 w-8 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  激活机器人
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  使用激活码快速激活您的机器人，开始智能对话
                </p>
                <div className="flex items-center text-sm font-medium text-violet-600 dark:text-violet-400">
                  立即激活
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            {/* 管理机器人 */}
            <Card className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-blue-200 dark:border-blue-900 overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950/50"
                  onClick={() => router.push('/dashboard/robots')}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-10 rounded-bl-full transition-opacity group-hover:opacity-20"></div>
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-xl shadow-blue-500/30 group-hover:shadow-2xl group-hover:shadow-blue-500/40 transition-all">
                  <Bot className="h-8 w-8 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  管理机器人
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  配置机器人参数，管理对话策略和知识库
                </p>
                <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                  查看详情
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            {/* 查看数据 */}
            <Card className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-emerald-200 dark:border-emerald-900 overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950/50"
                  onClick={() => router.push('/messages')}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-10 rounded-bl-full transition-opacity group-hover:opacity-20"></div>
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 group-hover:shadow-2xl group-hover:shadow-emerald-500/40 transition-all">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  查看数据
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  分析对话数据，优化机器人性能和用户体验
                </p>
                <div className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  查看数据
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 平台支持卡片 */}
          <Card className="border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    多平台支持
                  </h3>
                  <p className="text-slate-300">
                    一个机器人，连接多个平台
                  </p>
                </div>
                <div className="hidden md:flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                      <Globe className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-xs text-slate-300 mt-2">企业微信</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <Shield className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-xs text-slate-300 mt-2">微信公众号</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                      <Zap className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-xs text-slate-300 mt-2">小程序</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
