import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    useTypeScriptCli: false,
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  partialPrefetching: true,
};

export default nextConfig;
