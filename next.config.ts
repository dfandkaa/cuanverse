import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Mencegah error routing halaman pada aplikasi Capacitor
  trailingSlash: true,
};

export default nextConfig;