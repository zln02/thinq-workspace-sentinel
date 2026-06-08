// frontend/components/domain/FloorPlan.tsx
"use client";

import { useState } from "react";
import { RoomCard } from "./RoomCard";
import { X, HeartPulse, UserCircle, AlertCircle, CheckCircle2, Wind } from "lucide-react";
import { useLiveWard } from "@/lib/useSentinel";
import { RoomFloorPlan } from "./RoomFloorPlan";
import type { Tier } from "@/lib/appliances";

// 실센서 병동(ward_a) ↔ 평면도 호실 매핑 (201호만 실데이터, 나머지는 시드)
const LIVE_ROOM = "201";

const ROOM_DATA = [
  { 
    roomCode: "101", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.12, co2: 605, temp_c: 23.5, rh: 45, pm25: 10 },
    patients: [
      { name: "김철수", age: 78, status: "안정", vitals: { bt: 36.5, hr: 72, bp: "120/80" } },
      { name: "이영희", age: 82, status: "안정", vitals: { bt: 36.6, hr: 68, bp: "115/75" } },
      { name: "최민수", age: 75, status: "안정", vitals: { bt: 36.4, hr: 70, bp: "125/82" } },
      { name: "박정자", age: 80, status: "안정", vitals: { bt: 36.7, hr: 74, bp: "118/78" } }
    ]
  },
  { 
    roomCode: "102", capacity: 4, occ: 3, snapshot: { tier: "CAUTION", poi: 0.35, co2: 850, temp_c: 24.1, rh: 48, pm25: 15 },
    patients: [
      { name: "박성호", age: 75, status: "미열", vitals: { bt: 37.4, hr: 85, bp: "130/85" } },
      { name: "최은자", age: 88, status: "안정", vitals: { bt: 36.8, hr: 74, bp: "125/80" } },
      { name: "정동석", age: 81, status: "안정", vitals: { bt: 36.5, hr: 70, bp: "118/75" } }
    ]
  },
  { 
    roomCode: "103", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.15, co2: 620, temp_c: 23.2, rh: 44, pm25: 12 },
    patients: [
      { name: "강현우", age: 79, status: "안정", vitals: { bt: 36.5, hr: 71, bp: "120/80" } },
      { name: "오지연", age: 83, status: "안정", vitals: { bt: 36.7, hr: 73, bp: "122/81" } },
      { name: "류승호", age: 76, status: "안정", vitals: { bt: 36.4, hr: 69, bp: "118/76" } },
      { name: "신미경", age: 85, status: "안정", vitals: { bt: 36.6, hr: 75, bp: "130/85" } }
    ]
  },
  { 
    roomCode: "104", capacity: 2, occ: 2, snapshot: { tier: "ALERT", poi: 0.68, co2: 1200, temp_c: 25.2, rh: 55, pm25: 25 },
    patients: [
      { name: "최동수", age: 89, status: "고열", vitals: { bt: 38.1, hr: 102, bp: "145/95" } },
      { name: "배영호", age: 82, status: "주의", vitals: { bt: 37.6, hr: 95, bp: "138/88" } }
    ]
  },
  { 
    roomCode: "201", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.18, co2: 650, temp_c: 23.6, rh: 46, pm25: 11 },
    patients: [
      { name: "유재석", age: 77, status: "안정", vitals: { bt: 36.4, hr: 75, bp: "122/82" } },
      { name: "김태호", age: 81, status: "안정", vitals: { bt: 36.6, hr: 70, bp: "120/80" } },
      { name: "정준하", age: 79, status: "안정", vitals: { bt: 36.5, hr: 72, bp: "125/85" } },
      { name: "노홍철", age: 74, status: "안정", vitals: { bt: 36.7, hr: 76, bp: "115/75" } }
    ]
  },
  { 
    roomCode: "202", capacity: 4, occ: 4, snapshot: { tier: "HIGH_RISK", poi: 0.85, co2: 1450, temp_c: 26.1, rh: 60, pm25: 38 },
    patients: [
      { name: "박점순", age: 85, status: "고열", vitals: { bt: 38.5, hr: 115, bp: "155/100" } },
      { name: "이만구", age: 91, status: "혈압이상", vitals: { bt: 37.1, hr: 98, bp: "165/110" } },
      { name: "조향숙", age: 79, status: "발열", vitals: { bt: 38.0, hr: 102, bp: "145/95" } },
      { name: "강철중", age: 83, status: "미열", vitals: { bt: 37.5, hr: 88, bp: "135/88" } }
    ]
  },
  { 
    roomCode: "203", capacity: 4, occ: 1, snapshot: { tier: "MONITOR", poi: 0.05, co2: 450, temp_c: 22.5, rh: 40, pm25: 8 },
    patients: [
      { name: "윤지은", age: 84, status: "안정", vitals: { bt: 36.7, hr: 70, bp: "118/78" } }
    ]
  },
  { 
    roomCode: "204", capacity: 2, occ: 2, snapshot: { tier: "CAUTION", poi: 0.42, co2: 920, temp_c: 24.5, rh: 50, pm25: 18 },
    patients: [
      { name: "한수연", age: 78, status: "미열", vitals: { bt: 37.5, hr: 92, bp: "140/90" } },
      { name: "김종민", age: 81, status: "안정", vitals: { bt: 36.8, hr: 78, bp: "128/82" } }
    ]
  },
  { 
    roomCode: "301", capacity: 4, occ: 4, snapshot: { tier: "MONITOR", poi: 0.22, co2: 700, temp_c: 23.8, rh: 47, pm25: 14 },
    patients: [
      { name: "오상식", age: 76, status: "안정", vitals: { bt: 36.8, hr: 74, bp: "125/80" } },
      { name: "장그래", age: 80, status: "안정", vitals: { bt: 36.5, hr: 70, bp: "120/75" } },
      { name: "안영이", age: 75, status: "안정", vitals: { bt: 36.6, hr: 72, bp: "118/78" } },
      { name: "장백기", age: 78, status: "안정", vitals: { bt: 36.7, hr: 75, bp: "122/82" } }
    ]
  },
  { 
    roomCode: "302", capacity: 4, occ: 4, snapshot: { tier: "CRITICAL", poi: 0.95, co2: 1800, temp_c: 27.5, rh: 65, pm25: 55 },
    patients: [
      { name: "조병규", age: 86, status: "응급", vitals: { bt: 39.2, hr: 125, bp: "160/105" } },
      { name: "한소희", age: 80, status: "고열", vitals: { bt: 38.8, hr: 110, bp: "150/95" } },
      { name: "이도현", age: 82, status: "고열", vitals: { bt: 38.5, hr: 105, bp: "148/92" } },
      { name: "송혜교", age: 79, status: "발열", vitals: { bt: 37.9, hr: 98, bp: "140/90" } }
    ]
  },
  { 
    roomCode: "303", capacity: 4, occ: 3, snapshot: { tier: "ALERT", poi: 0.72, co2: 1300, temp_c: 25.5, rh: 58, pm25: 28 },
    patients: [
      { name: "백승기", age: 84, status: "발열", vitals: { bt: 38.0, hr: 98, bp: "150/95" } },
      { name: "김지원", age: 81, status: "미열", vitals: { bt: 37.6, hr: 90, bp: "135/85" } },
      { name: "박보검", age: 78, status: "주의", vitals: { bt: 37.4, hr: 85, bp: "142/90" } }
    ]
  },
  { 
    roomCode: "304", capacity: 2, occ: 2, snapshot: { tier: "MONITOR", poi: 0.14, co2: 610, temp_c: 23.4, rh: 45, pm25: 10 },
    patients: [
      { name: "송중기", age: 76, status: "안정", vitals: { bt: 36.5, hr: 66, bp: "110/70" } },
      { name: "전여빈", age: 75, status: "안정", vitals: { bt: 36.6, hr: 68, bp: "115/75" } }
    ]
  }
];

