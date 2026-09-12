/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'slashdeals.com.ng' }],
        destination: 'https://slashdeals.com.ng/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;