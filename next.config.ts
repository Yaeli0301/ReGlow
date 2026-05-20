import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/booking/:businessId", destination: "/book/:businessId" },
    ];
  },
  devIndicators: false,
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["mongodb-memory-server", "mongodb-memory-server-core"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    optimizePackageImports: ["date-fns", "jose", "zod"],
  },
};

export default nextConfig;
