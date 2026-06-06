/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@barokah/shared', '@barokah/ui'],
  output: 'standalone',
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
    ];
  },
};

module.exports = nextConfig;
