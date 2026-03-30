import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // 告诉前端：只要遇到以 /api/ 开头的请求
        source: '/api/:path*',
        // 就把它悄悄转发给我们的全新 Python 后端！
        destination: 'https://api.qm-ai.pro/api/:path*', 
      },
    ];
  },
};

export default nextConfig;