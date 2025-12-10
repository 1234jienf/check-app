"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminPassageList() {
  const [parsedPassage, setParsedPassage] = useState<any>(null);

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
