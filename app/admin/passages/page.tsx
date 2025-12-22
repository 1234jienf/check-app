"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPassageList() {
  const [parsedPassage, setParsedPassage] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<"korean" | "english">("korean");

  useEffect(() => {
    // sessionStorage에서 파싱된 지문 확인
    const stored = sessionStorage.getItem('parsedPassage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setParsedPassage(parsed);
      } catch (e) {
      }
    }

    // 세션에서 선택한 과목 불러오기
    if (typeof window !== 'undefined') {
      const savedSubject = sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null;
      if (savedSubject) {
        setSelectedSubject(savedSubject);
      }

      // 과목 변경 이벤트 리스너
      const handleSubjectChanged = (event: CustomEvent) => {
        const newSubject = event.detail.subject as "korean" | "english";
        setSelectedSubject(newSubject);
      };

      window.addEventListener('subjectChanged', handleSubjectChanged as EventListener);
      
      return () => {
        window.removeEventListener('subjectChanged', handleSubjectChanged as EventListener);
      };
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
          <div className="mb-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
            지문 관리
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
          </h1>
          </div>
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>수능 지문을 카테고리별로 관리합니다.</p>
        </div>


        {parsedPassage && (
          <div className="mb-6 p-4 rounded-xl shadow-sm" style={{ backgroundColor: '#CCD5DA' }}>
            <p className="text-sm" style={{ color: '#13181B' }}>
              파싱된 지문이 있습니다. 카테고리를 선택하면 자동으로 입력됩니다.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href={getCategoryUrl("ebs")}
            className="group relative rounded-xl p-6 shadow-sm transition-all duration-200"
            style={{ backgroundColor: '#F0EEEB' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#CCD5DA';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F0EEEB';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1 relative inline-block pb-1" style={{ color: '#13181B' }}>
                  EBS
                  <span className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
                </h2>
                <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>수능특강/수능완성 지문 관리</p>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href={getCategoryUrl("gichul")}
            className="group relative rounded-xl p-6 shadow-sm transition-all duration-200"
            style={{ backgroundColor: '#F0EEEB' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#CCD5DA';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F0EEEB';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1 relative inline-block pb-1" style={{ color: '#13181B' }}>
                  기출
                  <span className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
                </h2>
                <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>수능 기출 지문 관리</p>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {selectedSubject === "korean" && (
            <Link
              href={getCategoryUrl("leet")}
              className="group relative rounded-xl p-6 shadow-sm transition-all duration-200"
              style={{ backgroundColor: '#F0EEEB' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#CCD5DA';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F0EEEB';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1 relative inline-block pb-1" style={{ color: '#13181B' }}>
                    LEET
                    <span className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
                  </h2>
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>LEET 언어이해/추리논증 지문 관리</p>
                </div>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          )}

          <Link
            href={getCategoryUrl("other")}
            className="group relative rounded-xl p-6 shadow-sm transition-all duration-200"
            style={{ backgroundColor: '#F0EEEB' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#CCD5DA';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F0EEEB';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1 relative inline-block pb-1" style={{ color: '#13181B' }}>
                  기타
                  <span className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
                </h2>
                <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>기타 지문 관리</p>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        <div className="rounded-xl p-8 mb-8 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold" style={{ color: '#13181B' }}>
              새 지문 등록
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/passages/new/ebs"
              className="group relative flex items-center justify-between p-4 rounded-xl shadow-sm transition-all"
              style={{ backgroundColor: '#FFFFFF' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
              }}
            >
              <div>
                <span className="font-semibold" style={{ color: '#13181B' }}>EBS 지문 등록</span>
              </div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/admin/passages/new/gichul"
              className="group relative flex items-center justify-between p-4 rounded-xl shadow-sm transition-all"
              style={{ backgroundColor: '#FFFFFF' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
              }}
            >
              <div>
                <span className="font-semibold" style={{ color: '#13181B' }}>기출 등록</span>
              </div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {selectedSubject === "korean" && (
              <Link
                href="/admin/passages/new/leet"
                className="group relative flex items-center justify-between p-4 rounded-xl shadow-sm transition-all"
                style={{ backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                }}
              >
                <div>
                  <span className="font-semibold" style={{ color: '#13181B' }}>LEET 지문 등록</span>
                </div>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}

            <Link
              href="/admin/passages/new/other"
              className="group relative flex items-center justify-between p-4 rounded-xl shadow-sm transition-all"
              style={{ backgroundColor: '#FFFFFF' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
              }}
            >
              <div>
                <span className="font-semibold" style={{ color: '#13181B' }}>기타 지문 등록</span>
              </div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="rounded-xl p-8 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <Link
            href="/admin/passages/all"
            className="group flex items-center justify-between p-6 rounded-xl transition-all duration-200 shadow-sm"
            style={{ backgroundColor: '#13181B', color: '#F0EEEB', boxShadow: '0 2px 6px rgba(19, 24, 27, 0.2)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#13181B';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#13181B';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 24, 27, 0.2)';
            }}
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
