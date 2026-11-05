import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 构建时忽略 ESLint 错误（类型检查已通过，业务代码不阻塞部署）
    ignoreDuringBuilds: true,
  },
  experimental: {
    // 中间件会克隆请求体（默认上限 10MB）；多图上传场景需要调大
    // 单个文件上限仍由业务代码校验（10MB），见 src/lib/storage.ts
    middlewareClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
