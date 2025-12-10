"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PassagesRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  
  useEffect(() => {
    if (type === "EBS") {
      router.replace("/student/passages/ebs");
    } else if (type === "기출" || type === "평가원") {
      router.replace("/student/passages/gichul");
    } else if (type === "LEET") {
      router.replace("/student/passages/leet");
    } else {
      router.replace("/student");
    }
  }, [type, router]);
  
  return null;
}

export default function PassagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <PassagesRedirect />
    </Suspense>
  );
}
