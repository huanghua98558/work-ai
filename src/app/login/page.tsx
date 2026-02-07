'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')

  const handleSendCode = async () => {
    // TODO: 实现发送验证码功能
    console.log('发送验证码:', phone)
  }

  const handleLogin = async () => {
    // TODO: 实现登录功能
    console.log('登录:', phone, code)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">WorkBot 登录</CardTitle>
          <CardDescription className="text-center">
            使用手机号验证码登录
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">手机号</label>
            <input
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">验证码</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="请输入验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
              />
              <Button 
                onClick={handleSendCode}
                disabled={!phone}
                variant="outline"
              >
                发送验证码
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleLogin}
            disabled={!phone || !code}
            className="w-full"
            size="lg"
          >
            登录
          </Button>

          <div className="text-center text-sm text-gray-500">
            <Link href="/" className="hover:underline">
              返回首页
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
