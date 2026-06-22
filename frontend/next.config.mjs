// next/constants 는 Next14에서 ESM import 해석이 안 됨(ERR_MODULE_NOT_FOUND) → phase 문자열 직접 비교.
const PHASE_PRODUCTION_BUILD = "phase-production-build";
const PHASE_PRODUCTION_SERVER = "phase-production-server";

/**
 * 배포는 nginx `/sentinel` → :3001 이므로 basePath 가 필수다.
 * basePath 누락 빌드 = HTML 이 `/_next/` 를 참조 → nginx 가 못 찾음 → CSS/JS 404(무스타일).
 *
 * 방탄 규칙:
 *   - NEXT_BASE_PATH 가 '명시'되면 그 값을 사용(빈문자 "" 로 루트 배포도 명시 가능).
 *   - 미설정이면 프로덕션(build/start)에서 `/sentinel` 로 자동 고정.
 *     → `npm run build` 든 `npx next build` 든 prod 빌드는 항상 basePath 가 붙는다.
 *   - dev(next dev)는 루트("")라 로컬 개발 영향 없음.
 *
 * @type {(phase: string) => import('next').NextConfig}
 */
export default (phase) => {
  const isProd = phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER;
  const basePath =
    process.env.NEXT_BASE_PATH !== undefined
      ? process.env.NEXT_BASE_PATH
      : isProd
        ? "/sentinel"
        : "";

  return {
    reactStrictMode: true,
    ...(basePath ? { basePath } : {}),
    // 클라이언트가 basePath를 알아 fetch 경로에 붙이도록 노출
    env: { NEXT_PUBLIC_BASE_PATH: basePath },
    async rewrites() {
      return [
        {
          source: "/api/sentinel/:path*",
          destination: "http://127.0.0.1:8103/api/v1/:path*",
        },
        {
          source: "/api/sentinel/stream/:path*",
          destination: "http://127.0.0.1:8103/api/v1/stream/:path*",
        },
      ];
    },
  };
};
