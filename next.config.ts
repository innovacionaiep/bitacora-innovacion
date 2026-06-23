import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-avatar',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
