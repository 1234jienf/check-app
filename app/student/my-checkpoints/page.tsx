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
  const [selectedSubject, setSelectedSubject] = useState<"korean" | "english">("korean");

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      
      // 현재 선택한 과목 가져오기 (경로에서 추론)
      let currentSubject: "korean" | "english" = "korean";
      if (typeof window !== 'undefined') {
        const savedSubject = sessionStorage.getItem('selectedSubject') as "korean" | "english" | null;
        if (savedSubject) {
          currentSubject = savedSubject;
        } else {
          // 경로에서 추론
          const path = window.location.pathname;
          if (path.includes('/english') || path.includes('/student/materials') || path.includes('/daily-test')) {
            currentSubject = "english";
            sessionStorage.setItem('selectedSubject', 'english');
          } else {
            currentSubject = "korean";
            sessionStorage.setItem('selectedSubject', 'korean');
          }
        }
      }

      const fetchPassages = async () => {
      // 내가 체크포인트를 작성한 지문들 가져오기 (현재 과목에 맞는 것만)
      const { data: submissions } = await supabase
        .from("student_checkpoint_record")
        .select("passage_id, teacher_viewed, passages(id, title, category, source, subject)")
        .eq("user_id", user.id);

      if (submissions) {
        // 중복 제거 및 정렬 (현재 과목에 맞는 것만)
        const passageMap = new Map();
        const passageCheckpoints: Record<string, any[]> = {};
        
        submissions
          .filter((s: any) => s.passages && (s.passages.subject === currentSubject || (s.passages.subject === null && currentSubject === "korean")))
          .forEach((s: any) => {
            if (!passageMap.has(s.passage_id)) {
              passageMap.set(s.passage_id, s.passages);
            }
            // 각 지문별 체크포인트 수집
            if (!passageCheckpoints[s.passage_id]) {
              passageCheckpoints[s.passage_id] = [];
            }
            passageCheckpoints[s.passage_id].push(s);
          });
        
        const uniquePassages = Array.from(passageMap.values()).map((passage: any) => {
          // 해당 지문의 모든 체크포인트가 확인되었는지 확인
          const checkpoints = passageCheckpoints[passage.id] || [];
          const allViewed = checkpoints.length > 0 && 
                            checkpoints.every((cp: any) => cp.teacher_viewed === true);
          return {
            ...passage,
            allViewed
          };
        });
        
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

      fetchPassages();

      // 실시간 구독: student_checkpoint_record 테이블의 변경사항 감지
      const channel = supabase
        .channel('student_checkpoint_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE 모두 감지
            schema: 'public',
            table: 'student_checkpoint_record',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // 변경사항이 발생하면 데이터 다시 로드
            fetchPassages();
          }
        )
        .subscribe();

      // 과목 변경 이벤트 리스너
      const handleSubjectChanged = (event: CustomEvent) => {
        const newSubject = event.detail.subject as "korean" | "english";
        setSelectedSubject(newSubject);
        fetchPassages(); // 과목 변경 시 다시 로드
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('subjectChanged', handleSubjectChanged as EventListener);
      }

      // 페이지 포커스 시에도 데이터 다시 로드
      const handleFocus = () => {
        fetchPassages();
      };
      window.addEventListener('focus', handleFocus);

      // 클린업
      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('focus', handleFocus);
      };
    };

    loadData();
  }, [router]);

  if (loading) {
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
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img src="/pawn_black.svg" alt="Pawn" className="w-8 h-8 md:w-10 md:h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
            내 체크포인트
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
          </h1>
          </div>
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>작성한 체크포인트를 확인할 수 있는 지문 목록입니다.</p>
        </div>

        {myPassages.length === 0 ? (
          <div className="p-12 text-center rounded-xl shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="text-6xl mb-4"></div>
            <p className="text-lg mb-2" style={{ color: '#CCD5DA' }}>아직 작성한 체크포인트가 없습니다.</p>
            <Link
              href="/student"
              className="inline-block mt-4 px-6 py-3 font-semibold transition-all duration-200 rounded-xl"
              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
                className="group p-6 transition-all duration-200 rounded-xl shadow-sm"
                style={{ backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold transition-colors line-clamp-2" style={{ color: '#13181B' }}>
                        {passage.title || "(제목 없음)"}
                      </h3>
                      {passage.allViewed && (
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: '#13181B' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1.5 text-xs font-semibold rounded-full" style={{ 
                        backgroundColor: '#CCD5DA', 
                        color: '#13181B' 
                      }}>
                        {passage.category || "기타"}
                      </span>
                      {passage.source && (
                        <span className="px-3 py-1.5 text-xs font-medium rounded-full truncate max-w-[200px]" style={{ 
                          backgroundColor: '#CCD5DA', 
                          color: '#13181B' 
                        }}>{passage.source}</span>
                      )}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 transition-colors flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: '#13181B' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                <div className="text-sm mt-4 pt-4 flex items-center justify-between" style={{ color: '#13181B', borderTop: '1px solid #CCD5DA' }}>
                  <span>체크포인트 확인하기 →</span>
                  {passage.allViewed && (
                    <span className="text-xs px-2 py-1 rounded font-semibold flex items-center gap-1" style={{ 
                      backgroundColor: '#D4E4F4',
                      color: '#13181B'
                    }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      선생님 확인완료
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

