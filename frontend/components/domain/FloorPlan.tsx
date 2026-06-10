// frontend/components/domain/FloorPlan.tsx
"use client";

import { useState } from "react";
import { RoomCard } from "./RoomCard";
import { X, HeartPulse, UserCircle, AlertCircle, CheckCircle2, Wind } from "lucide-react";
import { useLiveWard } from "@/lib/useSentinel";
import { RoomFloorPlan } from "./RoomFloorPlan";
import type { Tier } from "@/lib/appliances";
import { ROOM_DATA, LIVE_ROOM } from "@/lib/wardData";


export function FloorPlan() {
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  // 실센서(ward_a=201호) SSE 실시간 — 해당 호실 snapshot 만 실데이터로 덮어씀
  const { data: live, connected } = useLiveWard("ward_a");
  const rooms = ROOM_DATA.map((room) => {
    if (room.roomCode === LIVE_ROOM && live) {
      // 재실센서(LD2410C): occupancy==0 → 빈 병실(환자 숨김), >0/미측정 → 재실
      const present = live.occupancy == null ? true : live.occupancy > 0;
      return {
        ...room,
        isLive: true,
        present,
        occ: present ? room.occ : 0,
        patients: present ? room.patients : [],
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
              <span className={`absolute -top-1.5 right-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full ${connected ? ((room as any).present === false ? "bg-slate-500 text-white" : "bg-emerald-500 text-white") : "bg-slate-400 text-white"}`}>
                {connected
                  ? ((room as any).present === false ? "● LIVE · 빈 병실" : "● LIVE · 재실")
                  : "실센서 연결중"}
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