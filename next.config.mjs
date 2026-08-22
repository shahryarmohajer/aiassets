/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // small self-contained build, easy to run under PM2 with low memory
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    minimumCacheTTL: 86400,
  },
  experimental: {
    // keep build/runtime memory footprint low on a 4GB VPS
    workerThreads: false,
    cpus: 1,
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
