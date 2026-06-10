// frontend/app/family/page.tsx
// 정규화: 구 보호자 화면(/family)은 최신 보호자 PWA(/guardian/home)로 통합됨.
import { redirect } from "next/navigation";

export default function FamilyRedirect() {
  redirect("/guardian/home");
}
