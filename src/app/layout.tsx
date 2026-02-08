import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ErrorBoundary } from '@/components/error-boundary'
import { ErrorListener } from '@/components/error-listener'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WorkBot - 企业微信机器人管理系统',
  description: '基于 Next.js 16 + 扣子云平台的企业微信机器人管理系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <ErrorListener />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
