/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 禁用 ESLint 和 TypeScript 检查以加快构建速度
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 禁用源码映射（生产环境不需要）
  productionBrowserSourceMaps: false,
  // 图片优化配置
  images: {
    unoptimized: true, // 禁用图片优化以避免额外依赖
  },
  // 优化输出
  swcMinify: true,
  // 减少构建输出
  output: 'standalone',
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
}

module.exports = nextConfig
