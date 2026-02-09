'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  User,
  Lock,
  Shield,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface UserInfo {
  id: number;
  phone: string;
  nickname: string | null;
  avatar: string | null;
  role: string;
  status: string;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 个人资料表单
  const [profileForm, setProfileForm] = useState({
    nickname: '',
    avatar: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // 修改密码表单
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // 加载用户信息
  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/users/me', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.data) {
        setUserInfo(data.data);
        setProfileForm({
          nickname: data.data.nickname || '',
          avatar: data.data.avatar || '',
        });
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存个人资料
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);

      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });

      const data = await response.json();

      if (data.success) {
        setUserInfo(data.data);
        toast({
          title: '成功',
          description: '个人资料更新成功',
          variant: 'default',
        });
      } else {
        toast({
          title: '失败',
          description: data.error || '更新失败',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('保存个人资料失败:', error);
      toast({
        title: '错误',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    // 验证
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: '提示',
        description: '请填写所有密码字段',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: '提示',
        description: '新密码长度至少为6位',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: '提示',
        description: '两次输入的新密码不一致',
        variant: 'destructive',
      });
      return;
    }

    try {
      setChangingPassword(true);

      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '成功',
          description: '密码修改成功，请重新登录',
          variant: 'default',
        });
        // 清空表单
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        // 跳转到登录页
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        toast({
          title: '失败',
          description: data.error || '修改密码失败',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      toast({
        title: '错误',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            个人设置
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            管理您的账户信息和安全设置
          </p>
        </div>

        {/* 用户信息卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              账户信息
            </CardTitle>
            <CardDescription>
              您的基本账户信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">用户ID</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {userInfo?.id}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">手机号</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {userInfo?.phone}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">角色</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {userInfo?.role === 'admin' ? '管理员' : '普通用户'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">状态</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {userInfo?.status === 'active' ? '正常' : '已禁用'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">注册时间</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {userInfo?.created_at ? new Date(userInfo.created_at).toLocaleString('zh-CN') : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 设置标签页 */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              个人资料
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              安全设置
            </TabsTrigger>
          </TabsList>

          {/* 个人资料 */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>编辑个人资料</CardTitle>
                <CardDescription>
                  更新您的昵称和头像
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nickname">昵称</Label>
                  <Input
                    id="nickname"
                    value={profileForm.nickname}
                    onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
                    placeholder="请输入昵称"
                  />
                </div>
                <div>
                  <Label htmlFor="avatar">头像URL</Label>
                  <Input
                    id="avatar"
                    value={profileForm.avatar}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                    placeholder="请输入头像URL"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        保存更改
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 安全设置 */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  修改密码
                </CardTitle>
                <CardDescription>
                  为了安全起见，定期更换密码
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-password">当前密码</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="请输入当前密码"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-password">新密码</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="请输入新密码（至少6位）"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm-password">确认新密码</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="请再次输入新密码"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>修改密码后，您需要重新登录系统。</p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleChangePassword} disabled={changingPassword}>
                    {changingPassword ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        修改中...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        修改密码
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
