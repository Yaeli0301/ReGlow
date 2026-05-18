import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ["mongodb-memory-server", "mongodb-memory-server-core"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    optimizePackageImports: ["date-fns", "jose", "zod"],
  },
};

export default nextConfig;
