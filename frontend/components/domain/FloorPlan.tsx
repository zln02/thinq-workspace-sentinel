// frontend/components/domain/FloorPlan.tsx
"use client";

import { useState } from "react";
import { RoomCard } from "./RoomCard";
import { X, UserCircle, AlertCircle, CheckCircle2, Wind, Radio, Activity } from "lucide-react";
import { RoomFloorPlan } from "./RoomFloorPlan";
import type { Tier } from "@/lib/appliances";
import { patientsForSpace } from "@/lib/wardData";

// NurseView가 백엔드 overview(+201호 SSE)를 병합해 내려주는 공간 카드
export type SpaceCard = {
  space_id: string;
  space_name: string;
  space_type: string;
  max_occupancy: number;
  isLive: boolean;          // 실센서 공간(201호)
  occ: number | null;       // 재실 인원(실센서만 정확, 그 외 null)
  snapshot: { tier: string; poi: number | null; co2: number | null; temp_c: number | null; rh: number | null; pm25: number | null };
};

export function FloorPlan({ spaces }: { spaces: SpaceCard[] }) {
  const [selected, setSelected] = useState<SpaceCard | null>(null);
  const patients = selected ? patientsForSpace(selected.space_name) : [];
  const snap = selected?.snapshot;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 relative">
        {spaces.map((sp) => (
          <div key={sp.space_id} className="relative">
            <span className={`absolute -top-1.5 right-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${sp.isLive ? "bg-emerald-500 text-white" : "bg-white text-slate-500 border border-slate-300 shadow-sm"}`}>
              {sp.isLive ? <><Radio size={10} /> 실센서 LIVE</> : "백엔드 라이브"}
            </span>
            <RoomCard
              roomCode={sp.space_name}
              capacity={sp.max_occupancy}
              occ={sp.occ}
              snapshot={sp.snapshot}
              onClick={() => setSelected(sp)}
            />
          </div>
        ))}
      </div>

      {selected && snap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#D6E2EF] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[85vh] flex flex-col">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors z-10"><X size={24} /></button>

            <div className="p-6 border-b border-[#D6E2EF] bg-[#F3F7FB] shrink-0">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                {selected.space_name}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selected.isLive ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"}`}>{selected.isLive ? "실센서" : "백엔드 라이브"}</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">{selected.space_type} · 정원 {selected.max_occupancy}명{selected.occ != null ? ` · 현재 재실 ${selected.occ}명` : ""}</p>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* 환경 실측 지표 */}
              <h3 className="text-sm font-bold text-slate-600 mb-1 flex items-center gap-1.5"><Activity size={18} /> 실시간 환경 지표</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: "CO₂", v: snap.co2 != null ? `${snap.co2}` : "—", u: "ppm" },
                  { k: "감염확률", v: snap.poi != null ? `${(snap.poi * 100).toFixed(1)}` : "—", u: "%" },
                  { k: "온도", v: snap.temp_c != null ? `${snap.temp_c.toFixed(1)}` : "—", u: "°C" },
                  { k: "습도", v: snap.rh != null ? `${snap.rh.toFixed(0)}` : "—", u: "%" },
                  { k: "PM2.5", v: snap.pm25 != null ? `${snap.pm25}` : "—", u: "㎍" },
                  { k: "등급", v: snap.tier, u: "" },
                ].map((m, i) => (
                  <div key={i} className="bg-[#F3F7FB] rounded-xl p-3 text-center border border-[#D6E2EF]">
                    <p className="text-[10px] text-slate-500 mb-0.5">{m.k}</p>
                    <p className="text-base font-black text-slate-900">{m.v}<span className="text-[10px] font-normal text-slate-400 ml-0.5">{m.u}</span></p>
                  </div>
                ))}
              </div>

              {/* 평면도 + 가전 자동제어 */}
              <h3 className="text-sm font-bold text-slate-600 mb-1 mt-5 flex items-center gap-1.5"><Wind size={18} /> 평면도 · ThinQ 가전 가동현황</h3>
              <RoomFloorPlan tier={snap.tier as Tier} spaceType={selected.space_type} occupancy={selected.max_occupancy} />

              {/* 재실 환자(병실) / 공용공간 안내 */}
              <h3 className="text-sm font-bold text-slate-600 mb-2 mt-5 flex items-center gap-1.5"><UserCircle size={18} /> 재실 환자 생체 지표 <span className="text-[10px] font-normal text-slate-400">(웨어러블 연동 예정 · 데모)</span></h3>
              {patients.length > 0 ? (
                patients.map((patient, i) => {
                  const isWarning = patient.vitals.bt >= 37.5 || patient.vitals.hr > 100;
                  return (
                    <div key={i} className={`p-4 rounded-xl border ${isWarning ? "bg-red-50 border-red-200" : "bg-white border-slate-200"} flex flex-col gap-3`}>
                      <div className="flex justify-between items-center">
                        <span className={`font-bold text-lg ${isWarning ? "text-red-700" : "text-slate-800"}`}>{patient.name} <span className="text-sm font-normal text-slate-500">({patient.age}세)</span></span>
                        <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${isWarning ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{isWarning ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}{patient.status}</div>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-slate-200 text-center bg-[#F3F7FB] py-2 rounded-lg">
                        <div><p className="text-[10px] text-slate-500 mb-0.5">체온</p><p className={`text-base font-black ${patient.vitals.bt >= 37.5 ? "text-red-600" : "text-slate-700"}`}>{patient.vitals.bt}<span className="text-[10px] font-normal ml-0.5">°C</span></p></div>
                        <div><p className="text-[10px] text-slate-500 mb-0.5">혈압</p><p className="text-base font-black text-slate-700">{patient.vitals.bp}</p></div>
                        <div><p className="text-[10px] text-slate-500 mb-0.5">심박수</p><p className={`text-base font-black ${patient.vitals.hr > 100 ? "text-red-600" : "text-slate-700"}`}>{patient.vitals.hr}<span className="text-[10px] font-normal ml-0.5">bpm</span></p></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 bg-[#F3F7FB] text-center text-sm text-slate-500">
                  공용공간 · 재실 환자 없음 <span className="block text-[11px] text-slate-400 mt-0.5">환경 감시·ThinQ 자동 방역만 운영됩니다</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#D6E2EF] shrink-0">
              <button onClick={() => setSelected(null)} className="w-full py-3 bg-[#A50034] text-white rounded-xl text-sm font-bold hover:bg-[#7B0027] transition">닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
