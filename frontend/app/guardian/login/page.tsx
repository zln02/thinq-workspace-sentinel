"use client";
// 보호자 인증 (데모: 보호자명 + 환자명 + 병실/초대코드). 실서비스는 본인인증/SSO 연동 자리.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { setSession } from "@/lib/guardian";

export default function LoginPage() {
  const router = useRouter();
  const [guardian, setGuardian] = useState("");
  const [patient, setPatient] = useState("");
  const [room, setRoom] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSession({
      guardian: guardian.trim() || "보호자",
      patient: patient.trim() || "김복순 어르신",
      room: room.trim() || "201호 다인실",
      space_id: "ward_a", // 데모 연동 공간(실센서 병동)
    });
    router.replace("/guardian/home");
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[#A50034] flex items-center justify-center text-white">
          <ShieldCheck size={26} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">LG ThinQ 케어</h1>
          <p className="text-xs text-slate-500">가족 안심 서비스 로그인</p>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
        병원에서 받으신 <b>초대 정보</b>로 입장하세요.<br />부모님이 계신 병동의 안전 상태를 실시간으로 확인합니다.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="보호자 성함" value={guardian} onChange={setGuardian} placeholder="예: 박민지" />
        <Field label="어르신 성함" value={patient} onChange={setPatient} placeholder="예: 김복순 어르신" />
        <Field label="병실 / 초대코드" value={room} onChange={setRoom} placeholder="예: 201호 다인실" />
        <button type="submit" className="mt-3 h-13 py-3.5 rounded-2xl bg-[#A50034] text-white font-bold flex items-center justify-center gap-1 active:scale-[.98] transition">
          입장하기 <ChevronRight size={18} />
        </button>
      </form>

      <p className="mt-auto text-[11px] text-slate-400 text-center leading-relaxed">
        ※ 시연용 데모 로그인입니다. 실서비스는 휴대폰 본인인증·병원 초대코드로 연동됩니다.
      </p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-slate-500 ml-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[15px] outline-none focus:border-[#A50034] transition"
      />
    </label>
  );
}
