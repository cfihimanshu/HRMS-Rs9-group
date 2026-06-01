/** @type {import('next').NextConfig} */
const nextConfig = {
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
