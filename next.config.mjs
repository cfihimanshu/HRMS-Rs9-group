/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'mysql2'],
  },
  async redirects() {
    return [
      {
        source: '/people',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
