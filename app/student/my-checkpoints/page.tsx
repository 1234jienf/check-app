"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MyCheckpointsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [myPassages, setMyPassages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      
      // 내가 체크포인트를 작성한 지문들 가져오기
      const { data: submissions } = await supabase
        .from("student_checkpoint_record")
        .select("passage_id, passages(id, title, category, source)")
        .eq("user_id", user.id);

      if (submissions) {
        // 중복 제거 및 정렬
        const passageMap = new Map();
        submissions
          .filter((s: any) => s.passages)
          .forEach((s: any) => {
            if (!passageMap.has(s.passage_id)) {
              passageMap.set(s.passage_id, s.passages);
            }
          });
        
        const uniquePassages = Array.from(passageMap.values());
        // 제목으로 정렬
        uniquePassages.sort((a: any, b: any) => {
          const titleA = a.title || "";
          const titleB = b.title || "";
          return titleA.localeCompare(titleB, "ko");
        });
        
        setMyPassages(uniquePassages);
      }

      setLoading(false);
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            내 체크포인트
          </h1>
          <p className="text-gray-600">작성한 체크포인트를 확인할 수 있는 지문 목록입니다.</p>
        </div>

        {myPassages.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-12 shadow-xl text-center">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-500 text-lg mb-2">아직 작성한 체크포인트가 없습니다.</p>
            <Link
              href="/student"
              className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              지문 선택하러 가기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myPassages.map((passage: any) => (
              <Link
                key={passage.id}
                href={`/student/passages/${passage.id}/checkpoint`}
                className="group bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {passage.title || "(제목 없음)"}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        {passage.category}
                      </span>
                      {passage.source && (
                        <span className="text-xs text-gray-500 truncate">{passage.source}</span>
                      )}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                <div className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-200">
                  체크포인트 확인하기 →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

