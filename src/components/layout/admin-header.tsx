'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Search, User, LogOut, Menu, Shield } from 'lucide-react';
import Link from 'next/link';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="搜索功能、用户、机器人..."
            className="w-80 pl-10 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        {/* Separator */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* User Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <Shield className="h-4 w-4 mr-2 text-blue-600" />
              用户视图
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </Button>
        </div>
      </div>
    </header>
  );
}
