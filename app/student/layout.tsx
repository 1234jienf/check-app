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
  const [userName, setUserName] = useState<string | null>(null);
  const [myPassages, setMyPassages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      
      // 사용자 이름 가져오기
      const { data: userData } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", user.id)
        .single();
      
      if (userData) {
        setUserName(userData.name || userData.email || "학생");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'linear-gradient(to bottom right, #F0EEEB, #CCD5DA)' }}>
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
    { href: "/student", label: "자료 선택", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "지문 카테고리 선택" },
    { href: "/student/my-checkpoints", label: "내 체크포인트", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "작성한 체크포인트 확인" },
    { href: "/student/announcements", label: "공지사항", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "공지사항 확인" },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    
    // 정확히 일치하는 경우
    if (pathname === href) return true;
    
    // /student는 정확히 일치하거나 /student/passages 하위 경로일 때만 활성화
    if (href === "/student") {
      return pathname === "/student" || pathname.startsWith("/student/passages");
    }
    
    // /student/my-checkpoints는 정확히 일치할 때만
    if (href === "/student/my-checkpoints") {
      return pathname === "/student/my-checkpoints";
    }
    
    // /student/announcements는 정확히 일치하거나 하위 경로일 때만
    if (href === "/student/announcements") {
      return pathname.startsWith("/student/announcements");
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
    <div className="flex min-h-screen" style={{ backgroundColor: '#F0EEEB' }}>
      {/* 모바일 헤더 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 shadow-lg" style={{ backgroundColor: '#F0EEEB', borderBottom: '2px solid #13181B', color: '#13181B' }}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <img 
              src="/checkmate-white.png" 
              alt="CHECK MATE" 
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
            <div className="flex flex-col items-center gap-1">
              <div className="text-xs font-bold" style={{ color: '#13181B' }}>CHECK</div>
              <div className="text-xs font-bold" style={{ color: '#13181B' }}>MATE</div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 border-2 transition-colors"
            style={{ borderColor: '#13181B' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CCD5DA'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
      <aside className={`fixed inset-y-0 left-0 z-[60] w-72 flex flex-col transform transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`} style={{ backgroundColor: '#F0EEEB', borderRight: '2px solid #13181B' }}>
        <div style={{ backgroundColor: '#13181B', borderBottom: '2px solid #13181B' }}>
          <div className="flex flex-col items-center gap-2 p-6">
            <div className="flex items-center justify-center gap-3 w-full">
              <div className="text-sm font-bold" style={{ color: '#F0EEEB' }}>CHECK</div>
              <img 
                src="/bishop-logo.png" 
                alt="Bishop" 
                className="h-20 w-auto"
              />
              <div className="text-sm font-bold" style={{ color: '#F0EEEB' }}>MATE</div>
            </div>
            <p className="text-xs text-center" style={{ color: '#CCD5DA' }}>국어 강의 학습</p>
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
                className={`group relative flex items-center gap-3 px-4 py-3 border-2 transition-all duration-200 min-h-[72px] ${
                  active
                    ? ""
                    : "hover:opacity-90"
                }`}
                style={active ? {
                  backgroundColor: '#13181B',
                  color: '#F0EEEB',
                  borderColor: '#13181B'
                } : {
                  backgroundColor: '#F0EEEB',
                  color: '#13181B',
                  borderColor: '#13181B'
                }}
              >
                <div className="w-10 h-10 border-2 flex items-center justify-center transition-all"
                     style={active ? {
                       backgroundColor: '#F0EEEB',
                       borderColor: '#F0EEEB'
                     } : {
                       backgroundColor: '#F0EEEB',
                       borderColor: '#13181B'
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
                  <div className="text-xs mt-0.5" style={{ color: active ? '#F0EEEB' : '#CCD5DA' }}>
                    {item.description}
                  </div>
                </div>
                {active && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FFBF65' }}></div>
                )}
              </Link>
            );
          })}

        </nav>

        <div className="p-6 space-y-4" style={{ borderTop: '2px solid #13181B' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#CCD5DA' }}>
            <div className="w-8 h-8 border-2 flex items-center justify-center" style={{ borderColor: '#13181B', backgroundColor: '#F0EEEB' }}>
              <span className="text-sm font-bold" style={{ color: '#13181B' }}>
                {userName ? userName.charAt(0) : "학"}
              </span>
            </div>
            <div>
              <div className="font-medium" style={{ color: '#13181B' }}>
                {userName || "학생 모드"}
              </div>
              <div style={{ color: '#CCD5DA' }}>수능 국어 학습</div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 border-2 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#13181B', color: '#F0EEEB', borderColor: '#13181B' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#003A6C'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#13181B'}
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

