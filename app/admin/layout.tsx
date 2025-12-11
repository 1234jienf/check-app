"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNotificationBar from "@/components/AdminNotificationBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isTeacher, setIsTeacher] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: currentUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (currentUser?.role !== "teacher") {
        alert("관리자 권한이 필요합니다. 선생님 계정으로 로그인해주세요.");
        router.push("/categories");
        return;
      }

      setIsTeacher(true);
      setLoading(false);
    };

    checkRole();
  }, [router]);

  if (loading || !isTeacher) {
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
          <p style={{ color: '#13181B' }}>권한 확인 중...</p>
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
    { href: "/admin", label: "학생 관리", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "학생 승인 및 관리", color: '#13181B' },
    { href: "/admin/passages", label: "국어 지문", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "수능 국어 지문 관리" },
    { href: "/admin/my-checkpoints", label: "내 체크포인트", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "내가 작성한 체크포인트" },
    { href: "/admin/schedule", label: "스케줄 관리", icon: { black: "/pawn_black.svg", white: "/pawn_white.svg" }, description: "일정 관리 및 스케줄" },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    
    // 정확히 일치하는 경우
    if (pathname === href) return true;
    
    // 특수 케이스: /admin/passages는 정확히 일치하거나 하위 경로 중 특정 경로가 아닐 때만 활성화
    if (href === "/admin/passages") {
      return pathname === "/admin/passages" || 
             (pathname.startsWith("/admin/passages/") && 
              !pathname.startsWith("/admin/passages/all") &&
              !pathname.startsWith("/admin/passages/new") &&
              !pathname.startsWith("/admin/passages/ebs") &&
              !pathname.startsWith("/admin/passages/gichul") &&
              !pathname.startsWith("/admin/passages/leet") &&
              !pathname.startsWith("/admin/passages/other"));
    }
    
    // /admin/my-checkpoints는 정확히 일치할 때만
    if (href === "/admin/my-checkpoints") {
      return pathname === "/admin/my-checkpoints";
    }
    
    // /admin은 정확히 일치할 때만
    if (href === "/admin") {
      return pathname === "/admin";
    }
    
    // 나머지는 startsWith로 체크
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
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
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center gap-3 w-full cursor-pointer"
            >
              <div className="text-sm font-bold" style={{ color: '#F0EEEB' }}>CHECK</div>
              <img 
                src="/bishop-logo.png" 
                alt="Bishop" 
                className="h-20 w-auto"
              />
              <div className="text-sm font-bold" style={{ color: '#F0EEEB' }}>MATE</div>
            </button>
            <p className="text-xs text-center" style={{ color: '#F0EEEB', opacity: 0.9 }}>국어 강의 관리</p>
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
                  backgroundColor: item.color || '#13181B',
                  color: '#F0EEEB',
                  borderColor: item.color || '#13181B'
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
                  <div className="text-xs mt-0.5" style={{ color: active ? '#F0EEEB' : '#13181B', opacity: active ? 1 : 0.8 }}>
                    {item.description}
                  </div>
                </div>
                {active && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FFBF65' }}></div>
                )}
                {!active && (
                  <svg 
                    className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#13181B' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 space-y-4" style={{ borderTop: '2px solid #13181B' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#13181B', opacity: 0.8 }}>
            <div className="w-8 h-8 border-2 flex items-center justify-center" style={{ borderColor: '#13181B', backgroundColor: '#F0EEEB' }}>
              <span className="text-sm font-bold" style={{ color: '#13181B' }}>N</span>
            </div>
            <div>
              <div className="font-medium" style={{ color: '#13181B' }}>수능 국어</div>
              <div style={{ color: '#13181B', opacity: 0.8 }}>관리 시스템</div>
            </div>
          </div>
          
          <button
            onClick={async () => {
              // 모든 쿠키 삭제
              if (typeof document !== "undefined") {
                document.cookie.split(";").forEach((c) => {
                  const eqPos = c.indexOf("=");
                  const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                });
              }
              
              // localStorage, sessionStorage 클리어
              if (typeof window !== "undefined") {
                localStorage.clear();
                sessionStorage.clear();
              }
              
              // Supabase 로그아웃
              await supabase.auth.signOut();
              
              // 로그인 페이지로 이동
              router.push("/login");
            }}
            className="w-full px-4 py-3 border-2 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#13181B', color: '#F0EEEB', borderColor: '#13181B' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#13181B'}
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
      <main className="flex-1 pt-16 lg:pt-0 lg:ml-72 relative" style={{ backgroundColor: '#F0EEEB' }}>
        <AdminNotificationBar />
        {children}
      </main>
    </div>
  );
}
