import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Content-Security-Policy", value: `base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'${process.env.NODE_ENV === "production" ? "; upgrade-insecure-requests" : ""}` },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    useTypeScriptCli: false,
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
