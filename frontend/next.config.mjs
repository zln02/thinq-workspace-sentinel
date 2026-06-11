/** @type {import('next').NextConfig} */
// 배포(nginx /sentinel → :3001)는 basePath 필요 — NEXT_BASE_PATH 를 빌드시 주입.
// 미설정(로컬 dev)이면 basePath 없음. systemd: Environment=NEXT_BASE_PATH=/sentinel
const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
  // 클라이언트가 basePath를 알아 fetch 경로에 붙이도록 노출
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
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
