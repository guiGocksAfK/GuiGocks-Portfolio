import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // 90 is used for project screenshots, which carry small text that blurs at the default 75.
    qualities: [75, 90],
  },
};

export default nextConfig;
