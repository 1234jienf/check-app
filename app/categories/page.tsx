"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Categories() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/student");
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #F0EEEB, #CCD5DA)' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#FFBF65', borderTopColor: 'transparent' }}></div>
        <p className="text-[#13181B]">리다이렉트 중...</p>
      </div>
    </div>
  );
}
