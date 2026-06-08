// frontend/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, LogOut, Clock, Users, AlertTriangle, HeartPulse, FileText, 
  ActivitySquare, CheckCircle2, Zap, BatteryCharging, Wrench, TrendingDown, 
  X, Check, AlertCircle, Activity, TrendingUp, DownloadCloud, Leaf, Wind, Thermometer, Power 
} from "lucide-react";
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, BarChart, LineChart 
} from 'recharts';
import { FloorPlan } from "@/components/domain/FloorPlan";

// ============================================================================
// 🧱 재사용 컴포넌트: 모달 껍데기 (스크롤바 숨김 적용)
// ============================================================================
function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/80">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition bg-slate-800 p-2 rounded-full"><X size={20} /></button>
        </div>
        {/* 💡 스크롤바 숨김 적용 */}
        <div className="p-8 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// 🔧 시설관리자 전용: 호실별 가전 맵 컴포넌트
// ============================================================================
function FMFloorPlan() {
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  const FM_ROOMS = [
    { code: "101", isHeavyLoad: false, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "스마트", status: "가동중", power: "25W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "냉방 24℃", status: "가동중", power: "800W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "-", status: "미가동", power: "0W", icon: <Activity size={14}/> }
    ]},
    { code: "102", isHeavyLoad: false, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "취침", status: "가동중", power: "15W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "-", status: "미가동", power: "0W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "표준", status: "가동중", power: "45W", icon: <Activity size={14}/> }
    ]},
    { code: "103", isHeavyLoad: false, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "-", status: "미가동", power: "0W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "송풍", status: "가동중", power: "50W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "-", status: "미가동", power: "0W", icon: <Activity size={14}/> }
    ]},
    { code: "104", isHeavyLoad: false, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "스마트", status: "가동중", power: "25W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "냉방 26℃", status: "가동중", power: "600W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "-", status: "미가동", power: "0W", icon: <Activity size={14}/> }
    ]},
    { code: "201", isHeavyLoad: false, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "스마트", status: "가동중", power: "25W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "냉방 23℃", status: "가동중", power: "900W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "-", status: "미가동", power: "0W", icon: <Activity size={14}/> }
    ]},
    { code: "202", isHeavyLoad: true, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "클린부스터", status: "가동중", power: "65W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "냉방 22℃", status: "가동중", power: "1200W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "급속 환기", status: "가동중", power: "150W", icon: <Activity size={14}/> }
    ]},
    { code: "203", isHeavyLoad: false, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "-", status: "미가동", power: "0W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "냉방 25℃", status: "가동중", power: "750W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "-", status: "미가동", power: "0W", icon: <Activity size={14}/> }
    ]},
    { code: "204", isHeavyLoad: false, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "절전", status: "가동중", power: "5W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "-", status: "미가동", power: "0W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "표준", status: "가동중", power: "45W", icon: <Activity size={14}/> }
    ]},
    { code: "301", isHeavyLoad: false, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "스마트", status: "가동중", power: "25W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "-", status: "미가동", power: "0W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "-", status: "미가동", power: "0W", icon: <Activity size={14}/> }
    ]},
    { code: "302", isHeavyLoad: true, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "터보", status: "가동중", power: "60W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "냉방 23℃", status: "가동중", power: "900W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "터보 환기", status: "가동중", power: "150W", icon: <Activity size={14}/> }
    ]},
    { code: "303", isHeavyLoad: false, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "-", status: "미가동", power: "0W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "제습", status: "가동중", power: "400W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "표준", status: "가동중", power: "45W", icon: <Activity size={14}/> }
    ]},
    { code: "304", isHeavyLoad: false, devices: [
      { name: "LG 퓨리케어 공기청정기", type: "purifier", mode: "자동", status: "가동중", power: "25W", icon: <Wind size={14}/> },
      { name: "휘센 시스템에어컨", type: "ac", mode: "-", status: "미가동", power: "0W", icon: <Thermometer size={14}/> },
      { name: "프리미엄 환기시스템", type: "vent", mode: "-", status: "미가동", power: "0W", icon: <Activity size={14}/> }
    ]},
  ];

  const getDeviceLabel = (type: string) => {
    if (type === "purifier") return "공청기";
    if (type === "ac") return "에어컨";
    return "환기";
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {FM_ROOMS.map((room, i) => (
          <div 
            key={i} 
            onClick={() => setSelectedRoom(room)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-md flex flex-col relative overflow-hidden group 
              ${room.isHeavyLoad ? 'bg-red-900/10 border-red-900/50 hover:bg-red-900/20' : 'bg-[#111827] border-slate-800 hover:border-blue-500/50'}`}
          >
            {room.isHeavyLoad && <div className="absolute top-0 right-0 w-8 h-8 bg-red-900/30 rounded-bl-full border-b border-l border-red-900/50"></div>}
            
            <div className="flex justify-between items-center mb-3">
              <span className={`font-black text-xl ${room.isHeavyLoad ? 'text-red-400' : 'text-slate-200'}`}>{room.code}호</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${room.isHeavyLoad ? 'bg-red-900/50 text-red-200' : 'bg-slate-800 text-slate-400'}`}>
                {room.isHeavyLoad ? '집중제어중' : '정상연동'}
              </span>
            </div>

            <div className="space-y-2 mt-auto">
              {room.devices.map((d, idx) => {
                const isOn = d.status === "가동중";
                return (
                  <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <span className={isOn ? (room.isHeavyLoad ? 'text-red-400' : 'text-blue-400') : 'text-slate-600'}>{d.icon}</span>
                      <span className={isOn ? 'text-slate-300 font-medium' : 'text-slate-500'}>{getDeviceLabel(d.type)}</span>
                    </div>
                    <span className={`font-bold ${isOn ? (room.isHeavyLoad ? 'text-red-300' : 'text-white') : 'text-slate-600'}`}>{isOn ? d.mode : 'OFF'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedRoom && (
        <Modal title={`🔌 ${selectedRoom.code}호 실시간 가전 상세 제어 정보`} onClose={() => setSelectedRoom(null)}>
          <div className="space-y-4">
            <div className="mb-6 pb-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-slate-400 text-sm mb-1">현재 병실 통신 상태</h3>
                <p className="text-green-400 font-bold flex items-center gap-2"><CheckCircle2 size={16}/> ThinQ 허브 온라인 (Ping: 12ms)</p>
              </div>
              <div className="text-right">
                <h3 className="text-slate-400 text-sm mb-1">총 소비 전력</h3>
                <p className="text-white font-black text-xl">
                  {selectedRoom.devices.reduce((acc: number, cur: any) => acc + parseInt(cur.power), 0)}<span className="text-sm text-slate-500 font-normal ml-1">W</span>
                </p>
              </div>
            </div>
            
            <h4 className="text-sm font-bold text-slate-300 mb-3">설치된 IoT 기기 목록</h4>
            {selectedRoom.devices.map((device: any, idx: number) => {
              const isOn = device.status === "가동중";
              return (
                <div key={idx} className={`border p-5 rounded-xl flex items-center justify-between transition ${isOn ? 'bg-slate-800/50 border-slate-700' : 'bg-[#0B1120] border-slate-800 opacity-60'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${!isOn ? 'bg-slate-800 text-slate-600' : (device.mode.includes("터보") || device.mode.includes("부스터") || device.mode.includes("급속") ? 'bg-red-900/30 text-red-400' : 'bg-blue-900/20 text-blue-400')}`}>
                      {isOn ? device.icon : <Power size={16}/>}
                    </div>
                    <div>
                      <h5 className={`font-bold text-lg ${isOn ? 'text-white' : 'text-slate-500'}`}>{device.name}</h5>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-sm text-slate-400 font-medium">현재 상태: <span className={isOn ? 'text-slate-200' : 'text-slate-600'}>{isOn ? device.mode : '전원 꺼짐'}</span></span>
                        {isOn && (
                          <>
                            <span className="text-slate-600">|</span>
                            <span className="text-sm text-slate-400 font-medium flex items-center gap-1">
                              <BatteryCharging size={14} className="text-yellow-500"/> 전력량: <span className="text-slate-200">{device.power}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-lg text-sm font-bold shadow-md ${isOn ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                    {device.status}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}

// ============================================================================
// 🚀 메인 대시보드 컴포넌트 
// ============================================================================
export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const savedRole = localStorage.getItem("role");
    const savedName = localStorage.getItem("userName");
    if (!savedRole) { router.push("/"); } 
    else { setRole(savedRole); setUserName(savedName); }
    
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  const handleLogout = () => { localStorage.removeItem("role"); localStorage.removeItem("userName"); router.push("/"); };

  if (!role) return null;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 flex flex-col font-sans">
      <header className="bg-[#111827] border-b border-slate-800 px-8 py-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#A50034]/20 border border-[#A50034]/50 flex items-center justify-center text-[#A50034]"><ShieldAlert size={24} /></div>
          <h1 className="text-xl font-bold tracking-wide text-white">ThinQ Space <span className="text-[#A50034]">Sentinel</span></h1>
        </div>
        
        <div className="flex items-center gap-8">
          {role === "DIRECTOR" && (
            <div className="flex items-center gap-2 bg-green-900/20 border border-green-500/30 px-4 py-1.5 rounded-full text-green-400 text-sm shadow-sm animate-in fade-in zoom-in duration-500">
              <CheckCircle2 size={16} /><span className="font-bold">법정 컴플라이언스 100% 준수</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-slate-400 font-medium"><Clock size={16} className="text-slate-500"/> {time}</div>
          
          <div className="flex items-center gap-4 border-l border-slate-700 pl-8">
            <span className="text-white font-bold text-lg">{userName}</span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 rounded-lg text-sm transition-colors border border-slate-700 hover:border-red-800/50">
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 💡 전체 화면 스크롤바 숨김 적용 */}
      <div className="flex-1 p-8 overflow-y-auto max-w-[1600px] mx-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {role === "NURSE" && <NurseView />}
        {role === "FM" && <FMView />}
        {role === "DIRECTOR" && <DirectorView />}
      </div>
    </div>
  );
}

// ============================================================================
// 👩‍⚕️ 1. 간호사(ICN) 대시보드
// ============================================================================
function NurseView() {
  const [modal, setModal] = useState<"DANGER" | "VITALS" | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[300px]">
        {/* 💡 간호사 뷰 리스트 영역 스크롤바 숨김 */}
        <div className="w-full lg:w-3/4 bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col h-full">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileText className="text-blue-400"/> 수간호사 인수인계사항</h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">오늘 08:00 AM 작성</p>
              <p className="text-sm text-red-200 font-bold leading-relaxed">🚨 202호 박점순 환자 밤새 미열 지속 및 혈압 변동 확인. 오전 10시 체온 재측정 필수. 302호 환경 상태 주의 깊게 관찰 요망.</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">오늘 07:30 AM 작성</p>
              <p className="text-sm text-slate-200 leading-relaxed">302호 조병규 환자 조식 후 혈압 약 복용 완료. 병실 공기청정기 필터 교체 시설팀(FM)에 요청 접수됨.</p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/4 flex flex-col gap-4 h-full">
          <div className="flex-1 bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 border border-slate-700 shrink-0"><Users size={20}/></div>
            <div><p className="text-[11px] font-bold text-slate-400 mb-0.5">총 재실 인원</p><div className="text-2xl font-black text-white">34<span className="text-xs text-slate-500 ml-1 font-normal">명</span></div></div>
          </div>
          <div onClick={() => setModal("DANGER")} className="flex-1 bg-[#111827] border border-[#A50034]/50 rounded-2xl p-5 shadow-lg flex items-center gap-4 cursor-pointer hover:bg-slate-800 transition relative overflow-hidden group">
            <div className="absolute inset-0 bg-[#A50034]/5 group-hover:bg-[#A50034]/10 transition"></div>
            <div className="w-10 h-10 rounded-xl bg-red-900/30 flex items-center justify-center text-[#A50034] border border-[#A50034]/30 shrink-0 relative z-10"><AlertTriangle size={20}/></div>
            <div className="relative z-10"><p className="text-[11px] font-bold text-slate-400 mb-0.5 group-hover:text-red-400 transition-colors">주의/위험 병실</p><div className="text-2xl font-black text-white">2<span className="text-xs text-slate-500 ml-1 font-normal">개소</span></div></div>
          </div>
          <div onClick={() => setModal("VITALS")} className="flex-1 bg-[#111827] border border-orange-500/50 rounded-2xl p-5 shadow-lg flex items-center gap-4 cursor-pointer hover:bg-slate-800 transition relative overflow-hidden group">
            <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition"></div>
            <div className="w-10 h-10 rounded-xl bg-orange-900/30 flex items-center justify-center text-orange-400 border border-orange-500/30 shrink-0 relative z-10"><HeartPulse size={20}/></div>
            <div className="relative z-10"><p className="text-[11px] font-bold text-slate-400 mb-0.5 group-hover:text-orange-400 transition-colors">생체 이상 감지</p><div className="text-2xl font-black text-white">4<span className="text-xs text-slate-500 ml-1 font-normal">명</span></div></div>
          </div>
        </div>
      </div>

      <FloorPlan />

      {modal === "DANGER" && (
        <Modal title="🚨 주의/위험 병실 상세 조회" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="p-5 border border-red-900/50 bg-red-900/10 rounded-xl flex items-center justify-between">
              <div><h4 className="text-xl font-bold text-red-400">202호 (CRITICAL)</h4><p className="text-sm text-slate-300 mt-1">CO2 농도 초과 및 실내 환자 고열 복합 발생</p></div>
              <span className="px-4 py-1.5 bg-[#A50034] text-white text-sm font-bold rounded-full shadow-lg">즉각 조치 필요</span>
            </div>
            <div className="p-5 border border-orange-900/50 bg-orange-900/10 rounded-xl flex items-center justify-between">
              <div><h4 className="text-xl font-bold text-orange-400">302호 (HIGH RISK)</h4><p className="text-sm text-slate-300 mt-1">온도 27.5도, 습도 65% - 감염균 번식 위험 수치 진입</p></div>
              <span className="px-4 py-1.5 bg-orange-600 text-white text-sm font-bold rounded-full shadow-lg">주의 관찰 요망</span>
            </div>
          </div>
        </Modal>
      )}

      {modal === "VITALS" && (
        <Modal title="🩺 생체 이상 감지 환자 리스트" onClose={() => setModal(null)}>
           <table className="w-full text-left mt-2 border-collapse">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700 text-sm">
                <th className="pb-3 pl-4">호실</th><th className="pb-3">환자명</th><th className="pb-3">체온</th><th className="pb-3">심박수</th><th className="pb-3 text-right pr-4">현재 상태</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                <td className="py-4 pl-4 font-bold text-lg">202호</td><td className="font-medium">박점순 (85세)</td><td className="text-red-400 font-bold text-lg">38.8°C</td><td className="text-red-400 font-bold text-lg">115 bpm</td><td className="text-right pr-4"><span className="bg-red-900/50 text-red-200 px-3 py-1.5 rounded-lg text-xs font-bold inline-block">고열/위험</span></td>
              </tr>
              <tr className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                <td className="py-4 pl-4 font-bold text-lg">202호</td><td className="font-medium">이만구 (91세)</td><td className="text-slate-200 text-lg">37.1°C</td><td className="text-red-400 font-bold text-lg">105 bpm</td><td className="text-right pr-4"><span className="bg-orange-900/50 text-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold inline-block">심박이상</span></td>
              </tr>
              <tr className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                <td className="py-4 pl-4 font-bold text-lg">302호</td><td className="font-medium">조병규 (86세)</td><td className="text-red-400 font-bold text-lg">39.2°C</td><td className="text-red-400 font-bold text-lg">125 bpm</td><td className="text-right pr-4"><span className="bg-[#A50034] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md inline-block">응급조치요망</span></td>
              </tr>
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// 🔧 2. 시설관리자(FM) 대시보드
// ============================================================================
function FMView() {
  const [fmModal, setFmModal] = useState<"CONN" | "AUTO" | "FILTER" | null>(null);

  // 💡 가상 데이터 124건 맥락에 맞추기 위해 로그 리스트 확장
  const LOGS = [
    { time: "10:45:12", event: "가전 제어", detail: "[302호] 환기기 터보 모드 자동 가동", status: "성공", badge: "bg-blue-900/30 text-blue-400" },
    { time: "10:30:00", event: "위험 감지", detail: "[202호] CO2 농도 1450ppm 초과 감지", status: "경고", badge: "bg-red-900/30 text-red-400" },
    { time: "09:20:15", event: "가전 제어", detail: "[202호] 에어컨 냉방 22도 하향 제어", status: "성공", badge: "bg-blue-900/30 text-blue-400" },
    { time: "09:15:30", event: "시스템", detail: "ThinQ AI 감염 예측 모델 정기 업데이트", status: "성공", badge: "bg-slate-800 text-slate-300" },
    { time: "08:10:05", event: "가전 제어", detail: "[101호] 공기청정기 스마트 모드 전환", status: "성공", badge: "bg-blue-900/30 text-blue-400" },
    { time: "08:00:10", event: "시스템", detail: "전체 병동 아침 기상 루틴 가동", status: "성공", badge: "bg-slate-800 text-slate-300" },
    { time: "07:45:22", event: "가전 제어", detail: "[104호] 시스템에어컨 제습 모드 가동", status: "성공", badge: "bg-blue-900/30 text-blue-400" },
  ];

  const fmDeviceRiskData = [
    { name: '1일', 평균위험도: 12, 제어건수: 24 }, { name: '2일', 평균위험도: 15, 제어건수: 41 },
    { name: '3일', 평균위험도: 28, 제어건수: 76 }, { name: '4일', 평균위험도: 18, 제어건수: 32 },
    { name: '5일', 평균위험도: 10, 제어건수: 18 }, { name: '6일', 평균위험도: 14, 제어건수: 29 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-4 gap-6">
        <div onClick={() => setFmModal("CONN")} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-center cursor-pointer hover:bg-slate-800 transition group">
          <div className="flex items-center gap-4 mb-2"><div className="p-3 bg-green-900/20 rounded-xl text-green-400 group-hover:scale-110 transition"><Zap size={20}/></div><p className="text-sm text-slate-400 font-medium group-hover:text-green-400 transition">가전 연결 상태</p></div>
          <p className="text-3xl font-black text-white pl-1">48<span className="text-sm font-normal ml-1 text-slate-500">대 정상</span></p>
        </div>
        <div onClick={() => setFmModal("AUTO")} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-center cursor-pointer hover:bg-slate-800 transition group">
          <div className="flex items-center gap-4 mb-2"><div className="p-3 bg-blue-900/20 rounded-xl text-blue-400 group-hover:scale-110 transition"><BatteryCharging size={20}/></div><p className="text-sm text-slate-400 font-medium group-hover:text-blue-400 transition">금일 자동 제어</p></div>
          <p className="text-3xl font-black text-white pl-1">124<span className="text-sm font-normal ml-1 text-slate-500">건</span></p>
        </div>
        {/* 💡 필터 교체 요망 데이터 일치 */}
        <div onClick={() => setFmModal("FILTER")} className="bg-[#111827] border border-[#A50034]/50 rounded-2xl p-6 shadow-lg flex flex-col justify-center cursor-pointer hover:bg-slate-800 transition group relative overflow-hidden">
          <div className="absolute inset-0 bg-[#A50034]/5 group-hover:bg-[#A50034]/10 transition"></div>
          <div className="flex items-center gap-4 mb-2 relative z-10"><div className="p-3 bg-red-900/20 rounded-xl text-[#A50034] group-hover:scale-110 transition"><Wrench size={20}/></div><p className="text-sm text-slate-400 font-medium group-hover:text-[#A50034] transition">필터 교체 요망</p></div>
          <p className="text-3xl font-black text-[#A50034] pl-1 relative z-10">2<span className="text-sm font-normal ml-1 text-slate-500">건 필요</span></p>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-2"><div className="p-3 bg-orange-900/20 rounded-xl text-orange-400"><Activity size={20}/></div><p className="text-sm text-slate-400 font-medium">일일 전력 사용</p></div>
          <p className="text-3xl font-black text-white pl-1">450<span className="text-sm font-normal ml-1 text-slate-500">kWh</span></p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><TrendingUp size={20} className="text-blue-400"/> 일별 자동 제어 건수 및 평균 감염 위험도</h3>
          <p className="text-sm text-slate-400 mb-6">ThinQ AI 시스템 개입에 따른 위험도 하락 상관관계</p>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fmDeviceRiskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 40]} />
                <YAxis yAxisId="right" orientation="right" stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', border: 'none' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar yAxisId="right" dataKey="제어건수" name="가전 제어 건수 (건)" fill="#3B82F6" barSize={30} radius={[4,4,0,0]} />
                <Line yAxisId="left" type="monotone" dataKey="평균위험도" name="평균 위험도 (%)" stroke="#A50034" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col h-[400px]">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><ActivitySquare size={20} className="text-teal-400"/> 실시간 기기 제어 로그</h3>
          </div>
          {/* 💡 FM 로그 스크롤바 숨김 */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1F2937] text-slate-400 text-sm border-b border-slate-800 sticky top-0 z-10">
                  <th className="p-4 font-semibold w-24">시간</th><th className="p-4 font-semibold w-28">분류</th><th className="p-4 font-semibold">동작 내역</th>
                </tr>
              </thead>
              <tbody>
                {LOGS.map((log, idx) => (
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition text-sm">
                    <td className="p-4 text-slate-400 font-mono">{log.time}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-[11px] font-bold ${log.badge}`}>{log.event}</span></td>
                    <td className="p-4 text-slate-200">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Zap className="text-yellow-500"/> 실시간 병실 IoT 가전 동작 상태 맵</h3>
        <p className="text-sm text-slate-400 mb-2">각 호실 카드의 아이콘 리스트를 통해 현재 전원 OFF(미가동) 상태인 기기와, 가동 중인 기기의 모드를 직관적으로 확인할 수 있습니다.</p>
        <FMFloorPlan />
      </div>
      
      {/* KPI 카드 클릭 시 뜨는 모달들 */}
      {fmModal === "CONN" && (
        <Modal title="🔌 층별 가전 연결 상태 확인" onClose={() => setFmModal(null)}>
          <div className="grid grid-cols-2 gap-4 text-base">
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex justify-between items-center"><span className="text-slate-200">101호 공기청정기</span><span className="text-green-400 font-bold bg-green-900/20 px-3 py-1 rounded-lg"><Check size={16} className="inline mr-1"/> 정상 연동</span></div>
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex justify-between items-center"><span className="text-slate-200">101호 시스템에어컨</span><span className="text-green-400 font-bold bg-green-900/20 px-3 py-1 rounded-lg"><Check size={16} className="inline mr-1"/> 정상 연동</span></div>
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex justify-between items-center"><span className="text-slate-200">102호 프리미엄환기</span><span className="text-green-400 font-bold bg-green-900/20 px-3 py-1 rounded-lg"><Check size={16} className="inline mr-1"/> 정상 연동</span></div>
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex justify-between items-center"><span className="text-slate-200">102호 시스템에어컨</span><span className="text-green-400 font-bold bg-green-900/20 px-3 py-1 rounded-lg"><Check size={16} className="inline mr-1"/> 정상 연동</span></div>
          </div>
        </Modal>
      )}
      {/* 💡 가상 데이터 124건 맥락 일치 모달 */}
      {fmModal === "AUTO" && (
        <Modal title="⚙️ 금일 AI 가전 자동 제어 내역 (총 124건)" onClose={() => setFmModal(null)}>
           <ul className="space-y-3 text-base text-slate-200">
             <li className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl flex gap-4 items-start">
                <span className="text-blue-400 font-mono font-bold mt-0.5">10:45</span>
                <div><p className="font-bold text-white mb-1">[302호] 실내 CO2 상승 감지</p><p className="text-sm text-slate-400">환기기 터보 가동 (20분간 유지 후 모니터링)</p></div>
             </li>
             <li className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl flex gap-4 items-start">
                <span className="text-blue-400 font-mono font-bold mt-0.5">09:20</span>
                <div><p className="font-bold text-white mb-1">[202호] 환자 고열 감지 연동</p><p className="text-sm text-slate-400">시스템 에어컨 냉방 22도 목표로 하향 조절 완료</p></div>
             </li>
             <li className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl flex gap-4 items-start">
                <span className="text-blue-400 font-mono font-bold mt-0.5">08:10</span>
                <div><p className="font-bold text-white mb-1">[101호] 미세먼지 유입 감지</p><p className="text-sm text-slate-400">공기청정기 스마트 모드 전환 및 풍량 증가</p></div>
             </li>
             <li className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl flex gap-4 items-start">
                <span className="text-slate-400 font-mono font-bold mt-0.5">08:00</span>
                <div><p className="font-bold text-white mb-1">[전체 병동] 아침 기상 루틴</p><p className="text-sm text-slate-400">전 객실 스마트 루버 활성화 및 공기청정 시작</p></div>
             </li>
             <div className="text-center text-sm text-slate-500 mt-4 bg-slate-800/30 py-3 rounded-lg border border-slate-700/30">
               ... 외 120건의 AI 자동 제어가 성공적으로 수행되었습니다.
             </div>
           </ul>
        </Modal>
      )}
      {/* 💡 필터 교체 2건 데이터 일치 */}
      {fmModal === "FILTER" && (
        <Modal title="🛠️ 기기 필터 교체 대상" onClose={() => setFmModal(null)}>
           <div className="space-y-4">
            <div className="p-5 border border-[#A50034]/50 bg-red-900/10 rounded-xl flex items-center justify-between">
              <div><h4 className="text-lg font-bold text-red-400 flex items-center gap-2"><AlertCircle size={18}/> 202호 공기청정기</h4><p className="text-sm text-slate-300 mt-2">헤파필터 수명 5% 잔여 (교체 시급)</p></div>
              <button className="px-4 py-2 bg-[#A50034] text-white text-sm font-bold rounded-lg hover:bg-red-700 shadow-lg">작업 완료 처리</button>
            </div>
            <div className="p-5 border border-orange-900/50 bg-orange-900/10 rounded-xl flex items-center justify-between">
              <div><h4 className="text-lg font-bold text-orange-400 flex items-center gap-2"><AlertCircle size={18}/> 104호 시스템에어컨</h4><p className="text-sm text-slate-300 mt-2">프리필터 먼지 누적 (청소/교체 권장)</p></div>
              <button className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 shadow-lg">작업 완료 처리</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// 💼 3. 병원장(DIRECTOR) 대시보드
// ============================================================================
function DirectorView() {
  const [isGenerating, setIsGenerating] = useState(false);

  const esgEnergyData = [
    { month: '1월', 기존전력사용: 12000, ThinQ최적화: 9500, 탄소절감량: 1.2 },
    { month: '2월', 기존전력사용: 11500, ThinQ최적화: 8800, 탄소절감량: 1.5 },
    { month: '3월', 기존전력사용: 10800, ThinQ최적화: 7900, 탄소절감량: 1.8 },
    { month: '4월', 기존전력사용: 13000, ThinQ최적화: 9200, 탄소절감량: 2.1 },
  ];

  const costData = [
    { name: '1주차', 수동방역비용: 120, ThinQ자동제어: 45 }, { name: '2주차', 수동방역비용: 130, ThinQ자동제어: 48 },
    { name: '3주차', 수동방역비용: 110, ThinQ자동제어: 42 }, { name: '4주차', 수동방역비용: 140, ThinQ자동제어: 50 },
  ];

  const handleGenerateESGReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert("✅ 2025년 ThinQ Space Sentinel 기반 공식 ESG 성과 보고서 생성이 완료되었습니다.\n(서버 연동 시 실제 PDF가 다운로드 됩니다.)");
    }, 1500); 
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-end border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">ThinQ 시스템 도입 성과 및 ESG 리포트</h2>
          <p className="text-sm text-slate-400 mt-1">IoT 가전 최적화 기반 에너지 절감, 안전, 컴플라이언스 통합 모니터링</p>
        </div>
        
        <button 
          onClick={handleGenerateESGReport} 
          disabled={isGenerating}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg border ${isGenerating ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white border-green-500'}`}
        >
          {isGenerating ? <Activity className="animate-spin" size={18} /> : <DownloadCloud size={18} />}
          {isGenerating ? "보고서 PDF 생성 중..." : "ESG 리포트 PDF 다운로드"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div><h3 className="text-slate-400 font-semibold text-sm mb-1 flex items-center gap-1.5"><Leaf size={16} className="text-green-400"/> 환경(E) - AI 전력 최적화</h3></div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white">24<span className="text-lg font-medium text-slate-400 ml-1">% 절감</span></div>
            <p className="text-[11px] text-green-400 mt-2 font-bold bg-green-900/20 px-2.5 py-1 rounded inline-block">냉난방 및 환기 가동 최소화</p>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div><h3 className="text-slate-400 font-semibold text-sm mb-1 flex items-center gap-1.5"><HeartPulse size={16} className="text-blue-400"/> 사회(S) - 원내 감염 발생률</h3></div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white">0<span className="text-lg font-medium text-slate-400 ml-1">건</span></div>
            <p className="text-[11px] text-blue-400 mt-2 font-bold bg-blue-900/20 px-2.5 py-1 rounded inline-block">공기질 개선으로 호흡기 감염 완벽 차단</p>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div><h3 className="text-slate-400 font-semibold text-sm mb-1 flex items-center gap-1.5"><ShieldAlert size={16} className="text-purple-400"/> 지배구조(G) - 데이터 투명성</h3></div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white">100<span className="text-lg font-medium text-slate-400 ml-1">% 무결성</span></div>
            <p className="text-[11px] text-purple-400 mt-2 font-bold bg-purple-900/20 px-2.5 py-1 rounded inline-block">환경 제어 로그 및 생체 데이터 암호화</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#A50034] to-[#7B0027] border border-red-900 rounded-2xl p-6 shadow-lg flex flex-col justify-between text-white">
          <div><h3 className="text-white/80 font-semibold text-sm mb-1">스마트 방역 비용 절감 ROI</h3><TrendingDown className="text-white mb-2" size={20} /></div>
          <div>
            <div className="text-3xl font-black">124<span className="text-lg text-white/60 font-medium ml-1">만원</span></div>
            <p className="text-[11px] text-white/90 mt-2 font-bold bg-black/20 px-2.5 py-1 rounded inline-block">월평균 방역 인건비 및 에너지 비용 절감</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 shadow-lg flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Zap size={20} className="text-yellow-400"/> 월별 에너지 사용량 (기존 vs ThinQ 최적화)</h3>
          <p className="text-sm text-slate-400 mb-6">스마트 가동을 통한 불필요한 공조 전력 낭비 방지 성과</p>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={esgEnergyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 14 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 14 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none', padding: '12px' }} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
                <Bar dataKey="기존전력사용" name="기존 공조/가전 전력 (kWh)" fill="#4B5563" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="ThinQ최적화" name="ThinQ 도입 후 (kWh)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 shadow-lg flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-white mb-2">수동 방역 vs ThinQ 자동 제어 유지비용 비교</h3>
          <p className="text-sm text-slate-400 mb-6">에너지 및 인건비 운영 효율화(ROI) 데이터 (단위: 만원)</p>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none' }} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="수동방역비용" name="기존 수동 방역 및 인력 관리" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="ThinQ자동제어" name="ThinQ 도입 후 최적화 비용" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}