'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/use-user-role';
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
  Wifi,
  FileText,
} from 'lucide-react';

const navigation = [
  { name: '首页', href: '/dashboard', icon: LayoutDashboard, gradient: 'from-blue-500 to-indigo-600', requireAdmin: false },
  { name: '我的机器人', href: '/robots', icon: Bot, gradient: 'from-purple-500 to-violet-600', requireAdmin: false },
  { name: '消息记录', href: '/messages', icon: MessageSquare, gradient: 'from-cyan-500 to-blue-600', requireAdmin: false },
  { name: '知识库', href: '/knowledge', icon: Database, gradient: 'from-pink-500 to-rose-600', requireAdmin: false },
  { name: '个人设置', href: '/profile', icon: User, gradient: 'from-emerald-500 to-green-600', requireAdmin: false },
  { name: '管理后台', href: '/admin', icon: Shield, gradient: 'from-violet-500 to-purple-600', requireAdmin: true },
  { name: '帮助文档', href: '/help', icon: HelpCircle, gradient: 'from-rose-500 to-pink-600', requireAdmin: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, loading } = useUserRole();

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
        {navigation
          .filter((item) => {
            // 如果正在加载，显示所有菜单项
            if (loading) return true;
            // 如果是管理员，显示所有菜单项
            if (isAdmin) return true;
            // 如果是普通用户，只显示不需要管理员权限的菜单项
            return !item.requireAdmin;
          })
          .map((item) => {
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
