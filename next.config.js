/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 输出模式
  output: 'standalone',

  // 文件跟踪根目录（解决多 lockfile 警告）
  outputFileTracingRoot: process.cwd(),

  // 开发环境配置
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // 性能优化
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  productionBrowserSourceMaps: false,

  // 图片配置
  images: {
    unoptimized: true,
  },

  // 输出模式
  output: 'standalone',

  // 服务器外部包
  serverExternalPackages: ['pg', 'postgres', 'drizzle-orm', 'ws'],

  // Webpack 配置
  webpack: (config, { isServer }) => {
    return config;
  },

  // CORS 配置
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

  // 实验性功能
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // 编译选项
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? {
          exclude: ['error', 'warn'],
        }
      : false,
  },

  // 其他配置
  poweredByHeader: false,
  generateEtags: true,
  staticPageGenerationTimeout: 180,
}

module.exports = nextConfig
