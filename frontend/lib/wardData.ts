// frontend/lib/wardData.ts
// 병동 시드 데이터 + tier→ThinQ 가전 자동대응 매핑 (FloorPlan·Dashboard 공유로 정합성 확보)

export type WardSnapshot = { tier: string; poi: number; co2: number; temp_c: number; rh: number; pm25: number };
export type WardPatient = { name: string; age: number; status: string; vitals: { bt: number; hr: number; bp: string } };
export type WardRoom = { roomCode: string; capacity: number; occ: number; snapshot: WardSnapshot; patients: WardPatient[] };

// 실센서 병동(ward_a) ↔ 평면도 호실 매핑 (201호만 실데이터, 나머지는 시드)
export const LIVE_ROOM = "201";

export const ROOM_DATA: WardRoom[] = [
  { roomCode: "101", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.12, co2: 605, temp_c: 23.5, rh: 45, pm25: 10 },
    patients: [
      { name: "김철수", age: 78, status: "안정", vitals: { bt: 36.5, hr: 72, bp: "120/80" } },
      { name: "이영희", age: 82, status: "안정", vitals: { bt: 36.6, hr: 68, bp: "115/75" } },
      { name: "최민수", age: 75, status: "안정", vitals: { bt: 36.4, hr: 70, bp: "125/82" } },
      { name: "박정자", age: 80, status: "안정", vitals: { bt: 36.7, hr: 74, bp: "118/78" } } ] },
  { roomCode: "102", capacity: 4, occ: 3, snapshot: { tier: "CAUTION", poi: 0.35, co2: 850, temp_c: 24.1, rh: 48, pm25: 15 },
    patients: [
      { name: "박성호", age: 75, status: "미열", vitals: { bt: 37.4, hr: 85, bp: "130/85" } },
      { name: "최은자", age: 88, status: "안정", vitals: { bt: 36.8, hr: 74, bp: "125/80" } },
      { name: "정동석", age: 81, status: "안정", vitals: { bt: 36.5, hr: 70, bp: "118/75" } } ] },
  { roomCode: "103", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.15, co2: 620, temp_c: 23.2, rh: 44, pm25: 12 },
    patients: [
      { name: "강현우", age: 79, status: "안정", vitals: { bt: 36.5, hr: 71, bp: "120/80" } },
      { name: "오지연", age: 83, status: "안정", vitals: { bt: 36.7, hr: 73, bp: "122/81" } },
      { name: "류승호", age: 76, status: "안정", vitals: { bt: 36.4, hr: 69, bp: "118/76" } },
      { name: "신미경", age: 85, status: "안정", vitals: { bt: 36.6, hr: 75, bp: "130/85" } } ] },
  { roomCode: "104", capacity: 2, occ: 2, snapshot: { tier: "ALERT", poi: 0.68, co2: 1200, temp_c: 25.2, rh: 55, pm25: 25 },
    patients: [
      { name: "최동수", age: 89, status: "고열", vitals: { bt: 38.1, hr: 102, bp: "145/95" } },
      { name: "배영호", age: 82, status: "주의", vitals: { bt: 37.6, hr: 95, bp: "138/88" } } ] },
  { roomCode: "201", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.18, co2: 650, temp_c: 23.6, rh: 46, pm25: 11 },
    patients: [
      { name: "유재석", age: 77, status: "안정", vitals: { bt: 36.4, hr: 75, bp: "122/82" } },
      { name: "김태호", age: 81, status: "안정", vitals: { bt: 36.6, hr: 70, bp: "120/80" } },
      { name: "정준하", age: 79, status: "안정", vitals: { bt: 36.5, hr: 72, bp: "125/85" } },
      { name: "노홍철", age: 74, status: "안정", vitals: { bt: 36.7, hr: 76, bp: "115/75" } } ] },
  { roomCode: "202", capacity: 4, occ: 4, snapshot: { tier: "HIGH_RISK", poi: 0.85, co2: 1450, temp_c: 26.1, rh: 60, pm25: 38 },
    patients: [
      { name: "박점순", age: 85, status: "고열", vitals: { bt: 38.5, hr: 115, bp: "155/100" } },
      { name: "이만구", age: 91, status: "혈압이상", vitals: { bt: 37.1, hr: 98, bp: "165/110" } },
      { name: "조향숙", age: 79, status: "발열", vitals: { bt: 38.0, hr: 102, bp: "145/95" } },
      { name: "강철중", age: 83, status: "미열", vitals: { bt: 37.5, hr: 88, bp: "135/88" } } ] },
  { roomCode: "203", capacity: 4, occ: 1, snapshot: { tier: "MONITOR", poi: 0.05, co2: 450, temp_c: 22.5, rh: 40, pm25: 8 },
    patients: [
      { name: "윤지은", age: 84, status: "안정", vitals: { bt: 36.7, hr: 70, bp: "118/78" } } ] },
  { roomCode: "204", capacity: 2, occ: 2, snapshot: { tier: "CAUTION", poi: 0.42, co2: 920, temp_c: 24.5, rh: 50, pm25: 18 },
    patients: [
      { name: "한수연", age: 78, status: "미열", vitals: { bt: 37.5, hr: 92, bp: "140/90" } },
      { name: "김종민", age: 81, status: "안정", vitals: { bt: 36.8, hr: 78, bp: "128/82" } } ] },
  { roomCode: "301", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.22, co2: 700, temp_c: 23.8, rh: 47, pm25: 14 },
    patients: [
      { name: "오상식", age: 76, status: "안정", vitals: { bt: 36.8, hr: 74, bp: "125/80" } },
      { name: "장그래", age: 80, status: "안정", vitals: { bt: 36.5, hr: 70, bp: "120/75" } },
      { name: "안영이", age: 75, status: "안정", vitals: { bt: 36.6, hr: 72, bp: "118/78" } },
      { name: "장백기", age: 78, status: "안정", vitals: { bt: 36.7, hr: 75, bp: "122/82" } } ] },
  { roomCode: "302", capacity: 4, occ: 4, snapshot: { tier: "CRITICAL", poi: 0.95, co2: 1800, temp_c: 27.5, rh: 65, pm25: 55 },
    patients: [
      { name: "조병규", age: 86, status: "응급", vitals: { bt: 39.2, hr: 125, bp: "160/105" } },
      { name: "한소희", age: 80, status: "고열", vitals: { bt: 38.8, hr: 110, bp: "150/95" } },
      { name: "이도현", age: 82, status: "고열", vitals: { bt: 38.5, hr: 105, bp: "148/92" } },
      { name: "송혜교", age: 79, status: "발열", vitals: { bt: 37.9, hr: 98, bp: "140/90" } } ] },
  { roomCode: "303", capacity: 4, occ: 3, snapshot: { tier: "ALERT", poi: 0.72, co2: 1300, temp_c: 25.5, rh: 58, pm25: 28 },
    patients: [
      { name: "백승기", age: 84, status: "발열", vitals: { bt: 38.0, hr: 98, bp: "150/95" } },
      { name: "김지원", age: 81, status: "미열", vitals: { bt: 37.6, hr: 90, bp: "135/85" } },
      { name: "박보검", age: 78, status: "주의", vitals: { bt: 37.4, hr: 85, bp: "142/90" } } ] },
  { roomCode: "304", capacity: 2, occ: 2, snapshot: { tier: "MONITOR", poi: 0.14, co2: 610, temp_c: 23.4, rh: 45, pm25: 10 },
    patients: [
      { name: "송중기", age: 76, status: "안정", vitals: { bt: 36.5, hr: 66, bp: "110/70" } },
      { name: "전여빈", age: 75, status: "안정", vitals: { bt: 36.6, hr: 68, bp: "115/75" } } ] },
];

