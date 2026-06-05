/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
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
