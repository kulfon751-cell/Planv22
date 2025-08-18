/** @type {import('next').NextConfig} */
const isElectron = Boolean(process.env.ELECTRON);
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true
  },
  // Dla wersji portable używamy bezwzględnych ścieżek
  assetPrefix: isElectron ? undefined : undefined,
  basePath: undefined,
  // Allow dev client from typical local origins to access _next resources without warnings
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  'http://localhost:3010',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3010'
  ],
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'papaparse']
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      path: false
    };
    return config;
  },
  // Dodajemy konfigurację dla wersji portable
  trailingSlash: false,
  poweredByHeader: false
};

export default nextConfig;