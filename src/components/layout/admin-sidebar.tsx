'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
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
  Users,
  Shield,
  MonitorPlay,
  RefreshCw,
  Code,
  HelpCircle,
  Download,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  gradient: string;
  category: string;
  requireAdmin?: boolean;
}

const navigation: NavItem[] = [
  // 按照使用频率和重要性排序
  { name: '仪表盘', href: '/admin', icon: LayoutDashboard, gradient: 'from-blue-500 to-indigo-600', category: '所有功能', requireAdmin: false },
  { name: '用户管理', href: '/users', icon: Users, gradient: 'from-teal-500 to-green-600', category: '所有功能', requireAdmin: false },
  { name: '机器人管理', href: '/admin/robots', icon: Bot, gradient: 'from-purple-500 to-violet-600', category: '所有功能', requireAdmin: true },
  { name: '消息管理', href: '/admin/messages', icon: MessageSquare, gradient: 'from-cyan-500 to-blue-600', category: '所有功能', requireAdmin: true },
  { name: 'AI 助手', href: '/admin/ai', icon: Sparkles, gradient: 'from-emerald-500 to-teal-600', category: '所有功能', requireAdmin: false },
  { name: '知识库管理', href: '/admin/knowledge', icon: Database, gradient: 'from-pink-500 to-rose-600', category: '所有功能', requireAdmin: true },
  { name: '数据导出', href: '/export', icon: Download, gradient: 'from-amber-500 to-orange-600', category: '所有功能', requireAdmin: true },
  { name: '激活码管理', href: '/activation-codes', icon: Key, gradient: 'from-emerald-500 to-green-600', category: '所有功能', requireAdmin: true },
  { name: '日志管理', href: '/logs', icon: FileText, gradient: 'from-slate-500 to-gray-600', category: '所有功能', requireAdmin: true },
  { name: '审计日志', href: '/audit-logs', icon: FileText, gradient: 'from-indigo-500 to-blue-600', category: '所有功能', requireAdmin: true },
  { name: '错误监控', href: '/admin/errors', icon: Activity, gradient: 'from-red-500 to-pink-600', category: '所有功能', requireAdmin: true },
  { name: '系统监控', href: '/monitor', icon: MonitorPlay, gradient: 'from-rose-500 to-red-600', category: '所有功能', requireAdmin: true },
  { name: 'WebSocket', href: '/websocket', icon: Wifi, gradient: 'from-yellow-500 to-amber-600', category: '所有功能', requireAdmin: true },
  { name: '权限诊断', href: '/verify', icon: Shield, gradient: 'from-violet-500 to-purple-600', category: '所有功能', requireAdmin: false },
  { name: '个人设置', href: '/profile', icon: User, gradient: 'from-blue-500 to-cyan-600', category: '所有功能', requireAdmin: false },
  { name: '系统设置', href: '/settings', icon: Settings, gradient: 'from-indigo-500 to-purple-600', category: '所有功能', requireAdmin: false },
  { name: '帮助文档', href: '/help', icon: HelpCircle, gradient: 'from-slate-500 to-gray-600', category: '所有功能', requireAdmin: false },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { isAdmin, loading, userRole } = useUserRole();

  // 从 localStorage 读取用户信息（备用）
  const [localUserInfo, setLocalUserInfo] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setLocalUserInfo(user);
          console.log('[AdminSidebar] localStorage user:', user);
        } catch (e) {
          console.error('[AdminSidebar] 解析 localStorage user 失败:', e);
        }
      }
    }
  }, []);

  // 优先使用 localStorage 中的用户角色，其次使用 token 解析结果
  const effectiveRole = localUserInfo?.role || userRole?.role || 'user';
  const effectiveIsAdmin = effectiveRole === 'admin';

  console.log('[AdminSidebar] 角色判断:', {
    localUserRole: localUserInfo?.role,
    tokenRole: userRole?.role,
    effectiveRole,
    effectiveIsAdmin,
    loading,
  });

  return (
    <div className="flex h-screen w-72 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white border-r border-slate-700/50">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              WorkBot
            </h1>
            <p className="text-xs text-slate-400">管理后台</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          // 根据权限过滤
          if (loading) {
            // 加载中，显示所有菜单项
          } else if (item.requireAdmin && !effectiveIsAdmin) {
            // 需要管理员权限但当前不是管理员，跳过
            return null;
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 mb-1',
                isActive
                  ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg border border-slate-700/50'
                  : 'text-slate-400 hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 hover:text-white hover:shadow-md'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  isActive
                    ? `bg-gradient-to-br ${item.gradient} bg-clip-text text-transparent`
                    : 'text-slate-500'
                )}
              />
              <span className="flex-1">{item.name}</span>
              {isActive && (
                <div className={cn('w-1.5 h-1.5 rounded-full bg-gradient-to-r', item.gradient)} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-700/50 p-4">
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-slate-800/50 rounded-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {effectiveIsAdmin ? '管理员' : '普通用户'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {loading ? '加载中...' : effectiveIsAdmin ? '拥有完整权限' : '受限访问'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 hover:text-red-400 hover:shadow-md"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </div>
  );
}
