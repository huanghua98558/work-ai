import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            WorkBot
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            企业微信机器人管理系统
          </p>
          <div className="space-x-4">
            <a href="/login">
              <Button size="lg">
                立即开始
              </Button>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              用户管理
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              手机号+验证码登录，支持用户角色管理
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              机器人管理
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              最多30个机器人，支持内置AI和第三方平台集成
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              激活码管理
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              一码一设备机制，支持管理员分发和用户购买
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
