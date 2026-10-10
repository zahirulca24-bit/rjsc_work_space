/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const isProd = process.env.NODE_ENV === 'production';
    const backendUrl = process.env.BACKEND_API_URL || (isProd
      ? 'https://rjsc-work-backend.onrender.com/api/:path*'
      : 'http://127.0.0.1:8000/api/:path*');

    return [
      {
        source: '/api/:path*',
        destination: backendUrl,
      },
    ];
  },
};

module.exports = nextConfig;
