"use client";

import Link from "next/link";

export default function StudentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            자료 선택
          </h1>
          <p className="text-gray-600">학습할 지문 카테고리를 선택하세요</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/student/passages/gichul"
            className="group bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
              <span className="text-3xl">📚</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">평가원 기출</h2>
            <p className="text-sm text-gray-600">수능 기출 문제 지문</p>
          </Link>

          <Link
            href="/student/passages/ebs"
            className="group bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
              <span className="text-3xl">📖</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">EBS</h2>
            <p className="text-sm text-gray-600">EBS 수능특강 및 수능완성</p>
          </Link>

          <Link
            href="/student/passages/leet"
            className="group bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
              <span className="text-3xl">⚖️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">LEET</h2>
            <p className="text-sm text-gray-600">법학전문대학원 입학시험</p>
          </Link>

          <Link
            href="/student/passages/other"
            className="group bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
              <span className="text-3xl">📄</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">기타</h2>
            <p className="text-sm text-gray-600">기타 지문</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

