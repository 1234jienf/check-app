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
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

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

      // 공지사항 목록 가져오기 (현재 과목에 맞는 것만, 고정 공지 먼저, 그 다음 최신순)
      const { data: announcementsData, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("subject", currentSubject)
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
          <div className="text-center py-20 border-2 rounded-xl" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
            <p style={{ color: '#13181B', opacity: 0.7 }}>등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 공지 목록 */}
            <div className="lg:col-span-1 space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  onClick={() => setSelectedAnnouncement(announcement)}
                  className="border-2 rounded-xl p-4 cursor-pointer transition-all"
                  style={{
                    backgroundColor: selectedAnnouncement?.id === announcement.id ? '#CCD5DA' : '#F0EEEB',
                    borderColor: announcement.is_pinned ? '#FFBF65' : '#13181B'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAnnouncement?.id !== announcement.id) {
                      e.currentTarget.style.backgroundColor = '#CCD5DA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAnnouncement?.id !== announcement.id) {
                      e.currentTarget.style.backgroundColor = '#F0EEEB';
                    }
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {announcement.is_pinned && (
                      <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: '#FFBF65', color: '#13181B' }}>
                        고정
                      </span>
                    )}
                    <h3 className="font-bold text-sm" style={{ color: '#13181B' }}>
                      {announcement.title}
                    </h3>
                  </div>
                  <div className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                    {new Date(announcement.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>

            {/* 공지 상세 */}
            <div className="lg:col-span-2">
              {selectedAnnouncement ? (
                <div className="border-2 rounded-xl p-6" style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}>
                  <div className="flex items-center gap-3 mb-4">
                    {selectedAnnouncement.is_pinned && (
                      <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: '#FFBF65', color: '#13181B' }}>
                        고정
                      </span>
                    )}
                    <h2 className="text-2xl font-bold" style={{ color: '#13181B' }}>
                      {selectedAnnouncement.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-4 text-sm mb-6 pb-4 border-b-2" style={{ color: '#13181B', opacity: 0.7, borderBottomColor: '#CCD5DA' }}>
                    <span>{selectedAnnouncement.author_name}</span>
                    <span>{new Date(selectedAnnouncement.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {selectedAnnouncement.updated_at !== selectedAnnouncement.created_at && (
                      <span>(수정됨)</span>
                    )}
                  </div>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap" style={{ color: '#13181B', lineHeight: '1.8' }}>
                      {selectedAnnouncement.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-2 rounded-xl p-20 text-center" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
                  <p style={{ color: '#13181B', opacity: 0.7 }}>공지사항을 선택해주세요.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
