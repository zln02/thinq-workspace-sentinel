"use client";
import { useRouter, useSearchParams } from "next/navigation";

const PERSONAS = [
  { id: "icn",       label: "이정희", role: "감염관리자" },
  { id: "director",  label: "박원장", role: "시설장" },
  { id: "fm",        label: "장혁준", role: "시설관리" },
  { id: "caregiver", label: "최주임", role: "간병인력" },
  { id: "family",    label: "김할머니", role: "가족" },
];

export default function PersonaSwitcher() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("persona") || "icn";

  return (
    <div className="flex gap-2 flex-wrap">
      {PERSONAS.map((p) => (
        <button
          key={p.id}
          onClick={() => router.push(`?persona=${p.id}`)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
            current === p.id
              ? "bg-[#A50034] text-white border-[#A50034]"
              : "bg-white text-gray-600 border-gray-300 hover:border-[#A50034]"
          }`}
        >
          {p.label} · {p.role}
        </button>
      ))}
    </div>
  );
}