"use client";

import Link from "next/link";

export default function StudentPage() {
  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img src="/pawn_black.svg" alt="Pawn" className="w-10 h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
              자료 선택
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
            </h1>
          </div>
          <p style={{ color: '#13181B', opacity: 0.8 }}>학습할 지문 카테고리를 선택하세요</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/student/passages/ebs"
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
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>수능특강/수능완성 지문</p>
                </div>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#003A6C' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/student/passages/gichul"
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
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>수능 기출 지문</p>
                </div>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FFBF65' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/student/passages/leet"
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
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>LEET 언어이해/추리논증 지문</p>
                </div>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FD8973' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/student/passages/other"
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
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>기타 지문</p>
                </div>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

