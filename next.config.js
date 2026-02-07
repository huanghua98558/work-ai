/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
