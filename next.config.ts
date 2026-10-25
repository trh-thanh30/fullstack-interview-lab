import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    useTypeScriptCli: false,
  },
  partialPrefetching: true,
};

export default nextConfig;
