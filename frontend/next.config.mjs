/** @type {import('next').NextConfig} */
// NEXT_BASE_PATH 설정 시에만 서브패스 적용 (외부 노출용 빌드).
// 로컬 개발(localhost:3000)은 env 미설정 → basePath '' 유지.
const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  basePath,
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