// 5-Tier rank (정렬·필터용)
export const TIER_RANK: Record<string, number> = { MONITOR: 0, CAUTION: 1, ALERT: 2, HIGH_RISK: 3, CRITICAL: 4 };
export function tierRank(tier: string): number { return TIER_RANK[tier] ?? 0; }

// tier별 ThinQ 가전 자동대응 (Wells-Riley·REHVA 기반 — 위험 등급↑ → 환기·정화 강도↑)
export type AutoDevice = { type: "vent" | "purifier" | "ac"; name: string; mode: string };
export const AUTO_RESPONSE: Record<string, AutoDevice[]> = {
  CRITICAL: [
    { type: "vent", name: "프리미엄 환기", mode: "터보 환기" },
    { type: "purifier", name: "퓨리케어 공청기", mode: "클린부스터" },
    { type: "ac", name: "휘센 에어컨", mode: "냉방 22℃" },
  ],
  HIGH_RISK: [
    { type: "vent", name: "프리미엄 환기", mode: "급속 환기" },
    { type: "purifier", name: "퓨리케어 공청기", mode: "터보" },
  ],
  ALERT: [
    { type: "vent", name: "프리미엄 환기", mode: "표준 환기" },
    { type: "purifier", name: "퓨리케어 공청기", mode: "스마트" },
  ],
  CAUTION: [
    { type: "purifier", name: "퓨리케어 공청기", mode: "자동" },
  ],
  MONITOR: [],
};
export function autoResponse(tier: string): AutoDevice[] { return AUTO_RESPONSE[tier] ?? []; }

// 백엔드 공간명("201호 다인실")에서 호수 추출 → 시드 환자 목록 (공용공간은 환자 없음)
export function patientsForSpace(spaceName: string): WardPatient[] {
  const m = spaceName.match(/(\d+)호/);
  if (!m) return [];
  return ROOM_DATA.find((r) => r.roomCode === m[1])?.patients ?? [];
}
