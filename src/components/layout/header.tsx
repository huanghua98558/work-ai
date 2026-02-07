'use client';

import { useState } from 'react';
import { Bell, Search, Menu, User as UserIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 w-80">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="搜索功能、机器人、用户..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-4">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-br from-red-500 to-rose-600 text-white">
            3
          </Badge>
        </Button>

        {/* User Info */}
        <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">管理员</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">admin@workbot.com</span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
