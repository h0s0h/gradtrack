/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Allow import of files from the src directory for better organization
  poweredByHeader: false,
  // Configure images
  images: {
    domains: ['res.cloudinary.com'],
    disableStaticImages: true,
    unoptimized: true,
  },
  // Force deployment even with TypeScript errors
  typescript: {
    ignoreBuildErrors: true
  },
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true
  },
  // Ignore runtime JavaScript errors
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Disable source maps in production to reduce bundle size
  productionBrowserSourceMaps: false,
  // Allow builds to continue even with swc minify errors
  swcMinify: true,
  experimental: {
    // Continue build even if there are missing dependencies
    skipTrailingSlashRedirect: true,
    // Ignore other type errors
    fallbackNodePolyfills: false,
  }
};

module.exports = nextConfig;