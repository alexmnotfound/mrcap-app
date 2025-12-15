import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: "standalone",
  // Configure images
  images: {
    // Allow images from the same domain
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mrcapitals.com.ar",
      },
      {
        protocol: "https",
        hostname: "app.mrcapitals.com.ar",
      },
    ],
    // Use default loader which respects X-Forwarded-Proto header
    loader: "default",
  },
  // Trust proxy headers from Nginx to determine protocol
  // This ensures Next.js knows it's behind HTTPS when X-Forwarded-Proto is set
  experimental: {
    // This helps Next.js detect HTTPS from proxy headers
  },
};

export default nextConfig;
