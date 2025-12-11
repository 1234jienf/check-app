"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
      <div className="flex items-center justify-center h-screen">
        <div>권한 확인 중...</div>
      </div>
    );
  }

  const menuItems = [
    { href: "/admin", label: "학생 관리", icon: "👥", description: "학생 승인 및 관리" },
    { href: "/admin/passages", label: "국어 지문", icon: "📚", description: "수능 국어 지문 관리" },
    { href: "/admin/passages/parse-pdf", label: "PDF 파싱", icon: "📄", description: "PDF에서 지문 추출" },
    { href: "/admin/settings", label: "설정", icon: "⚙️", description: "시스템 설정" },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    
    // 정확히 일치하는 경우
    if (pathname === href) return true;
    
    // 특수 케이스: /admin/passages는 정확히 일치하거나 하위 경로 중 parse-pdf가 아닐 때만 활성화
    if (href === "/admin/passages") {
      return pathname === "/admin/passages" || 
             (pathname.startsWith("/admin/passages/") && 
              pathname !== "/admin/passages/parse-pdf" &&
              !pathname.startsWith("/admin/passages/all") &&
              !pathname.startsWith("/admin/passages/new") &&
              !pathname.startsWith("/admin/passages/ebs") &&
              !pathname.startsWith("/admin/passages/gichul") &&
              !pathname.startsWith("/admin/passages/leet") &&
              !pathname.startsWith("/admin/passages/other"));
    }
    
    // parse-pdf는 정확히 일치할 때만
    if (href === "/admin/passages/parse-pdf") {
      return pathname === "/admin/passages/parse-pdf";
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold">백</span>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                백지훈 수능
              </h1>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
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
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold">백</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                백지훈 수능
              </h1>
              <p className="text-xs text-slate-400">국어 강의 관리</p>
            </div>
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
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  active
                    ? "bg-white/20"
                    : "bg-slate-700/50 group-hover:bg-slate-600/50"
                }`}>
                  <span className="text-xl">{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${active ? "text-white" : "text-slate-200"}`}>
                    {item.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${active ? "text-blue-100" : "text-slate-400"}`}>
                    {item.description}
                  </div>
                </div>
                {active && (
                  <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full"></div>
                )}
                {!active && (
                  <svg 
                    className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-700 space-y-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold">N</span>
            </div>
            <div>
              <div className="font-medium text-slate-300">수능 국어</div>
              <div className="text-slate-500">관리 시스템</div>
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
            className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 pt-16 lg:pt-0">{children}</main>
    </div>
  );
}
