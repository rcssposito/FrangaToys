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
  }
};

export default nextConfig;
