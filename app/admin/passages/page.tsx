"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPassageList() {
  const [parsedPassage, setParsedPassage] = useState<any>(null);
  const [myCheckpoints, setMyCheckpoints] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // sessionStorage에서 파싱된 지문 확인
    const stored = sessionStorage.getItem('parsedPassage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setParsedPassage(parsed);
      } catch (e) {
        console.error('Failed to parse stored passage:', e);
      }
    }

    // 현재 사용자 정보 및 본인이 작성한 체크포인트 로드
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
            return;
          }
          return;
        }

        if (checkpoints && checkpoints.length > 0) {
          // 지문별로 그룹화 (중복 제거)
          const passageMap = new Map();
          checkpoints.forEach((cp: any) => {
            if (cp.passages && !passageMap.has(cp.passage_id)) {
              passageMap.set(cp.passage_id, {
                ...cp.passages,
                checkpointCount: 0,
                latestCheckpoint: cp,
              });
            }
            if (passageMap.has(cp.passage_id)) {
              passageMap.get(cp.passage_id).checkpointCount++;
            }
          });
          setMyCheckpoints(Array.from(passageMap.values()));
        } else {
          setMyCheckpoints([]);
        }
      } catch (err) {
        console.error("체크포인트 로드 중 오류:", err);
        setMyCheckpoints([]);
      }
    };

    loadMyCheckpoints();
  }, []);

  const getCategoryUrl = (category: string) => {
    if (parsedPassage) {
      const params = new URLSearchParams({
        title: parsedPassage.title || "",
        source: parsedPassage.source || "",
        content: parsedPassage.content,
      });
      return `/admin/passages/${category}?${params.toString()}`;
    }
    return `/admin/passages/${category}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            지문 관리
          </h1>
          <p className="text-gray-600">수능 지문을 카테고리별로 관리합니다.</p>
        </div>

        {/* 내가 작성한 체크포인트 섹션 */}
        {myCheckpoints.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 shadow-xl mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                내가 작성한 체크포인트
              </h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                {myCheckpoints.length}개 지문
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">본인이 작성한 체크포인트가 있는 지문을 바로 확인할 수 있습니다.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {myCheckpoints.map((passage: any) => (
                <Link
                  key={passage.id}
                  href={`/admin/passages/${passage.id}`}
                  className="group p-4 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2 flex-1">
                      {passage.title || "(제목 없음)"}
                    </h3>
                    <svg className="w-5 h-5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      {passage.category || "기타"}
                    </span>
                    {passage.year && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded">
                        {passage.year}년
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    체크포인트 {passage.checkpointCount}개
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {parsedPassage && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700">
              파싱된 지문이 있습니다. 카테고리를 선택하면 자동으로 입력됩니다.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href={getCategoryUrl("ebs")}
            className="group relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">EBS</h2>
                <svg className="w-6 h-6 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">수능특강/수능완성 지문 관리</p>
            </div>
          </Link>

          <Link
            href={getCategoryUrl("gichul")}
            className="group relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-emerald-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">평가원 기출</h2>
                <svg className="w-6 h-6 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">수능 기출 지문 관리</p>
            </div>
          </Link>

          <Link
            href={getCategoryUrl("leet")}
            className="group relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-violet-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">LEET</h2>
                <svg className="w-6 h-6 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">LEET 언어이해/추리논증 지문 관리</p>
            </div>
          </Link>

          <Link
            href={getCategoryUrl("other")}
            className="group relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-gray-600 transition-colors">기타</h2>
                <svg className="w-6 h-6 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">기타 지문 관리</p>
            </div>
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">새 지문 등록</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/passages/new/ebs"
              className="group flex items-center justify-between p-4 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
                  E
                </div>
                <span className="font-semibold text-gray-700 group-hover:text-blue-600">EBS 지문 등록</span>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/admin/passages/new/gichul"
              className="group flex items-center justify-between p-4 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">
                  기
                </div>
                <span className="font-semibold text-gray-700 group-hover:text-green-600">평가원 기출 등록</span>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-green-500 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/admin/passages/new/leet"
              className="group flex items-center justify-between p-4 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg flex items-center justify-center text-white font-bold">
                  L
                </div>
                <span className="font-semibold text-gray-700 group-hover:text-purple-600">LEET 지문 등록</span>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/admin/passages/new/other"
              className="group flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-slate-500 rounded-lg flex items-center justify-center text-white font-bold">
                  기
                </div>
                <span className="font-semibold text-gray-700 group-hover:text-gray-600">기타 지문 등록</span>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-500 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl">
          <Link
            href="/admin/passages/all"
            className="group flex items-center justify-between p-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">전체 지문 보기</h3>
                <p className="text-sm opacity-90">모든 카테고리의 지문을 한 번에 확인합니다</p>
              </div>
            </div>
            <svg className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
