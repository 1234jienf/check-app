"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#FFBF65', borderTopColor: 'transparent' }}></div>
        <p className="text-[#13181B]">리다이렉트 중...</p>
      </div>
    </div>
  );
}
