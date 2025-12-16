"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const selectedSubject = sessionStorage.getItem('selectedSubject') as "korean" | "english" | null;
      if (selectedSubject === "english") {
        router.replace("/student/english");
      } else {
        router.replace("/student/korean");
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="text-center">
        <p style={{ color: '#13181B' }}>로딩 중...</p>
      </div>
    </div>
  );
}
