import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // 🌟 核心黑科技：直接写死服务器 IP 和端口，物理绕过域名备案拦截！
        destination: 'http://123.207.43.43:8008/api/:path*', 
      },
    ];
  },
};

export default nextConfig;