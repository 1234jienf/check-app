"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null); // 학생 이름
  const [teacherName, setTeacherName] = useState<string | null>(null); // 선생님 이름
  const [myPassages, setMyPassages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<"korean" | "english">("korean");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      
      // 사용자 이름 및 과목 가져오기
      const { data: userData } = await supabase
        .from("users")
        .select("name, email, subjects")
        .eq("id", user.id)
        .single();
      
      // 선생님 이름 가져오기 (role이 teacher인 사용자)
      const { data: teacherData } = await supabase
        .from("users")
        .select("name")
        .eq("role", "teacher")
        .limit(1)
        .maybeSingle();
      
      if (userData) {
        // 학생 이름 저장
        setUserName(userData.name || userData.email || "학생");
        // 선생님 이름 저장 (Teacher인 경우 백지훈으로 변경)
        const teacherNameFromDB = teacherData?.name;
        setTeacherName(teacherNameFromDB && teacherNameFromDB !== "Teacher" ? teacherNameFromDB : "백지훈");
        
        // 세션에서 선택한 과목 불러오기, 없으면 사용자의 첫 번째 과목
        if (typeof window !== 'undefined') {
          const savedSubject = sessionStorage.getItem('selectedSubject') as "korean" | "english" | null;
          if (savedSubject) {
            setSelectedSubject(savedSubject);
          } else if (userData.subjects && Array.isArray(userData.subjects) && userData.subjects.length > 0) {
            const firstSubject = userData.subjects[0] as "korean" | "english";
            setSelectedSubject(firstSubject);
            sessionStorage.setItem('selectedSubject', firstSubject);
          }
        }
      }
      
      // 내가 체크포인트를 작성한 지문들 가져오기
      const { data: submissions } = await supabase
        .from("student_checkpoint_record")
        .select("passage_id, passages(id, title, category)")
        .eq("user_id", user.id);

      if (submissions) {
        const uniquePassages = Array.from(
          new Map(
            submissions
              .filter((s: any) => s.passages)
              .map((s: any) => [s.passage_id, s.passages])
          ).values()
        );
        setMyPassages(uniquePassages);
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // 과목 변경 이벤트 리스너
  useEffect(() => {
    if (typeof window !== 'undefined') {
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

  const menuItems = [
    { href: selectedSubject === "english" ? "/student/english" : "/student/korean", label: "자료 선택", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "지문 카테고리 선택" },
    ...(selectedSubject === "english" ? [{ href: "/student/materials", label: "자료실", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "영어 단어장/문장" }] : []),
    { href: "/student/my-checkpoints", label: "내 체크포인트", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "작성한 체크포인트 확인" },
    { href: "/student/daily-homework", label: "일별 숙제 체크", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "일별 학습 계획 및 체크" },
    { href: "/student/questions", label: "질문 게시판", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "문제 질문 및 답변" },
    { href: "/student/announcements", label: "공지사항", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "공지사항 확인" },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    
    // 정확히 일치하는 경우
    if (pathname === href) return true;
    
    // /student/korean 또는 /student/english는 정확히 일치하거나 /student/passages 하위 경로일 때만 활성화
    if (href === "/student/korean" || href === "/student/english") {
      return pathname === href || pathname.startsWith("/student/passages") || pathname === "/student";
    }
    
    // /student/my-checkpoints는 정확히 일치할 때만
    if (href === "/student/my-checkpoints") {
      return pathname === "/student/my-checkpoints";
    }
    
    // /student/daily-homework는 정확히 일치할 때만
    if (href === "/student/daily-homework") {
      return pathname === "/student/daily-homework";
    }
    
    // /student/announcements는 정확히 일치하거나 하위 경로일 때만
    if (href === "/student/announcements") {
      return pathname.startsWith("/student/announcements");
    }
    
    // /student/questions는 정확히 일치하거나 하위 경로일 때만
    if (href === "/student/questions") {
      return pathname.startsWith("/student/questions");
    }
    
    // /student/materials는 정확히 일치하거나 하위 경로일 때만
    if (href === "/student/materials") {
      return pathname === "/student/materials" || pathname.startsWith("/student/materials/");
    }
    
    // 나머지는 startsWith로 체크
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    if (typeof document !== "undefined") {
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    }
    
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: selectedSubject === 'english' ? '#FFFFFF' : '#F0EEEB' }}>
      {/* 모바일 헤더 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 shadow-sm" style={{ backgroundColor: '#F0EEEB', color: '#13181B' }}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <img 
              src="/checkmate-white.png" 
              alt="BAEK MATE" 
              className="h-10 w-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><span class="text-xl font-bold">백</span></div>';
                }
              }}
            />
            <div className="flex flex-row items-center gap-1">
              <div className="text-xs font-bold" style={{ color: '#13181B' }}>BAEK MATE</div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg shadow-sm transition-all"
            style={{ backgroundColor: '#F0EEEB' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 24, 27, 0.15)';
              e.currentTarget.style.backgroundColor = '#CCD5DA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
              e.currentTarget.style.backgroundColor = '#F0EEEB';
            }}
            aria-label="메뉴 열기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 오버레이 */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[55]"
          style={{ backgroundColor: 'rgba(19, 24, 27, 0.5)' }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside className={`fixed inset-y-0 left-0 z-[60] w-72 flex flex-col transform transition-transform duration-300 ease-in-out shadow-lg ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`} style={{ backgroundColor: '#F0EEEB', boxShadow: '2px 0 12px rgba(19, 24, 27, 0.1)' }}>
        <div className="rounded-b-xl shadow-sm" style={{ backgroundColor: selectedSubject === "korean" ? '#13181B' : '#FFFFFF' }}>
          <div className="flex flex-col items-center gap-2 p-6">
            <div className="flex items-center justify-center gap-3 w-full">
              <div className="text-sm font-bold" style={{ color: selectedSubject === "korean" ? '#F0EEEB' : '#13181B' }}>CHECK</div>
              <img 
                src={selectedSubject === "english" ? "/bishop-logo-black.png" : "/bishop-logo.png"}
                alt="Bishop" 
                className="h-20 w-auto"
              />
              <div className="text-sm font-bold" style={{ color: selectedSubject === "korean" ? '#F0EEEB' : '#13181B' }}>MATE</div>
            </div>
            <p className="text-xs text-center" style={{ color: selectedSubject === "korean" ? '#CCD5DA' : '#13181B' }}>
              {teacherName || "백지훈"} {selectedSubject === "korean" ? "국어" : "영어"}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-all duration-200 min-h-[72px] ${
                  active
                    ? ""
                    : "hover:shadow-md"
                }`}
                style={active ? {
                  backgroundColor: '#13181B',
                  color: '#F0EEEB',
                  boxShadow: '0 2px 8px rgba(19, 24, 27, 0.2)'
                } : {
                  backgroundColor: '#F0EEEB',
                  color: '#13181B',
                  boxShadow: '0 1px 3px rgba(19, 24, 27, 0.1)'
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                  }
                }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-all shadow-sm"
                     style={active ? {
                       backgroundColor: '#F0EEEB',
                       boxShadow: '0 1px 3px rgba(240, 238, 235, 0.3)'
                     } : {
                       backgroundColor: '#F0EEEB',
                       boxShadow: '0 1px 2px rgba(19, 24, 27, 0.1)'
                     }}>
                  {'black' in item.icon && 'white' in item.icon ? (
                    <img 
                      src={active ? (item.icon as { black: string; white: string }).white : (item.icon as { black: string; white: string }).black} 
                      alt={item.label}
                      className="w-6 h-6"
                    />
                  ) : (
                    <span className="text-xl">{String(item.icon)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: active ? '#F0EEEB' : '#13181B' }}>
                    {item.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: active ? '#F0EEEB' : '#13181B', opacity: active ? 0.9 : 0.7 }}>
                    {item.description}
                  </div>
                </div>
                {active && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#13181B' }}></div>
                )}
              </Link>
            );
          })}

        </nav>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs" style={{ color: '#CCD5DA' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
              <span className="text-sm font-bold" style={{ color: '#13181B' }}>
                {userName ? userName.charAt(0) : "학"}
              </span>
            </div>
            <div>
              <div className="font-medium" style={{ color: '#13181B' }}>
                {userName || "학생 모드"}
              </div>
              <div style={{ color: '#CCD5DA' }}>
                {selectedSubject === "korean" ? "수능 국어 학습" : "수능 영어 학습"}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
            style={{ backgroundColor: '#13181B', color: '#F0EEEB', boxShadow: '0 2px 6px rgba(19, 24, 27, 0.2)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
              e.currentTarget.style.backgroundColor = '#13181B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 24, 27, 0.2)';
              e.currentTarget.style.backgroundColor = '#13181B';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 pt-16 lg:pt-0 lg:ml-72" style={{ backgroundColor: '#F0EEEB' }}>{children}</main>
    </div>
  );
}

