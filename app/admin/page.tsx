"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [students, setStudents] = useState<any[]>([]);

  // 승인 대기 학생 불러오기
  const fetchPending = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, approved")
      .eq("role", "student")
      .eq("approved", false);

    if (!error) setStudents(data || []);
  };

  // 승인 처리
  const approveStudent = async (id: string) => {
    const { error } = await supabase
      .from("users")
      .update({ approved: true })
      .eq("id", id);

    if (!error) {
      alert("승인 완료!");
      fetchPending();
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            학생 관리
          </h1>
          <p className="text-gray-600">승인 대기 중인 학생을 관리합니다.</p>
        </div>

        {students.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl text-center">
            <p className="text-gray-500 text-lg">승인 대기 중인 학생이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {students.map((s: any) => (
              <div
                key={s.id}
                className="group relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                        {s.name}
                      </h3>
                      <p className="text-sm text-gray-600">{s.email}</p>
                    </div>
                    <button
                      onClick={() => approveStudent(s.id)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      승인하기
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
