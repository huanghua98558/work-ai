'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function TestPage() {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // 从 localStorage 读取
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')
        const parsedUser = user ? JSON.parse(user) : null

        // 从 API 获取最新信息
        const response = await fetch('/api/users/me')
        const data = await response.json()

        setUserInfo({
          localStorage: {
            token: token ? `${token.substring(0, 50)}...` : null,
            user: parsedUser,
          },
          api: data,
        })
      } catch (error) {
        console.error('Failed to load user info:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserInfo()
  }, [])

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">权限测试页面</h1>

        {loading ? (
          <div>加载中...</div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>用户信息</CardTitle>
                <CardDescription>当前登录用户的详细信息</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-950 text-slate-50 p-4 rounded text-xs overflow-x-auto">
                  {JSON.stringify(userInfo, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>权限检查</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <span>当前用户角色：</span>
                  <Badge variant={userInfo?.api?.data?.role === 'admin' ? 'default' : 'secondary'}>
                    {userInfo?.api?.data?.role || '未知'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>是否为管理员：</span>
                  <Badge variant={userInfo?.api?.data?.role === 'admin' ? 'default' : 'destructive'}>
                    {userInfo?.api?.data?.role === 'admin' ? '是' : '否'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={() => window.location.href = '/dashboard'}>
                  前往 Dashboard
                </Button>
                <Button onClick={() => window.location.href = '/admin/errors'} variant="outline">
                  前往管理员页面
                </Button>
                <Button
                  onClick={() => {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    window.location.href = '/login'
                  }}
                  variant="destructive"
                >
                  退出登录
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  )
}
