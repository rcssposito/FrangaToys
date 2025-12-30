import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
  experimental: {
    // @ts-expect-error - Turbo types might be missing in current Next.js version
    turbo: {
      root: '.',
    }
  }
};

export default nextConfig;
