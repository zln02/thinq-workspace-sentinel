// frontend/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut, Clock, Users, AlertTriangle, HeartPulse, FileText, ActivitySquare, CheckCircle2, Zap, BatteryCharging, Wrench, Building2, TrendingDown, Lightbulb, X, Check, AlertCircle } from "lucide-react";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart } from 'recharts';
import { FloorPlan } from "@/components/domain/FloorPlan";

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const savedRole = localStorage.getItem("role");
    const savedName = localStorage.getItem("userName");
    
    if (!savedRole) {
      router.push("/");
    } else {
      setRole(savedRole);
      setUserName(savedName);
    }

    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    router.push("/");
  };

  if (!role) return null;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 flex flex-col font-sans">
      <header className="bg-[#111827] border-b border-slate-800 px-8 py-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#A50034]/20 border border-[#A50034]/50 flex items-center justify-center text-[#A50034]">
            <ShieldAlert size={24} strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold tracking-wide text-white">
            ThinQ Space <span className="text-[#A50034]">Sentinel</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Clock size={16} className="text-slate-500"/> {time}
          </div>
          <div className="flex items-center gap-4 border-l border-slate-700 pl-8">
            <span className="text-white font-bold text-lg">{userName}</span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 rounded-lg text-sm transition-colors border border-slate-700 hover:border-red-800/50">
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 overflow-y-auto w-full max-w-[1600px] mx-auto">
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
      
      {/* 💡 요청하신 넓은 인수인계사항(3/4)과 세로형 KPI 압축카드(1/4) 레이아웃 */}
      <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[300px]">
        
        {/* 왼쪽: 3/4 공간을 차지하는 수간호사 인수인계사항 */}
        <div className="w-full lg:w-3/4 bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col h-full">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="text-blue-400"/> 수간호사 인수인계사항
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">오늘 08:00 AM 작성</p>
              <p className="text-sm text-red-200 font-bold leading-relaxed">🚨 202호 박점순 환자 밤새 미열 지속 및 혈압 변동 확인. 오전 10시 체온 재측정 필수. 302호 환경 상태(Tier) 주의 깊게 관찰 요망.</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">오늘 07:30 AM 작성</p>
              <p className="text-sm text-slate-200 leading-relaxed">302호 조병규 환자 조식 후 혈압 약 복용 완료. 병실 공기청정기 필터 교체 관련하여 시설팀(FM)에 요청 접수해 두었습니다.</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">어제 야간</p>
              <p className="text-sm text-slate-200 leading-relaxed">1층 병동 전체 환기 시스템 스마트 루틴(새벽 3시 가동) 정상 작동 확인 완료. 특이사항 없음.</p>
            </div>
          </div>
        </div>

        {/* 오른쪽: 1/4 공간에 세로로 쌓은 KPI 카드들 */}
        <div className="w-full lg:w-1/4 flex flex-col gap-4 h-full">
          <div className="flex-1 bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 border border-slate-700 shrink-0"><Users size={20}/></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-0.5">총 재실 인원</p>
              <div className="text-2xl font-black text-white">34<span className="text-xs text-slate-500 ml-1 font-normal">명</span></div>
            </div>
          </div>
          
          <div onClick={() => setModal("DANGER")} className="flex-1 bg-[#111827] border border-[#A50034]/50 rounded-2xl p-5 shadow-lg flex items-center gap-4 cursor-pointer hover:bg-slate-800 transition relative overflow-hidden group">
            <div className="absolute inset-0 bg-[#A50034]/5 group-hover:bg-[#A50034]/10 transition"></div>
            <div className="w-10 h-10 rounded-xl bg-red-900/30 flex items-center justify-center text-[#A50034] border border-[#A50034]/30 shrink-0"><AlertTriangle size={20}/></div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-slate-400 mb-0.5 group-hover:text-red-400 transition-colors">주의/위험 병실</p>
              <div className="text-2xl font-black text-white">2<span className="text-xs text-slate-500 ml-1 font-normal">개소</span></div>
            </div>
          </div>
          
          <div onClick={() => setModal("VITALS")} className="flex-1 bg-[#111827] border border-orange-500/50 rounded-2xl p-5 shadow-lg flex items-center gap-4 cursor-pointer hover:bg-slate-800 transition relative overflow-hidden group">
            <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition"></div>
            <div className="w-10 h-10 rounded-xl bg-orange-900/30 flex items-center justify-center text-orange-400 border border-orange-500/30 shrink-0"><HeartPulse size={20}/></div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-slate-400 mb-0.5 group-hover:text-orange-400 transition-colors">생체 이상 감지</p>
              <div className="text-2xl font-black text-white">4<span className="text-xs text-slate-500 ml-1 font-normal">명</span></div>
            </div>
          </div>
        </div>
      </div>

      <FloorPlan />

      {/* 모달 팝업들 */}
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
           <table className="w-full text-left mt-2">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700 text-sm">
                <th className="pb-3 w-20">호실</th><th className="pb-3 w-32">환자명</th><th className="pb-3 w-24">체온</th><th className="pb-3 w-24">심박수</th><th className="pb-3">상태</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800">
                <td className="py-4 font-bold text-lg">202호</td><td className="font-medium">박점순 (85세)</td><td className="text-red-400 font-bold text-lg">38.8°C</td><td className="text-red-400 font-bold text-lg">115 bpm</td><td><span className="bg-red-900/50 text-red-200 px-3 py-1.5 rounded-lg text-xs font-bold">고열/위험</span></td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-4 font-bold text-lg">202호</td><td className="font-medium">이만구 (91세)</td><td className="text-slate-200 text-lg">37.1°C</td><td className="text-red-400 font-bold text-lg">105 bpm</td><td><span className="bg-orange-900/50 text-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold">심박이상</span></td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-4 font-bold text-lg">302호</td><td className="font-medium">조병규 (86세)</td><td className="text-red-400 font-bold text-lg">39.2°C</td><td className="text-red-400 font-bold text-lg">125 bpm</td><td><span className="bg-[#A50034] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md">응급조치요망</span></td>
              </tr>
              <tr>
                <td className="py-4 font-bold text-lg">302호</td><td className="font-medium">한소희 (80세)</td><td className="text-red-400 font-bold text-lg">38.8°C</td><td className="text-red-400 font-bold text-lg">110 bpm</td><td><span className="bg-red-900/50 text-red-200 px-3 py-1.5 rounded-lg text-xs font-bold">고열</span></td>
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

  const LOGS = [
    { time: "10:45:12", event: "가전 제어", detail: "302호 환기기 터보 모드 자동 가동", status: "성공", badge: "bg-blue-900/30 text-blue-400" },
    { time: "10:30:00", event: "위험 감지", detail: "202호 CO2 농도 1450ppm 초과 감지", status: "경고", badge: "bg-red-900/30 text-red-400" },
    { time: "09:15:30", event: "시스템", detail: "ThinQ AI 주간 감염 예측 모델 업데이트 완료", status: "성공", badge: "bg-slate-800 text-slate-300" },
    { time: "08:00:10", event: "가전 제어", detail: "104호 공기청정기 스마트루버 회전 가동", status: "성공", badge: "bg-blue-900/30 text-blue-400" },
  ];

  const performanceData = [
    { name: '1주차', 예측정확도: 85, 제어성공률: 92 }, { name: '2주차', 예측정확도: 88, 제어성공률: 94 },
    { name: '3주차', 예측정확도: 92, 제어성공률: 96 }, { name: '4주차', 예측정확도: 95, 제어성공률: 99 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-3 gap-6">
        <div onClick={() => setFmModal("CONN")} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex items-center gap-5 cursor-pointer hover:bg-slate-800 transition group">
          <div className="p-4 bg-green-900/20 rounded-xl text-green-400 group-hover:scale-110 transition"><Zap size={28}/></div>
          <div><p className="text-sm text-slate-400 font-medium mb-1 group-hover:text-green-400 transition">가전 연결 상태</p><p className="text-3xl font-black text-white">48<span className="text-lg font-normal ml-1 text-slate-500">대 정상</span></p></div>
        </div>
        <div onClick={() => setFmModal("AUTO")} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex items-center gap-5 cursor-pointer hover:bg-slate-800 transition group">
          <div className="p-4 bg-blue-900/20 rounded-xl text-blue-400 group-hover:scale-110 transition"><BatteryCharging size={28}/></div>
          <div><p className="text-sm text-slate-400 font-medium mb-1 group-hover:text-blue-400 transition">금일 AI 자동 제어</p><p className="text-3xl font-black text-white">124<span className="text-lg font-normal ml-1 text-slate-500">건</span></p></div>
        </div>
        <div onClick={() => setFmModal("FILTER")} className="bg-[#111827] border border-[#A50034]/50 rounded-2xl p-6 shadow-lg flex items-center gap-5 cursor-pointer hover:bg-slate-800 transition group">
          <div className="p-4 bg-red-900/20 rounded-xl text-[#A50034] group-hover:scale-110 transition"><Wrench size={28}/></div>
          <div><p className="text-sm text-slate-400 font-medium mb-1 group-hover:text-[#A50034] transition">필터 교체 알림</p><p className="text-3xl font-black text-[#A50034]">2<span className="text-lg font-normal ml-1 text-slate-500">대 필요</span></p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col h-[400px]">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><ActivitySquare size={20} className="text-blue-400"/> 시스템 운영 로그</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1F2937] text-slate-400 text-sm border-b border-slate-800">
                  <th className="p-4 font-semibold w-24">시간</th><th className="p-4 font-semibold">이벤트</th><th className="p-4 font-semibold">내용</th>
                </tr>
              </thead>
              <tbody>
                {LOGS.map((log, idx) => (
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition text-sm">
                    <td className="p-4 text-slate-400 font-mono">{log.time}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${log.badge}`}>{log.event}</span></td>
                    <td className="p-4 text-slate-200">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><CheckCircle2 size={20} className="text-green-400"/> 월간 KPI 리포트</h3>
          <p className="text-sm text-slate-400 mb-6">ThinQ AI 예측 모델 및 가전 제어 성능</p>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#A50034" stopOpacity={0.3}/><stop offset="95%" stopColor="#A50034" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorCtrl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[60, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', border: 'none' }} />
                <Area type="monotone" dataKey="예측정확도" stroke="#A50034" fillOpacity={1} fill="url(#colorAcc)" strokeWidth={3} />
                <Area type="monotone" dataKey="제어성공률" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCtrl)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* FM 모달 팝업들 */}
      {fmModal === "CONN" && (
        <Modal title="🔌 층별 가전 연결 상태 확인" onClose={() => setFmModal(null)}>
          <div className="grid grid-cols-2 gap-4 text-base">
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex justify-between items-center"><span className="text-slate-200">101호 공기청정기</span><span className="text-green-400 font-bold bg-green-900/20 px-3 py-1 rounded-lg"><Check size={16} className="inline mr-1"/> 정상 연동</span></div>
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex justify-between items-center"><span className="text-slate-200">101호 시스템에어컨</span><span className="text-green-400 font-bold bg-green-900/20 px-3 py-1 rounded-lg"><Check size={16} className="inline mr-1"/> 정상 연동</span></div>
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex justify-between items-center"><span className="text-slate-200">102호 환기시스템</span><span className="text-green-400 font-bold bg-green-900/20 px-3 py-1 rounded-lg"><Check size={16} className="inline mr-1"/> 정상 연동</span></div>
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex justify-between items-center"><span className="text-slate-200">102호 공기청정기</span><span className="text-green-400 font-bold bg-green-900/20 px-3 py-1 rounded-lg"><Check size={16} className="inline mr-1"/> 정상 연동</span></div>
            <div className="col-span-2 text-center text-sm text-slate-500 mt-4 bg-slate-800/50 py-3 rounded-lg border border-slate-700/50">전체 병동 48대 IoT 기기 100% 온라인 상태 유지 중</div>
          </div>
        </Modal>
      )}
      {fmModal === "AUTO" && (
        <Modal title="⚙️ 금일 호실별 자동 제어 내역" onClose={() => setFmModal(null)}>
           <ul className="space-y-3 text-base text-slate-200">
             <li className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl flex gap-4 items-start">
                <span className="text-blue-400 font-mono font-bold mt-0.5">10:45</span>
                <div><p className="font-bold text-white mb-1">[302호] 실내 CO2 상승 감지</p><p className="text-sm text-slate-400">환기기 터보 가동 (20분간 유지 후 모니터링)</p></div>
             </li>
             <li className="p-4 bg-red-900/10 border border-red-900/30 rounded-xl flex gap-4 items-start">
                <span className="text-red-400 font-mono font-bold mt-0.5">09:20</span>
                <div><p className="font-bold text-white mb-1">[202호] 환자 발열 감지 연동</p><p className="text-sm text-slate-400">에어컨 냉방 22도 목표로 하향 조절 완료</p></div>
             </li>
             <li className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl flex gap-4 items-start">
                <span className="text-slate-400 font-mono font-bold mt-0.5">08:00</span>
                <div><p className="font-bold text-white mb-1">[전체 병동] 아침 기상 루틴</p><p className="text-sm text-slate-400">전 객실 스마트 루버 활성화 및 공기청정 시작</p></div>
             </li>
           </ul>
        </Modal>
      )}
      {fmModal === "FILTER" && (
        <Modal title="🛠️ 기기 필터 교체 대상" onClose={() => setFmModal(null)}>
           <div className="space-y-4">
            <div className="p-5 border border-[#A50034]/50 bg-red-900/10 rounded-xl flex items-center justify-between">
              <div><h4 className="text-lg font-bold text-red-400 flex items-center gap-2"><AlertCircle size={18}/> 202호 공기청정기</h4><p className="text-sm text-slate-300 mt-2">헤파필터 수명 5% 잔여 (교체 시급)</p></div>
              <button className="px-4 py-2 bg-[#A50034] text-white text-sm font-bold rounded-lg hover:bg-red-700 shadow-lg">작업 완료 처리</button>
            </div>
            <div className="p-5 border border-orange-900/50 bg-orange-900/10 rounded-xl flex items-center justify-between">
              <div><h4 className="text-lg font-bold text-orange-400 flex items-center gap-2"><AlertCircle size={18}/> 104호 시스템 에어컨</h4><p className="text-sm text-slate-300 mt-2">프리필터 먼지 누적 (청소 권장 단계)</p></div>
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
  const costData = [
    { name: '1주차', 수동방역비용: 120, ThinQ자동제어: 45 }, { name: '2주차', 수동방역비용: 130, ThinQ자동제어: 48 },
    { name: '3주차', 수동방역비용: 110, ThinQ자동제어: 42 }, { name: '4주차', 수동방역비용: 140, ThinQ자동제어: 50 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-start mb-4"><h3 className="text-slate-400 font-semibold text-sm">월간 에너지/인건비 절감액</h3><TrendingDown className="text-green-400" size={20} /></div>
          <div className="text-4xl font-black text-white">₩ 1,240,000</div>
          <p className="text-sm text-green-400 mt-3 font-medium bg-green-900/20 px-3 py-1.5 rounded-lg inline-block">전년 동월 대비 24% 절감 (IoT 환경 최적화)</p>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-start mb-4"><h3 className="text-slate-400 font-semibold text-sm">원내 감염 확산 차단율</h3><ShieldAlert className="text-blue-400" size={20} /></div>
          <div className="text-4xl font-black text-white">100<span className="text-2xl text-slate-500 font-medium">%</span></div>
          <p className="text-sm text-blue-400 mt-3 font-medium bg-blue-900/20 px-3 py-1.5 rounded-lg inline-block">이번 달 교차 감염 발생 0건 달성</p>
        </div>
        <div className="bg-gradient-to-br from-[#A50034] to-[#7B0027] rounded-2xl p-6 shadow-lg text-white">
          <div className="flex justify-between items-start mb-4"><h3 className="text-white/80 font-semibold text-sm">법적 컴플라이언스 (질병청)</h3><CheckCircle2 className="text-white" size={20} /></div>
          <div className="text-4xl font-black">100% 충족</div>
          <p className="text-sm text-white/90 mt-3 font-medium flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg"><Lightbulb size={16}/> CO2, 환기량, 온습도 기준치 완벽 달성</p>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 shadow-lg">
        <h3 className="text-xl font-bold text-white mb-8 border-b border-slate-800 pb-4">수동 방역 vs ThinQ 자동 제어 유지비용 비교 (단위: 만원)</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 14 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 14 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none', padding: '12px' }} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
              <Bar dataKey="수동방역비용" name="기존 수동 방역 및 인력 관리 비용" fill="#4B5563" radius={[6, 6, 0, 0]} barSize={50} />
              <Bar dataKey="ThinQ자동제어" name="ThinQ 도입 후 스마트 최적화 유지비용" fill="#10B981" radius={[6, 6, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 🧱 재사용 컴포넌트: 모달 껍데기
// ============================================================================
function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/80">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition bg-slate-800 p-2 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}