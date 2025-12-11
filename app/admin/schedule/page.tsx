"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TeacherCalendar from "@/components/TeacherCalendar";

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            스케줄 관리
          </h1>
          <p className="text-gray-600">일정을 추가하고 관리하세요.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 shadow-xl">
          <TeacherCalendar />
        </div>
      </div>
    </div>
  );
}

