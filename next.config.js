/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  // Allow serving images from /public/image/
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
