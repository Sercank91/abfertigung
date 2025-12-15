/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Experimental Features für Multi-Tenant
  experimental: {
    // Server Actions aktivieren
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.localhost:3000',
        'abfertigung.io',
        '*.abfertigung.io',
        '*.run.app',
      ],
    },
  },
  
  // Alle Domains für Bilder erlauben
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Ausgabe konfigurieren
  output: 'standalone',
  
  // Headers für Cloudflare und Subdomains
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
