import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
  // @ts-ignore - Turbopack options
  turbopack: {
    root: path.resolve(__dirname),
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
