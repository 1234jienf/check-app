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

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      
      const fetchPassages = async () => {
        // 내가 체크포인트를 작성한 지문들 가져오기
        const { data: submissions } = await supabase
          .from("student_checkpoint_record")
          .select("passage_id, passages(id, title, category, source)")
          .eq("user_id", user.id);

        if (submissions) {
          // 중복 제거 및 정렬
          const passageMap = new Map();
          submissions
            .filter((s: any) => s.passages)
            .forEach((s: any) => {
              if (!passageMap.has(s.passage_id)) {
                passageMap.set(s.passage_id, s.passages);
              }
            });
          
          const uniquePassages = Array.from(passageMap.values());
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #F0EEEB, #CCD5DA)' }}>
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
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#13181B' }}>
            내 체크포인트
          </h1>
          <p style={{ color: '#CCD5DA' }}>작성한 체크포인트를 확인할 수 있는 지문 목록입니다.</p>
        </div>

        {myPassages.length === 0 ? (
          <div className="p-12 text-center border-2" style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}>
            <div className="text-6xl mb-4">📝</div>
            <p className="text-lg mb-2" style={{ color: '#CCD5DA' }}>아직 작성한 체크포인트가 없습니다.</p>
            <Link
              href="/student"
              className="inline-block mt-4 px-6 py-3 font-semibold transition-all duration-200"
              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#003A6C'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#13181B'}
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
                className="group p-6 transition-all duration-200 border-2"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#CCD5DA';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F0EEEB';
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1 transition-colors line-clamp-2" style={{ color: '#13181B' }}>
                      {passage.title || "(제목 없음)"}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1.5 text-xs font-semibold rounded-full" style={{ 
                        backgroundColor: passage.category === "EBS" ? '#003A6C' : 
                                         passage.category === "기출" || passage.category === "평가원" ? '#FFBF65' :
                                         passage.category === "LEET" ? '#FD8973' : '#13181B', 
                        color: '#F0EEEB' 
                      }}>
                        {passage.category === "기출" || passage.category === "평가원" ? "평가원 기출" : passage.category || "기타"}
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
                <div className="text-sm mt-4 pt-4" style={{ color: '#13181B', borderTop: '1px solid #CCD5DA' }}>
                  체크포인트 확인하기 →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

