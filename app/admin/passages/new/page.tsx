"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewPassagePage() {
  const router = useRouter();

  useEffect(() => {
    // 카테고리별 페이지로 리다이렉트
    router.push("/admin/passages");
  }, [router]);

  return (
    <div className="p-10">
      <p>리다이렉트 중...</p>
    </div>
  );
}
