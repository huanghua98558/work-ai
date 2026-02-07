'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            WorkBot 控制台
          </h1>
          <Button onClick={handleLogout} variant="outline">
            退出登录
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            欢迎回来！
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            开始管理您的企业微信机器人
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-4xl font-bold text-blue-600 mb-2">0</div>
            <div className="text-gray-600 dark:text-gray-300">机器人数量</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-4xl font-bold text-green-600 mb-2">0</div>
            <div className="text-gray-600 dark:text-gray-300">激活码数量</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-4xl font-bold text-purple-600 mb-2">0</div>
            <div className="text-gray-600 dark:text-gray-300">对话数量</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-4xl font-bold text-orange-600 mb-2">0</div>
            <div className="text-gray-600 dark:text-gray-300">消息数量</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            快速操作
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                创建机器人
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                配置新的企业微信机器人，支持多种 AI 模型
              </p>
              <Button size="sm">创建机器人</Button>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                管理激活码
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                生成和管理激活码，支持批量操作
              </p>
              <Button size="sm" variant="outline">管理激活码</Button>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                查看统计数据
              </h4>
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                查看机器人的使用情况和统计数据
              </p>
              <Button size="sm" variant="outline">查看统计</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
