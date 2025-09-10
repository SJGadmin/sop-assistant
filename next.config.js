/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma']
  },
  images: {
    domains: ['assets.agentfire3.com'] // For company favicon
  },
  // Ensure CSS is properly processed in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Force proper CSS and font optimization
  optimizeFonts: true,
  swcMinify: true,
  // Headers for iframe embedding
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL', // Allow embedding from any domain
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig