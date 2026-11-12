import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
  // @ts-ignore - Turbopack options
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: '/recibo/:id',
        destination: '/api/admin/kanban/os/:id',
      },
      {
        source: '/certificado/:id',
        destination: '/api/admin/kanban/certificate/:id',
      },
      {
        source: '/os/:id',
        destination: '/api/admin/kanban/os/:id',
      },
    ]
  }
};

export default nextConfig;
