"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  author_name?: string;
}

export default function StudentAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // 현재 선택한 과목 가져오기
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

      // 공지사항 목록 가져오기 (현재 과목에 맞는 것만, 고정 공지 먼저, 그 다음 최신순)
      let query = supabase
        .from("announcements")
        .select("*");

      // subject 컬럼이 있는지 확인하고 필터링
      try {
        const { data: testData, error: testError } = await supabase
          .from("announcements")
          .select("subject")
          .limit(1)
          .maybeSingle();

        if (!testError && testData && testData.subject !== undefined) {
          // subject 컬럼이 있는 경우 필터링
          if (currentSubject === "korean") {
            query = query.or("subject.eq.korean,subject.is.null");
          } else {
            query = query.eq("subject", "english");
          }
        }
      } catch (testErr: any) {
        // subject 컬럼이 없으면 모든 공지사항 표시
      }

      const { data: announcementsData, error } = await query
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
      } else if (announcementsData) {
        // 작성자 이름 가져오기
        const authorIds = [...new Set(announcementsData.map((a: any) => a.author_id))];
        const { data: usersData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", authorIds);

        const usersMap = new Map(
          (usersData || []).map((u: any) => [u.id, u.name])
        );

        setAnnouncements(announcementsData.map((a: any) => ({
          ...a,
          author_name: usersMap.get(a.author_id) || "선생님"
        })));
      }

      setLoading(false);
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F0EEEB' }}>
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
          <p style={{ color: '#13181B' }}>로딩 중...</p>
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
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <img src="/pawn_black.svg" alt="Pawn" className="w-8 h-8 md:w-10 md:h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
              공지사항
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
            </h1>
          </div>
        </div>

        {announcements.length === 0 ? (
          <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
            <p style={{ color: '#13181B', opacity: 0.7 }}>등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="rounded-xl p-6 transition-all shadow-sm cursor-pointer"
                style={{
                  backgroundColor: announcement.is_pinned ? '#CCD5DA' : '#FFFFFF'
                }}
                onClick={() => router.push(`/student/announcements/${announcement.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {announcement.is_pinned && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      )}
                      <h2 className="text-xl font-bold" style={{ color: '#13181B' }}>
                        {announcement.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm" style={{ color: '#13181B', opacity: 0.7 }}>
                      <span>{announcement.author_name}</span>
                      <span>{new Date(announcement.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {announcement.updated_at !== announcement.created_at && (
                        <span>(수정됨)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
