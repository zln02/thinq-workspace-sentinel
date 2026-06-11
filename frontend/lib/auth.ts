"use client";
// 데모 인증/세션 — 하드코딩 계정 + 병원-지역 바인딩 + 역할 라우팅 + 권한 가드.
// ⚠️ 데모용(localStorage). 실 납품은 백엔드 JWT 인증으로 교체(P1).

export type Role = "SUPER" | "NURSE" | "FM" | "DIRECTOR" | "GUARDIAN";

export type Account = { id: string; pw: string; role: Role; name: string };

// 데모 계정. SUPER=최상위 관리자(전체 열람), 그 외는 자기 역할 페이지만.
export const ACCOUNTS: Account[] = [
  { id: "admin",    pw: "admin", role: "SUPER",    name: "통합관리자" },
  { id: "nurse",    pw: "1234",  role: "NURSE",    name: "김민수 간호사" },
  { id: "fm",       pw: "1234",  role: "FM",       name: "정욱현 시설관리자" },
  { id: "director", pw: "1234",  role: "DIRECTOR", name: "박원장 병원장" },
  { id: "guardian", pw: "1234",  role: "GUARDIAN", name: "이영희 보호자" },
];

// 병원 목록 + 외부 감염신호 지역(시도). 로그인 시 선택 → 그 지역으로 외부신호 고정.
// region 은 /api/external/regions 의 region 명과 일치해야 boost 가 걸린다.
export type Hospital = { id: string; name: string; region: string; primary?: boolean };
export const HOSPITALS: Hospital[] = [
  { id: "gwangju",   name: "광주 디지털요양병원",      region: "광주광역시", primary: true },
  { id: "amina",     name: "아미나요양병원",          region: "서울특별시" },
  { id: "hansarang", name: "한사랑요양병원",          region: "경기도" },
  { id: "chayeon",   name: "차연요양병원",            region: "경기도" },
  { id: "start",     name: "스타트요양병원",          region: "경기도" },
  { id: "wirye",     name: "서울위례바이오요양병원",  region: "경기도" },
  { id: "hyangdong", name: "향동포레요양병원",        region: "경기도" },
];

// 역할별 홈 경로. SUPER 는 전체 선택 화면으로.
export const ROLE_HOME: Record<Role, string> = {
  SUPER:    "/select",
  NURSE:    "/dashboard",
  FM:       "/dashboard",
  DIRECTOR: "/dashboard",
  GUARDIAN: "/guardian",  // 보호자 앱 자체 스플래시 → 세션 유무로 home/login 분기
};

export type Session = {
  account: Role;   // 로그인 계정의 권한 (SUPER 면 전체 열람 가능)
  role: Role;      // 현재 보고 있는 뷰 역할 (비-SUPER 는 account 와 동일)
  name: string;
  hospital: string;
  hospitalId: string;
  region: string;
};

export function authenticate(id: string, pw: string): Account | null {
  const a = ACCOUNTS.find((x) => x.id === id.trim().toLowerCase());
  return a && a.pw === pw ? a : null;
}

export function setSession(s: Session) {
  if (typeof window === "undefined") return;
  localStorage.setItem("account", s.account);
  localStorage.setItem("role", s.role);
  localStorage.setItem("userName", s.name);
  localStorage.setItem("hospital", s.hospital);
  localStorage.setItem("hospitalId", s.hospitalId);
  localStorage.setItem("region", s.region);
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const account = localStorage.getItem("account") as Role | null;
  const role = localStorage.getItem("role") as Role | null;
  if (!account || !role) return null;
  return {
    account, role,
    name: localStorage.getItem("userName") ?? "",
    hospital: localStorage.getItem("hospital") ?? "",
    hospitalId: localStorage.getItem("hospitalId") ?? "",
    region: localStorage.getItem("region") ?? "",
  };
}

export function clearSession() {
  if (typeof window === "undefined") return;
  ["account", "role", "userName", "hospital", "hospitalId", "region"].forEach((k) => localStorage.removeItem(k));
}

// SUPER 는 모든 뷰 접근 가능. 그 외는 허용된 역할만.
export function canAccess(session: Session | null, allowed: Role[]): boolean {
  if (!session) return false;
  if (session.account === "SUPER") return true;
  return allowed.includes(session.role);
}

// 로그인 시 선택 병원의 지역으로 외부 감염신호 고정(서버 _selected 갱신). 실패해도 진행.
export async function bindRegion(region: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  try {
    await fetch(`${base}/api/sentinel/external/select-region`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region }),
    });
  } catch {
    /* 외부신호 미연동이어도 로그인은 진행 */
  }
}
