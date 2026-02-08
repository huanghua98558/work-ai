/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 开发环境：忽略 ESLint 和 TypeScript 检查以加快开发速度
  // 生产环境：不忽略，确保代码质量
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  // 启用严格模式以捕获更多错误
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // 禁用源码映射（生产环境不需要）
  productionBrowserSourceMaps: false,
  // 图片优化配置
  images: {
    unoptimized: true, // 禁用图片优化以避免额外依赖
  },
  // 优化输出
  output: 'standalone',

  // 配置服务器端外部包
  serverExternalPackages: ['pg', 'postgres', 'drizzle-orm'],

  // 配置允许的跨域开发域名
  allowedDevOrigins: ['49b5181c-5c6b-4cdb-bea3-88f08e909ea3.dev.coze.site'],

  // 配置允许的跨域开发域名
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // 添加实验性功能以提高稳定性
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
