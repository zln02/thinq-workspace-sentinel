"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",            label: "🏠 홈" },
  { href: "/executive",   label: "🖥 시설장" },
  { href: "/operations",  label: "⚡ 운영자" },
  { href: "/family",      label: "💚 가족" },
  { href: "/mobile",      label: "📱 모바일" },
  { href: "/admin/kpi",   label: "📊 PT 대시보드" },
  { href: "/demo",        label: "💡 시연" },
];

export default function NavSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-48 min-h-screen bg-white border-r flex flex-col py-6 px-3 gap-1 fixed left-0 top-0">
      <span className="font-bold text-[#A50034] text-lg px-3 mb-4">Sentinel</span>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
            pathname === n.href
              ? "bg-[#FCE8EE] text-[#A50034]"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {n.label}
        </Link>
      ))}
    </aside>
  );
}