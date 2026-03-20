import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 // async rewrites() {
    //return [
     // {
        // 告诉前端：只要遇到以 /api/ 开头的请求
        //source: '/api/:path*',
        // 就把它悄悄转发给我们的腾讯云真实后端
       // destination: 'http://123.207.43.43:8000/api/:path*', 
     // },
    //];
 // },
};

export default nextConfig;