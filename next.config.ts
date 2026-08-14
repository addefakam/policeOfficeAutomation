import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone" removed — Vercel handles its own build output
  // If deploying to Docker/VPS, add it back
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
