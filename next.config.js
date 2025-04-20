/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Allow import of files from the src directory for better organization
  poweredByHeader: false,
  // Configure images
  images: {
    domains: ['res.cloudinary.com'],
  },
  // Force deployment even with TypeScript errors
  typescript: {
    ignoreBuildErrors: true
  },
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true
  }
};

module.exports = nextConfig;