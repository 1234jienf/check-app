"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function MyCheckpointsPage() {
  const [myCheckpoints, setMyCheckpoints] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMyCheckpoints = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserId(user.id);

        // 본인이 작성한 체크포인트가 있는 지문들 가져오기
        // teacher_id 컬럼이 없거나 NULL인 경우도 포함 (기존 체크포인트는 모두 표시)
        const { data: checkpoints, error } = await supabase
          .from("checkpoints")
          .select(`
            id,
            passage_id,
            paragraph,
            text,
            order_num,
            teacher_id,
            passages(id, title, category, year, source)
          `)
          .or(`teacher_id.eq.${user.id},teacher_id.is.null`);

        if (error) {
          console.error("체크포인트 로드 오류:", error);
          // 컬럼이 없으면 빈 배열로 설정
          if (error.code === "42703") {
            setMyCheckpoints([]);
            setLoading(false);
            return;
          }
          setLoading(false);
          return;
        }

        if (checkpoints && checkpoints.length > 0) {
          // 지문별로 그룹화 (중복 제거)
          const passageMap = new Map();
          checkpoints.forEach((cp: any) => {
            if (cp.passages && !passageMap.has(cp.passage_id)) {
              passageMap.set(cp.passage_id, {
                ...cp.passages,
                checkpoints: [],
              });
            }
            if (passageMap.has(cp.passage_id)) {
              passageMap.get(cp.passage_id).checkpoints.push(cp);
            }
          });
          setMyCheckpoints(Array.from(passageMap.values()));
        } else {
          setMyCheckpoints([]);
        }
        setLoading(false);
      } catch (err) {
        console.error("체크포인트 로드 중 오류:", err);
        setMyCheckpoints([]);
        setLoading(false);
      }
    };

    loadMyCheckpoints();
  }, []);

  const getCategoryPath = (category: string) => {
    if (category === "EBS") return "/admin/passages/ebs";
    if (category === "기출" || category === "평가원") return "/admin/passages/gichul";
    if (category === "LEET") return "/admin/passages/leet";
    if (category === "기타") return "/admin/passages/other";
    return "/admin/passages";
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "EBS":
        return "from-blue-600 to-indigo-600";
      case "기출":
        return "from-green-600 to-emerald-600";
      case "LEET":
        return "from-purple-600 to-violet-600";
      default:
        return "from-gray-600 to-slate-600";
    }
  };

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
            내가 작성한 체크포인트
          </h1>
          <p className="text-gray-600">본인이 작성한 체크포인트가 있는 지문을 확인할 수 있습니다.</p>
        </div>

        {myCheckpoints.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-12 shadow-xl text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">작성한 체크포인트가 없습니다</h2>
            <p className="text-gray-600 mb-6">
              지문에 체크포인트를 추가하면 여기에 표시됩니다.
            </p>
            <Link
              href="/admin/passages"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
            >
              지문 관리로 이동
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCheckpoints.map((passage: any) => (
              <div
                key={passage.id}
                className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col"
              >
                {/* 헤더 */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <Link
                      href={`/admin/passages/${passage.id}`}
                      className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 flex-1"
                    >
                      {passage.title || "(제목 없음)"}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold text-white rounded-full bg-gradient-to-r ${getCategoryColor(passage.category || "기타")}`}>
                      {passage.category || "기타"}
                    </span>
                    {passage.year && (
                      <span className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
                        {passage.year}년
                      </span>
                    )}
                    <span className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">
                      체크 {passage.checkpoints.length}개
                    </span>
                  </div>
                  {passage.source && (
                    <p className="text-xs text-gray-500 line-clamp-1">출처: {passage.source}</p>
                  )}
                </div>

                {/* 체크포인트 미리보기 (최대 3개) */}
                <div className="flex-1 space-y-2 mb-4">
                  {passage.checkpoints
                    .sort((a: any, b: any) => (a.order_num || 0) - (b.order_num || 0))
                    .slice(0, 3)
                    .map((cp: any) => (
                      <div
                        key={cp.id}
                        className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded">
                            {cp.order_num || "?"}
                          </span>
                          {cp.paragraph && (
                            <span className="text-xs text-gray-500">
                              {cp.paragraph}문단
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 line-clamp-2">{cp.text}</p>
                      </div>
                    ))}
                  {passage.checkpoints.length > 3 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      + {passage.checkpoints.length - 3}개 더 보기
                    </div>
                  )}
                </div>

                {/* 하단 버튼 */}
                <Link
                  href={`/admin/passages/${passage.id}`}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  지문 보기
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

