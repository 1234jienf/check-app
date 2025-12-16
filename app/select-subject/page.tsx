"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SelectSubjectPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubjects = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("subjects")
        .eq("id", user.id)
        .single();

      if (userData && userData.subjects && Array.isArray(userData.subjects)) {
        setSubjects(userData.subjects);
        
        // 과목이 하나만 있으면 자동으로 리다이렉트
        if (userData.subjects.length === 1) {
          const subject = userData.subjects[0];
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('selectedSubject', subject);
          }
          if (subject === 'korean') {
            router.push("/student/korean");
          } else if (subject === 'english') {
            router.push("/student/english");
          }
          return;
        }
      } else {
        // 기본값: 국어만
        setSubjects(['korean']);
        // 기본값이 국어 하나이므로 자동 리다이렉트
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('selectedSubject', 'korean');
        }
        router.push("/student/korean");
        return;
      }

      setLoading(false);
    };

    loadSubjects();
  }, [router]);

  const handleSubjectSelect = (subject: string) => {
    // 세션 스토리지에 선택한 과목 저장
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedSubject', subject);
    }
    
    if (subject === 'korean') {
      router.push("/student/korean");
    } else if (subject === 'english') {
      router.push("/student/english");
    }
  };

  if (loading || subjects.length === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0EEEB' }}>
        <div className="text-center">
          <div className="mx-auto mb-4" style={{ 
            animation: 'spin 2s linear infinite, pulse 2s ease-in-out infinite',
            width: '80px',
            height: '80px'
          }}>
            <img 
              src="/bishop-logo.png" 
              alt="Loading" 
              className="w-full h-full"
              style={{ filter: 'grayscale(100%) brightness(0.8)' }}
            />
          </div>
          <p className="text-[#13181B]">로딩 중...</p>
          <style jsx>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#13181B' }}>과목 선택</h1>
          <p className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>학습할 과목을 선택하세요</p>
        </div>

        <div className="space-y-4">
          {subjects.includes('korean') && (
            <button
              onClick={() => handleSubjectSelect('korean')}
              className="w-full rounded-xl p-6 shadow-sm transition-all text-left"
              style={{ backgroundColor: '#FFFFFF' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#CCD5DA';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1" style={{ color: '#13181B' }}>국어</h2>
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>국어 지문 학습</p>
                </div>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {subjects.includes('english') && (
            <button
              onClick={() => handleSubjectSelect('english')}
              className="w-full rounded-xl p-6 shadow-sm transition-all text-left"
              style={{ backgroundColor: '#FFFFFF' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#CCD5DA';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1" style={{ color: '#13181B' }}>영어</h2>
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>영어 지문 학습</p>
                </div>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

