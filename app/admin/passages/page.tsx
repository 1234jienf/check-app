"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img src="/pawn_black.svg" alt="Pawn" className="w-10 h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
              지문 관리
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
            </h1>
          </div>
          <p style={{ color: '#13181B', opacity: 0.8 }}>수능 지문을 카테고리별로 관리합니다.</p>
        </div>


        {parsedPassage && (
          <div className="mb-6 p-4 rounded-xl border-2" style={{ backgroundColor: '#CCD5DA', borderColor: '#13181B' }}>
            <p className="text-sm" style={{ color: '#13181B' }}>
              파싱된 지문이 있습니다. 카테고리를 선택하면 자동으로 입력됩니다.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href={getCategoryUrl("ebs")}
            className="group relative border-2 p-6 transition-all duration-200"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#003A6C';
              e.currentTarget.style.backgroundColor = '#CCD5DA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#13181B';
              e.currentTarget.style.backgroundColor = '#F0EEEB';
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/bishop_black.svg" alt="Bishop" className="w-8 h-8" style={{ filter: 'brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(2000%) hue-rotate(195deg) brightness(0.3) contrast(1.2)' }} />
                <div>
                  <h2 className="text-2xl font-bold mb-1 relative inline-block pb-1" style={{ color: '#003A6C' }}>
                    EBS
                    <span className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, #003A6C 0%, #003A6C 50%, transparent 100%)', borderRadius: '2px' }}></span>
                  </h2>
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>수능특강/수능완성 지문 관리</p>
                </div>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#003A6C' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href={getCategoryUrl("gichul")}
            className="group relative border-2 p-6 transition-all duration-200"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FFBF65';
              e.currentTarget.style.backgroundColor = '#CCD5DA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#13181B';
              e.currentTarget.style.backgroundColor = '#F0EEEB';
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/bishop_black.svg" alt="Bishop" className="w-8 h-8" style={{ filter: 'brightness(0) saturate(100%) invert(76%) sepia(95%) saturate(2000%) hue-rotate(340deg) brightness(1.1) contrast(1.1)' }} />
                <div>
                  <h2 className="text-2xl font-bold mb-1 relative inline-block pb-1" style={{ color: '#FFBF65' }}>
                    평가원 기출
                    <span className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, #FFBF65 0%, #FFBF65 50%, transparent 100%)', borderRadius: '2px' }}></span>
                  </h2>
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>수능 기출 지문 관리</p>
                </div>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FFBF65' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href={getCategoryUrl("leet")}
            className="group relative border-2 p-6 transition-all duration-200"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FD8973';
              e.currentTarget.style.backgroundColor = '#CCD5DA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#13181B';
              e.currentTarget.style.backgroundColor = '#F0EEEB';
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/bishop_black.svg" alt="Bishop" className="w-8 h-8" style={{ filter: 'brightness(0) saturate(100%) invert(60%) sepia(95%) saturate(2000%) hue-rotate(330deg) brightness(1.05) contrast(1.1)' }} />
                <div>
                  <h2 className="text-2xl font-bold mb-1 relative inline-block pb-1" style={{ color: '#FD8973' }}>
                    LEET
                    <span className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, #FD8973 0%, #FD8973 50%, transparent 100%)', borderRadius: '2px' }}></span>
                  </h2>
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>LEET 언어이해/추리논증 지문 관리</p>
                </div>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FD8973' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href={getCategoryUrl("other")}
            className="group relative border-2 p-6 transition-all duration-200"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#13181B';
              e.currentTarget.style.backgroundColor = '#CCD5DA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#13181B';
              e.currentTarget.style.backgroundColor = '#F0EEEB';
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/bishop_black.svg" alt="Bishop" className="w-8 h-8" style={{ filter: 'brightness(0) saturate(100%)' }} />
                <div>
                  <h2 className="text-2xl font-bold mb-1 relative inline-block pb-1" style={{ color: '#13181B' }}>
                    기타
                    <span className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
                  </h2>
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>기타 지문 관리</p>
                </div>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        <div className="border-2 p-8 mb-8" style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}>
          <div className="flex items-center gap-3 mb-6">
            <img src="/globe.svg" alt="Globe" className="w-8 h-8" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h2 className="text-2xl font-bold" style={{ color: '#13181B' }}>
              새 지문 등록
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/passages/new/ebs"
              className="group relative flex items-center justify-between p-4 border-2 transition-all"
              style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#003A6C';
                e.currentTarget.style.backgroundColor = '#CCD5DA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.backgroundColor = '#F0EEEB';
              }}
            >
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#003A6C' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-semibold" style={{ color: '#13181B' }}>EBS 지문 등록</span>
              </div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#003A6C' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/admin/passages/new/gichul"
              className="group relative flex items-center justify-between p-4 border-2 transition-all"
              style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FFBF65';
                e.currentTarget.style.backgroundColor = '#CCD5DA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.backgroundColor = '#F0EEEB';
              }}
            >
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FFBF65' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-semibold" style={{ color: '#13181B' }}>평가원 기출 등록</span>
              </div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FFBF65' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/admin/passages/new/leet"
              className="group relative flex items-center justify-between p-4 border-2 transition-all"
              style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FD8973';
                e.currentTarget.style.backgroundColor = '#CCD5DA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.backgroundColor = '#F0EEEB';
              }}
            >
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FD8973' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-semibold" style={{ color: '#13181B' }}>LEET 지문 등록</span>
              </div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FD8973' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/admin/passages/new/other"
              className="group relative flex items-center justify-between p-4 border-2 transition-all"
              style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.backgroundColor = '#CCD5DA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.backgroundColor = '#F0EEEB';
              }}
            >
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-semibold" style={{ color: '#13181B' }}>기타 지문 등록</span>
              </div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="border-2 p-8" style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}>
          <Link
            href="/admin/passages/all"
            className="group flex items-center justify-between p-6 transition-all duration-200"
            style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#003A6C'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#13181B'}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(240, 238, 235, 0.2)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">전체 지문 보기</h3>
                <p className="text-sm" style={{ opacity: 0.9 }}>모든 카테고리의 지문을 한 번에 확인합니다</p>
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
