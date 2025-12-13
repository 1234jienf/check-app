"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TeacherCalendar from "@/components/TeacherCalendar";

export default function SchedulePage() {
  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img src="/pawn_black.svg" alt="Pawn" className="w-8 h-8 md:w-10 md:h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
            스케줄 관리
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
          </h1>
          </div>
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>일정을 추가하고 관리하세요.</p>
        </div>

        <div className="rounded-xl p-4 md:p-6 lg:p-8 shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
          <TeacherCalendar />
        </div>
      </div>
    </div>
  );
}

