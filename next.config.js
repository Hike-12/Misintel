/** @type {import('next').NextConfig} */
const nextConfig = {
  // REQUIRED for Cloud Run deployment
  output: 'standalone',
  
  // Recommended optimizations
  compress: true,
  swcMinify: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;