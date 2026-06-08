/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const nextConfig = {
  transpilePackages: ['@barokah/shared', '@barokah/ui'],
  output: 'standalone',
  async headers() {
    if (!isProd) {
      return [];
    }
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/dashboard/products',
        destination: '/master/products',
        permanent: true,
      },
      {
        source: '/dashboard/categories',
        destination: '/master/categories',
        permanent: true,
      },
      {
        source: '/dashboard/bundles',
        destination: '/master/bundles',
        permanent: true,
      },
      {
        source: '/dashboard/receivables',
        destination: '/dashboard/finance?tab=piutang',
        permanent: true,
      },
      {
        source: '/dashboard/receivables/aging',
        destination: '/dashboard/finance?tab=aging',
        permanent: true,
      },
      {
        source: '/dashboard/payables',
        destination: '/dashboard/finance?tab=utang',
        permanent: true,
      },
      {
        source: '/dashboard/deposits',
        destination: '/dashboard/finance?tab=deposit',
        permanent: true,
      },
      {
        source: '/dashboard/expenses',
        destination: '/dashboard/finance?tab=pengeluaran',
        permanent: true,
      },
      {
        source: '/dashboard/integrations',
        destination: '/dashboard/settings?tab=integrasi',
        permanent: true,
      },
      {
        source: '/dashboard/roles',
        destination: '/dashboard/users?tab=roles',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