export function FloorPlan() {
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  // 실센서(ward_a=201호) SSE 실시간 — 해당 호실 snapshot 만 실데이터로 덮어씀
  const { data: live, connected } = useLiveWard("ward_a");
  const rooms = ROOM_DATA.map((room) => {
    if (room.roomCode === LIVE_ROOM && live) {
      return {
        ...room,
        isLive: true,
        snapshot: {
          tier: live.tier ?? room.snapshot.tier,
          poi: live.poi ?? room.snapshot.poi,
          co2: live.co2_ppm ?? room.snapshot.co2,
          temp_c: live.temp_c ?? room.snapshot.temp_c,
          rh: live.humidity ?? room.snapshot.rh,
          pm25: live.pm25 ?? room.snapshot.pm25,
        },
      };
    }
    return room;
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 relative">
        {rooms.map((room, idx) => (
          <div key={idx} className="relative">
            {room.roomCode === LIVE_ROOM && (
              <span className={`absolute -top-1.5 right-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full ${connected ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"}`}>
                {connected ? "● 실센서 LIVE" : "실센서 연결중"}
              </span>
            )}
            <RoomCard
              roomCode={room.roomCode}
              capacity={room.capacity}
              occ={room.occ}
              snapshot={room.snapshot}
              onClick={() => setSelectedRoom(room)}
            />
          </div>
        ))}
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[85vh] flex flex-col">
            <button 
              onClick={() => setSelectedRoom(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10"
            >
              <X size={24} />
            </button>
            
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {selectedRoom.roomCode}호 병실 상세
              </h2>
              <p className="text-sm text-slate-500 mt-1">현재 재실: {selectedRoom.occ}명 / 총 {selectedRoom.capacity}베드</p>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* 방 평면도 + 가전 가동현황 (위험도별 자동제어 반영) */}
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Wind size={18} /> 병실 평면도 · 가전 가동현황
              </h3>
              <RoomFloorPlan
                tier={selectedRoom.snapshot.tier as Tier}
                spaceType={(selectedRoom as { spaceType?: string }).spaceType ?? "WARD"}
                occupancy={selectedRoom.capacity}
              />

              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 mt-5 flex items-center gap-1.5">
                <UserCircle size={18} /> 재실 환자 생체 지표 (Vitals)
              </h3>
              
              {selectedRoom.patients.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 dark:bg-slate-800/20 rounded-xl">
                  현재 재실 중인 환자가 없습니다.
                </div>
              ) : (
                selectedRoom.patients.map((patient: any, i: number) => {
                  const isWarning = patient.vitals.bt >= 37.5 || patient.vitals.hr > 100;
                  return (
                    <div key={i} className={`p-4 rounded-xl border ${isWarning ? 'bg-red-50 dark:bg-[#A50034]/10 border-red-200 dark:border-[#A50034]/30' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'} flex flex-col gap-3`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-lg ${isWarning ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {patient.name} <span className="text-sm font-normal text-slate-500">({patient.age}세)</span>
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${isWarning ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'}`}>
                          {isWarning ? <AlertCircle size={12}/> : <CheckCircle2 size={12}/>}
                          {patient.status}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700/50 text-center bg-white/50 dark:bg-[#0B1120]/50 py-2 rounded-lg">
                        <div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">체온</p>
                          <p className={`text-base font-black ${patient.vitals.bt >= 37.5 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {patient.vitals.bt}<span className="text-[10px] font-normal ml-0.5">°C</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">혈압</p>
                          <p className="text-base font-black text-slate-700 dark:text-slate-300">
                            {patient.vitals.bp}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">심박수</p>
                          <p className={`text-base font-black ${patient.vitals.hr > 100 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {patient.vitals.hr}<span className="text-[10px] font-normal ml-0.5">bpm</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button 
                onClick={() => setSelectedRoom(null)} 
                className="w-full py-3 bg-[#A50034] text-white rounded-xl text-sm font-bold hover:bg-red-700 transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}