/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/sentinel/:path*",
        destination: "http://127.0.0.1:8003/api/v1/:path*",
      },
      {
        source: "/api/sentinel/stream/:path*",
        destination: "http://127.0.0.1:8003/api/v1/stream/:path*",
      },
    ];
  },
};

export default nextConfig;
