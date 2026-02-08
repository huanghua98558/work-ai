import { redirect } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 这里可以添加管理员权限检查
  // 如果用户不是管理员，重定向到登录页面

  return <div className="min-h-screen">{children}</div>;
}
