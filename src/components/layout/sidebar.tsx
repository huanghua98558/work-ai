'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Key,
  Bot,
  MessageSquare,
  Database,
  Activity,
  LogOut,
  User,
  Settings,
} from 'lucide-react';

const navigation = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard, gradient: 'from-blue-500 to-indigo-600' },
  { name: '激活码管理', href: '/activation-codes', icon: Key, gradient: 'from-green-500 to-emerald-600' },
  { name: '机器人管理', href: '/robots', icon: Bot, gradient: 'from-purple-500 to-violet-600' },
  { name: '消息中心', href: '/messages', icon: MessageSquare, gradient: 'from-cyan-500 to-blue-600' },
  { name: '知识库', href: '/knowledge', icon: Database, gradient: 'from-pink-500 to-rose-600' },
  { name: '系统监控', href: '/admin/errors', icon: Activity, gradient: 'from-orange-500 to-red-600' },
  { name: '用户管理', href: '/users', icon: User, gradient: 'from-teal-500 to-green-600' },
  { name: '系统设置', href: '/settings', icon: Settings, gradient: 'from-indigo-500 to-purple-600' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white border-r border-slate-800">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            WorkBot
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg border border-slate-700'
                  : 'text-slate-400 hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 hover:text-white hover:shadow-md'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  isActive
                    ? `bg-gradient-to-br ${item.gradient} bg-clip-text text-transparent`
                    : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              <span>{item.name}</span>
              {isActive && (
                <div className={cn('ml-auto w-2 h-2 rounded-full bg-gradient-to-r', item.gradient)} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-800 p-4">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 hover:text-red-400 hover:shadow-md"
        >
          <LogOut className="h-5 w-5" />
          退出登录
        </button>
      </div>
    </div>
  );
}
