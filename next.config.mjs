/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent production builds from replacing chunks used by a running dev server.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  serverExternalPackages: ['sequelize', 'mysql2'],
  // Allow phones on the same local network to load Next.js development assets.
  allowedDevOrigins: ['10.35.190.109'],
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
