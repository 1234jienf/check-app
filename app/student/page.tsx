"use client";

import Link from "next/link";

export default function StudentPage() {
  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="mb-2">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
              자료 선택
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
            </h1>
          </div>
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>학습할 지문 카테고리를 선택하세요</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/student/passages/ebs"
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
                <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>수능특강/수능완성 지문</p>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/student/passages/gichul"
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
                  평가원 기출
                  <span className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
                </h2>
                <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>수능 기출 지문</p>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/student/passages/leet"
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
                <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>LEET 언어이해/추리논증 지문</p>
              </div>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/student/passages/other"
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
                <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>기타 지문</p>
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

