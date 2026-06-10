// frontend/app/admin/page.tsx
// 정규화: 구 통합관제(/admin)는 메인 운영 대시보드(/dashboard)로 통합됨.
import { redirect } from "next/navigation";

export default function AdminRedirect() {
  redirect("/dashboard");
}
